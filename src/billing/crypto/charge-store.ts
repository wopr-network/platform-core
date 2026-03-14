import { eq, sql } from "drizzle-orm";
import type { PlatformDb } from "../../db/index.js";
import { cryptoCharges } from "../../db/schema/crypto.js";
import type { CryptoPaymentState } from "./types.js";

export interface CryptoChargeRecord {
  referenceId: string;
  tenantId: string;
  amountUsdCents: number;
  status: string;
  currency: string | null;
  filledAmount: string | null;
  creditedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ICryptoChargeRepository {
  create(referenceId: string, tenantId: string, amountUsdCents: number): Promise<void>;
  getByReferenceId(referenceId: string): Promise<CryptoChargeRecord | null>;
  updateStatus(
    referenceId: string,
    status: CryptoPaymentState,
    currency?: string,
    filledAmount?: string,
  ): Promise<void>;
  markCredited(referenceId: string): Promise<void>;
  isCredited(referenceId: string): Promise<boolean>;
}

/**
 * Manages crypto charge records in PostgreSQL.
 *
 * Each charge maps a BTCPay invoice ID to a tenant and tracks
 * the payment lifecycle (New → Processing → Settled/Expired/Invalid).
 *
 * amountUsdCents stores the requested amount in USD cents (integer).
 * This is NOT nanodollars — Credit.fromCents() handles the conversion
 * when crediting the ledger in the webhook handler.
 */
export class DrizzleCryptoChargeRepository implements ICryptoChargeRepository {
  constructor(private readonly db: PlatformDb) {}

  /** Create a new charge record when an invoice is created. */
  async create(referenceId: string, tenantId: string, amountUsdCents: number): Promise<void> {
    await this.db.insert(cryptoCharges).values({
      referenceId,
      tenantId,
      amountUsdCents,
      status: "New",
    });
  }

  /** Get a charge by reference ID. Returns null if not found. */
  async getByReferenceId(referenceId: string): Promise<CryptoChargeRecord | null> {
    const row = (await this.db.select().from(cryptoCharges).where(eq(cryptoCharges.referenceId, referenceId)))[0];
    if (!row) return null;
    return {
      referenceId: row.referenceId,
      tenantId: row.tenantId,
      amountUsdCents: row.amountUsdCents,
      status: row.status,
      currency: row.currency ?? null,
      filledAmount: row.filledAmount ?? null,
      creditedAt: row.creditedAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /** Update charge status and payment details from webhook. */
  async updateStatus(
    referenceId: string,
    status: CryptoPaymentState,
    currency?: string,
    filledAmount?: string,
  ): Promise<void> {
    await this.db
      .update(cryptoCharges)
      .set({
        status,
        currency,
        filledAmount,
        updatedAt: sql`now()`,
      })
      .where(eq(cryptoCharges.referenceId, referenceId));
  }

  /** Mark a charge as credited (idempotency flag). */
  async markCredited(referenceId: string): Promise<void> {
    await this.db
      .update(cryptoCharges)
      .set({
        creditedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(eq(cryptoCharges.referenceId, referenceId));
  }

  /** Check if a charge has already been credited (for idempotency). */
  async isCredited(referenceId: string): Promise<boolean> {
    const row = (
      await this.db
        .select({ creditedAt: cryptoCharges.creditedAt })
        .from(cryptoCharges)
        .where(eq(cryptoCharges.referenceId, referenceId))
    )[0];
    return row?.creditedAt != null;
  }
}

export { DrizzleCryptoChargeRepository as CryptoChargeRepository };
