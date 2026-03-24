/**
 * Standalone entry point for the crypto key server.
 *
 * Deploys on the chain server (pay.wopr.bot:3100).
 * Boots: postgres → migrations → key server routes → watchers → serve.
 *
 * Usage: node dist/billing/crypto/key-server-entry.js
 */
/* biome-ignore-all lint/suspicious/noConsole: standalone entry point */
import { serve } from "@hono/node-server";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import * as schema from "../../db/schema/index.js";
import { DrizzleCryptoChargeRepository } from "./charge-store.js";
import { DrizzleWatcherCursorStore } from "./cursor-store.js";
import { createRpcCaller } from "./evm/watcher.js";
import { createKeyServerApp } from "./key-server.js";
import { ChainlinkOracle } from "./oracle/chainlink.js";
import { CoinGeckoOracle } from "./oracle/coingecko.js";
import { CompositeOracle } from "./oracle/composite.js";
import { FixedPriceOracle } from "./oracle/fixed.js";
import { DrizzlePaymentMethodStore } from "./payment-method-store.js";
import { startWatchers } from "./watcher-service.js";

const PORT = Number(process.env.PORT ?? "3100");
const DATABASE_URL = process.env.DATABASE_URL;
const SERVICE_KEY = process.env.SERVICE_KEY;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const BITCOIND_USER = process.env.BITCOIND_USER ?? "btcpay";
const BITCOIND_PASSWORD = process.env.BITCOIND_PASSWORD ?? "";
const BASE_RPC_URL = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";

if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

async function main(): Promise<void> {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });

  // Run migrations FIRST, before creating schema-typed db
  console.log("[crypto-key-server] Running migrations...");
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle/migrations" });

  // Now create the schema-typed db (columns guaranteed to exist)
  console.log("[crypto-key-server] Connecting...");
  const db = drizzle(pool, { schema }) as unknown as import("../../db/index.js").DrizzleDb;

  const chargeStore = new DrizzleCryptoChargeRepository(db);
  const methodStore = new DrizzlePaymentMethodStore(db);

  // Composite oracle: Chainlink on-chain (BTC, ETH on Base) + CoinGecko fallback (DOGE, LTC, etc.)
  // Every volatile asset needs reliable USD pricing — the ledger credits nanodollars.
  const chainlink = BASE_RPC_URL
    ? new ChainlinkOracle({ rpcCall: createRpcCaller(BASE_RPC_URL) })
    : new FixedPriceOracle();
  // Build token→CoinGecko ID map from DB (zero-deploy chain additions)
  const allMethods = await methodStore.listAll();
  const dbTokenIds: Record<string, string> = {};
  for (const m of allMethods) {
    if (m.oracleAssetId) dbTokenIds[m.token] = m.oracleAssetId;
  }
  const coingecko = new CoinGeckoOracle({ tokenIds: dbTokenIds });
  const oracle = new CompositeOracle(chainlink, coingecko);

  const app = createKeyServerApp({
    db,
    chargeStore,
    methodStore,
    oracle,
    serviceKey: SERVICE_KEY,
    adminToken: ADMIN_TOKEN,
  });

  // Boot watchers (BTC + EVM) — polls for payments, sends webhooks
  const cursorStore = new DrizzleWatcherCursorStore(db);
  const stopWatchers = await startWatchers({
    db,
    chargeStore,
    methodStore,
    cursorStore,
    oracle,
    bitcoindUser: BITCOIND_USER,
    bitcoindPassword: BITCOIND_PASSWORD,
    serviceKey: SERVICE_KEY,
    log: (msg, meta) => console.log(`[watcher] ${msg}`, meta ?? ""),
  });

  const server = serve({ fetch: app.fetch, port: PORT });
  console.log(`[crypto-key-server] Listening on :${PORT}`);

  // Graceful shutdown — stop accepting requests, drain watchers, close pool
  const shutdown = async () => {
    console.log("[crypto-key-server] Shutting down...");
    stopWatchers();
    server.close();
    await pool.end();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("[crypto-key-server] Fatal:", err);
  process.exit(1);
});
