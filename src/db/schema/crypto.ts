import { sql } from "drizzle-orm";
import { boolean, index, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

/**
 * Crypto payment charges — tracks the lifecycle of each BTCPay invoice.
 * reference_id is the BTCPay invoice ID.
 *
 * amountUsdCents stores the requested amount in USD cents (integer).
 * This is NOT nanodollars — Credit.fromCents() handles the conversion
 * when crediting the ledger in the webhook handler.
 */
export const cryptoCharges = pgTable(
  "crypto_charges",
  {
    referenceId: text("reference_id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    amountUsdCents: integer("amount_usd_cents").notNull(),
    status: text("status").notNull().default("New"),
    currency: text("currency"),
    filledAmount: text("filled_amount"),
    createdAt: text("created_at").notNull().default(sql`(now())`),
    updatedAt: text("updated_at").notNull().default(sql`(now())`),
    creditedAt: text("credited_at"),
    chain: text("chain"),
    token: text("token"),
    depositAddress: text("deposit_address"),
    derivationIndex: integer("derivation_index"),
  },
  (table) => [
    index("idx_crypto_charges_tenant").on(table.tenantId),
    index("idx_crypto_charges_status").on(table.status),
    index("idx_crypto_charges_created").on(table.createdAt),
    index("idx_crypto_charges_deposit_address").on(table.depositAddress),
    // Unique indexes use WHERE IS NOT NULL partial indexes (declared in migration SQL).
    // Enforced via migration: CREATE UNIQUE INDEX.
  ],
);

/**
 * Watcher cursor persistence — tracks the last processed block per watcher.
 * Eliminates in-memory processedTxids and enables clean restart recovery.
 */
export const watcherCursors = pgTable("watcher_cursors", {
  watcherId: text("watcher_id").primaryKey(),
  cursorBlock: integer("cursor_block").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`(now())`),
});

/**
 * Payment method registry — runtime-configurable tokens/chains.
 * Admin inserts a row to enable a new payment method. No deploy needed.
 * Contract addresses are immutable on-chain but configurable here.
 */
export const paymentMethods = pgTable("payment_methods", {
  id: text("id").primaryKey(), // "USDC:base", "ETH:base", "BTC:mainnet"
  type: text("type").notNull(), // "stablecoin", "eth", "btc"
  token: text("token").notNull(), // "USDC", "ETH", "BTC"
  chain: text("chain").notNull(), // "base", "ethereum", "bitcoin"
  contractAddress: text("contract_address"), // null for native (ETH, BTC)
  decimals: integer("decimals").notNull(),
  displayName: text("display_name").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  rpcUrl: text("rpc_url"), // override per-chain RPC (null = use default)
  confirmations: integer("confirmations").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`(now())`),
});

/** Processed transaction IDs for watchers without block cursors (e.g. BTC). */
export const watcherProcessed = pgTable(
  "watcher_processed",
  {
    watcherId: text("watcher_id").notNull(),
    txId: text("tx_id").notNull(),
    processedAt: text("processed_at").notNull().default(sql`(now())`),
  },
  (table) => [primaryKey({ columns: [table.watcherId, table.txId] })],
);
