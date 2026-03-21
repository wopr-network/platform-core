/**
 * Crypto Key Server — shared address derivation + charge management.
 *
 * Deploys on the chain server (pay.wopr.bot) alongside bitcoind.
 * Products don't run watchers or hold xpubs. They request addresses
 * and receive webhooks.
 *
 * ~200 lines of new code wrapping platform-core's existing crypto modules.
 */
import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { DrizzleDb } from "../../db/index.js";
import { derivedAddresses, pathAllocations, paymentMethods } from "../../db/schema/crypto.js";
import { deriveAddress, deriveP2pkhAddress } from "./btc/address-gen.js";
import type { ICryptoChargeRepository } from "./charge-store.js";
import { deriveDepositAddress } from "./evm/address-gen.js";
import { centsToNative } from "./oracle/convert.js";
import type { IPriceOracle } from "./oracle/types.js";
import type { IPaymentMethodStore } from "./payment-method-store.js";

export interface KeyServerDeps {
  db: DrizzleDb;
  chargeStore: ICryptoChargeRepository;
  methodStore: IPaymentMethodStore;
  oracle: IPriceOracle;
  /** Bearer token for product API routes. If unset, auth is disabled. */
  serviceKey?: string;
  /** Bearer token for admin routes. If unset, admin routes are disabled. */
  adminToken?: string;
}

/**
 * Derive the next unused address for a chain.
 * Atomically increments next_index and records address in a single transaction.
 */
async function deriveNextAddress(
  db: DrizzleDb,
  chainId: string,
  tenantId?: string,
): Promise<{ address: string; index: number; chain: string; token: string }> {
  // Wrap in transaction: if the address insert fails, next_index is not consumed.
  return (db as unknown as { transaction: (fn: (tx: DrizzleDb) => Promise<unknown>) => Promise<unknown> }).transaction(
    async (tx: DrizzleDb) => {
      // Atomic increment: UPDATE ... SET next_index = next_index + 1 RETURNING *
      const [method] = await tx
        .update(paymentMethods)
        .set({ nextIndex: sql`${paymentMethods.nextIndex} + 1` })
        .where(eq(paymentMethods.id, chainId))
        .returning();

      if (!method) throw new Error(`Chain not found: ${chainId}`);
      if (!method.xpub) throw new Error(`No xpub configured for chain: ${chainId}`);

      // The index we use is the value BEFORE increment (returned value - 1)
      const index = method.nextIndex - 1;

      // Route to the right derivation function
      let address: string;
      if (method.type === "native" && method.chain === "dogecoin") {
        address = deriveP2pkhAddress(method.xpub, index, "dogecoin");
      } else if (method.type === "native" && (method.chain === "bitcoin" || method.chain === "litecoin")) {
        address = deriveAddress(method.xpub, index, "mainnet", method.chain as "bitcoin" | "litecoin");
      } else {
        // EVM (all ERC20 + native ETH) — same derivation
        address = deriveDepositAddress(method.xpub, index);
      }

      // Record in immutable log (inside same transaction)
      await tx.insert(derivedAddresses).values({
        chainId,
        derivationIndex: index,
        address: address.toLowerCase(),
        tenantId,
      });

      return { address, index, chain: method.chain, token: method.token };
    },
  ) as Promise<{ address: string; index: number; chain: string; token: string }>;
}

/** Validate Bearer token from Authorization header. */
function requireAuth(header: string | undefined, expected: string): boolean {
  if (!expected) return true; // auth disabled
  return header === `Bearer ${expected}`;
}

/**
 * Create the Hono app for the crypto key server.
 * Mount this on the chain server at the root.
 */
export function createKeyServerApp(deps: KeyServerDeps): Hono {
  const app = new Hono();

  // --- Auth middleware for product routes ---
  app.use("/address", async (c, next) => {
    if (deps.serviceKey && !requireAuth(c.req.header("Authorization"), deps.serviceKey)) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    await next();
  });
  app.use("/charges/*", async (c, next) => {
    if (deps.serviceKey && !requireAuth(c.req.header("Authorization"), deps.serviceKey)) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    await next();
  });
  app.use("/charges", async (c, next) => {
    if (deps.serviceKey && !requireAuth(c.req.header("Authorization"), deps.serviceKey)) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    await next();
  });

  // --- Auth middleware for admin routes ---
  app.use("/admin/*", async (c, next) => {
    if (!deps.adminToken) return c.json({ error: "Admin API disabled" }, 403);
    if (!requireAuth(c.req.header("Authorization"), deps.adminToken)) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    await next();
  });

  // --- Product API ---

  /** POST /address — derive next unused address */
  app.post("/address", async (c) => {
    const body = await c.req.json<{ chain: string }>();
    if (!body.chain) return c.json({ error: "chain is required" }, 400);

    const tenantId = c.req.header("X-Tenant-Id");
    const result = await deriveNextAddress(deps.db, body.chain, tenantId ?? undefined);
    return c.json(result, 201);
  });

  /** POST /charges — create charge + derive address + start watching */
  app.post("/charges", async (c) => {
    const body = await c.req.json<{
      chain: string;
      amountUsd: number;
      callbackUrl?: string;
      metadata?: Record<string, unknown>;
    }>();

    if (!body.chain || typeof body.amountUsd !== "number" || !Number.isFinite(body.amountUsd) || body.amountUsd <= 0) {
      return c.json({ error: "chain is required and amountUsd must be a positive finite number" }, 400);
    }

    const tenantId = c.req.header("X-Tenant-Id") ?? "unknown";
    const { address, index, chain, token } = await deriveNextAddress(deps.db, body.chain, tenantId);

    // Look up payment method for decimals + oracle config
    const method = await deps.methodStore.getById(body.chain);
    if (!method) return c.json({ error: `Unknown chain: ${body.chain}` }, 400);

    const amountUsdCents = Math.round(body.amountUsd * 100);

    // Compute expected crypto amount in native base units.
    // Price is locked NOW — this is what the user must send.
    let expectedAmount: bigint;
    try {
      // Try oracle pricing first (Chainlink for BTC/ETH, CoinGecko for DOGE/LTC).
      // oracle_address is passed as a hint for Chainlink — null is fine, CompositeOracle
      // will fall through to CoinGecko or built-in feed maps.
      const feedAddress = method.oracleAddress ? (method.oracleAddress as `0x${string}`) : undefined;
      const { priceMicros } = await deps.oracle.getPrice(token, feedAddress);
      expectedAmount = centsToNative(amountUsdCents, priceMicros, method.decimals);
    } catch {
      // Oracle has no pricing for this token — treat as stablecoin (1:1 USD).
      // e.g. $50 USDC = 50_000_000 base units (6 decimals)
      expectedAmount = (BigInt(amountUsdCents) * 10n ** BigInt(method.decimals)) / 100n;
    }

    const referenceId = `${token.toLowerCase()}:${address.toLowerCase()}`;

    await deps.chargeStore.createStablecoinCharge({
      referenceId,
      tenantId,
      amountUsdCents,
      chain,
      token,
      depositAddress: address,
      derivationIndex: index,
      callbackUrl: body.callbackUrl,
      expectedAmount: expectedAmount.toString(),
    });

    // Format display amount for the client
    const divisor = 10 ** method.decimals;
    const displayAmount = `${(Number(expectedAmount) / divisor).toFixed(Math.min(method.decimals, 8))} ${token}`;

    return c.json(
      {
        chargeId: referenceId,
        address,
        chain,
        token,
        amountUsd: body.amountUsd,
        expectedAmount: expectedAmount.toString(),
        displayAmount,
        derivationIndex: index,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
      },
      201,
    );
  });

  /** GET /charges/:id — check charge status */
  app.get("/charges/:id", async (c) => {
    const charge = await deps.chargeStore.getByReferenceId(c.req.param("id"));
    if (!charge) return c.json({ error: "Charge not found" }, 404);

    return c.json({
      chargeId: charge.referenceId,
      status: charge.status,
      address: charge.depositAddress,
      chain: charge.chain,
      token: charge.token,
      amountUsdCents: charge.amountUsdCents,
      creditedAt: charge.creditedAt,
    });
  });

  /** GET /chains — list enabled payment methods (for checkout UI) */
  app.get("/chains", async (c) => {
    const methods = await deps.methodStore.listEnabled();
    return c.json(
      methods.map((m) => ({
        id: m.id,
        token: m.token,
        chain: m.chain,
        decimals: m.decimals,
        displayName: m.displayName,
        contractAddress: m.contractAddress,
        confirmations: m.confirmations,
      })),
    );
  });

  // --- Admin API ---

  /** GET /admin/next-path — which derivation path to use for a coin type */
  app.get("/admin/next-path", async (c) => {
    const coinType = Number(c.req.query("coin_type"));
    if (!Number.isInteger(coinType)) return c.json({ error: "coin_type must be an integer" }, 400);

    // Find all allocations for this coin type
    const existing = await deps.db.select().from(pathAllocations).where(eq(pathAllocations.coinType, coinType));

    if (existing.length === 0) {
      return c.json({
        coin_type: coinType,
        account_index: 0,
        path: `m/44'/${coinType}'/0'`,
        status: "available",
      });
    }

    // If already allocated, return info about existing allocation
    const latest = existing.sort(
      (a: { accountIndex: number }, b: { accountIndex: number }) => b.accountIndex - a.accountIndex,
    )[0];

    // Find chains using this coin type's allocations
    const chainIds = existing.map((a: { chainId: string | null }) => a.chainId).filter(Boolean);
    return c.json({
      coin_type: coinType,
      account_index: latest.accountIndex,
      path: `m/44'/${coinType}'/${latest.accountIndex}'`,
      status: "allocated",
      allocated_to: chainIds,
      note: "xpub already registered — reuse for new chains with same key type",
      next_available: {
        account_index: latest.accountIndex + 1,
        path: `m/44'/${coinType}'/${latest.accountIndex + 1}'`,
      },
    });
  });

  /** POST /admin/chains — register a new chain with its xpub */
  app.post("/admin/chains", async (c) => {
    const body = await c.req.json<{
      id: string;
      coin_type: number;
      account_index: number;
      network: string;
      type: string;
      token: string;
      chain: string;
      contract?: string;
      decimals: number;
      xpub: string;
      rpc_url: string;
      confirmations?: number;
      display_name?: string;
      oracle_address?: string;
    }>();

    if (!body.id || !body.xpub || !body.token) {
      return c.json({ error: "id, xpub, and token are required" }, 400);
    }

    // Record the path allocation (idempotent — ignore if already exists)
    const inserted = (await deps.db
      .insert(pathAllocations)
      .values({
        coinType: body.coin_type,
        accountIndex: body.account_index,
        chainId: body.id,
        xpub: body.xpub,
      })
      .onConflictDoNothing()) as { rowCount: number };

    if (inserted.rowCount === 0) {
      return c.json(
        { error: "Path allocation already exists", path: `m/44'/${body.coin_type}'/${body.account_index}'` },
        409,
      );
    }

    // Upsert the payment method
    await deps.methodStore.upsert({
      id: body.id,
      type: body.type ?? "native",
      token: body.token,
      chain: body.chain ?? body.network,
      contractAddress: body.contract ?? null,
      decimals: body.decimals,
      displayName: body.display_name ?? `${body.token} on ${body.network}`,
      enabled: true,
      displayOrder: 0,
      rpcUrl: body.rpc_url,
      oracleAddress: body.oracle_address ?? null,
      xpub: body.xpub,
      confirmations: body.confirmations ?? 6,
    });

    return c.json({ id: body.id, path: `m/44'/${body.coin_type}'/${body.account_index}'` }, 201);
  });

  /** DELETE /admin/chains/:id — soft disable */
  app.delete("/admin/chains/:id", async (c) => {
    await deps.methodStore.setEnabled(c.req.param("id"), false);
    return c.body(null, 204);
  });

  return app;
}
