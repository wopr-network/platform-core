import { eq } from "drizzle-orm";
import type { PlatformDb } from "../../db/index.js";
import { paymentMethods } from "../../db/schema/crypto.js";

export interface PaymentMethodRecord {
  id: string;
  type: string;
  token: string;
  chain: string;
  contractAddress: string | null;
  decimals: number;
  displayName: string;
  enabled: boolean;
  displayOrder: number;
  rpcUrl: string | null;
  confirmations: number;
}

export interface IPaymentMethodStore {
  /** List all enabled payment methods, ordered by displayOrder. */
  listEnabled(): Promise<PaymentMethodRecord[]>;
  /** List all payment methods (including disabled). */
  listAll(): Promise<PaymentMethodRecord[]>;
  /** Get a specific payment method by id. */
  getById(id: string): Promise<PaymentMethodRecord | null>;
  /** Get enabled methods by type (stablecoin, eth, btc). */
  listByType(type: string): Promise<PaymentMethodRecord[]>;
  /** Upsert a payment method (admin). */
  upsert(method: PaymentMethodRecord): Promise<void>;
  /** Enable or disable a payment method (admin). */
  setEnabled(id: string, enabled: boolean): Promise<void>;
}

export class DrizzlePaymentMethodStore implements IPaymentMethodStore {
  constructor(private readonly db: PlatformDb) {}

  async listEnabled(): Promise<PaymentMethodRecord[]> {
    const rows = await this.db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.enabled, true))
      .orderBy(paymentMethods.displayOrder);
    return rows.map(toRecord);
  }

  async listAll(): Promise<PaymentMethodRecord[]> {
    const rows = await this.db.select().from(paymentMethods).orderBy(paymentMethods.displayOrder);
    return rows.map(toRecord);
  }

  async getById(id: string): Promise<PaymentMethodRecord | null> {
    const row = (await this.db.select().from(paymentMethods).where(eq(paymentMethods.id, id)))[0];
    return row ? toRecord(row) : null;
  }

  async listByType(type: string): Promise<PaymentMethodRecord[]> {
    const rows = await this.db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.type, type))
      .orderBy(paymentMethods.displayOrder);
    return rows.filter((r) => r.enabled).map(toRecord);
  }

  async upsert(method: PaymentMethodRecord): Promise<void> {
    await this.db
      .insert(paymentMethods)
      .values({
        id: method.id,
        type: method.type,
        token: method.token,
        chain: method.chain,
        contractAddress: method.contractAddress,
        decimals: method.decimals,
        displayName: method.displayName,
        enabled: method.enabled,
        displayOrder: method.displayOrder,
        rpcUrl: method.rpcUrl,
        confirmations: method.confirmations,
      })
      .onConflictDoUpdate({
        target: paymentMethods.id,
        set: {
          type: method.type,
          token: method.token,
          chain: method.chain,
          contractAddress: method.contractAddress,
          decimals: method.decimals,
          displayName: method.displayName,
          enabled: method.enabled,
          displayOrder: method.displayOrder,
          rpcUrl: method.rpcUrl,
          confirmations: method.confirmations,
        },
      });
  }

  async setEnabled(id: string, enabled: boolean): Promise<void> {
    await this.db.update(paymentMethods).set({ enabled }).where(eq(paymentMethods.id, id));
  }
}

function toRecord(row: typeof paymentMethods.$inferSelect): PaymentMethodRecord {
  return {
    id: row.id,
    type: row.type,
    token: row.token,
    chain: row.chain,
    contractAddress: row.contractAddress,
    decimals: row.decimals,
    displayName: row.displayName,
    enabled: row.enabled,
    displayOrder: row.displayOrder,
    rpcUrl: row.rpcUrl,
    confirmations: row.confirmations,
  };
}
