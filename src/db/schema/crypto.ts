import { sql } from "drizzle-orm";
import { index, integer, pgTable, text } from "drizzle-orm/pg-core";

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
    // uniqueIndex would be ideal but drizzle pgTable helper doesn't support it inline.
    // Enforced via migration: CREATE UNIQUE INDEX.
  ],
);
