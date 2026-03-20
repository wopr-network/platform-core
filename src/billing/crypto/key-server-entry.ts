/**
 * Standalone entry point for the crypto key server.
 *
 * Deploys on the chain server (pay.wopr.bot:3100).
 * Boots: postgres → migrations → key server routes → watchers → serve.
 *
 * Usage: node dist/billing/crypto/key-server-entry.js
 *
 * biome-ignore: this is an entry point, not a library — console is appropriate.
 */
/* biome-ignore-all lint/suspicious/noConsole: standalone entry point */
import { serve } from "@hono/node-server";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import * as schema from "../../db/schema/index.js";
import { DrizzleCryptoChargeRepository } from "./charge-store.js";
import { createKeyServerApp } from "./key-server.js";
import { DrizzlePaymentMethodStore } from "./payment-method-store.js";

const PORT = Number(process.env.PORT ?? "3100");
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

async function main(): Promise<void> {
  console.log("[crypto-key-server] Connecting to database...");
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema }) as unknown as import("../../db/index.js").DrizzleDb;

  console.log("[crypto-key-server] Running migrations...");
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle/migrations" });

  const chargeStore = new DrizzleCryptoChargeRepository(db);
  const methodStore = new DrizzlePaymentMethodStore(db);

  const app = createKeyServerApp({ db, chargeStore, methodStore });

  console.log(`[crypto-key-server] Listening on :${PORT}`);
  serve({ fetch: app.fetch, port: PORT });
}

main().catch((err) => {
  console.error("[crypto-key-server] Fatal:", err);
  process.exit(1);
});
