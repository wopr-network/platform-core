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
  chain: string | null;
  token: string | null;
  depositAddress: string | null;
  derivationIndex: number | null;
}

export interface StablecoinChargeInput {
  referenceId: string;
  tenantId: string;
  amountUsdCents: number;
  chain: string;
  token: string;
  depositAddress: string;
  derivationIndex: number;
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
  createStablecoinCharge(input: StablecoinChargeInput): Promise<void>;
  getByDepositAddress(address: string): Promise<CryptoChargeRecord | null>;
  getNextDerivationIndex(): Promise<number>;
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
    return this.toRecord(row);
  }

  private toRecord(row: typeof cryptoCharges.$inferSelect): CryptoChargeRecord {
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
      chain: row.chain ?? null,
      token: row.token ?? null,
      depositAddress: row.depositAddress ?? null,
      derivationIndex: row.derivationIndex ?? null,
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

  /** Create a stablecoin charge with chain/token/deposit address. */
  async createStablecoinCharge(input: StablecoinChargeInput): Promise<void> {
    await this.db.insert(cryptoCharges).values({
      referenceId: input.referenceId,
      tenantId: input.tenantId,
      amountUsdCents: input.amountUsdCents,
      status: "New",
      chain: input.chain,
      token: input.token,
      depositAddress: input.depositAddress,
      derivationIndex: input.derivationIndex,
    });
  }

  /** Look up a charge by its deposit address. */
  async getByDepositAddress(address: string): Promise<CryptoChargeRecord | null> {
    const row = (await this.db.select().from(cryptoCharges).where(eq(cryptoCharges.depositAddress, address)))[0];
    if (!row) return null;
    return this.toRecord(row);
  }

  /** Get the next available HD derivation index (max + 1, or 0 if empty). */
  async getNextDerivationIndex(): Promise<number> {
    const result = await this.db
      .select({ maxIdx: sql<number>`coalesce(max(${cryptoCharges.derivationIndex}), -1)` })
      .from(cryptoCharges);
    return (result[0]?.maxIdx ?? -1) + 1;
  }
}

export { DrizzleCryptoChargeRepository as CryptoChargeRepository };
