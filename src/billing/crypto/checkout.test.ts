import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlatformDb } from "../../db/index.js";
import { beginTestTransaction, createTestDb, endTestTransaction, rollbackTestTransaction } from "../../test/db.js";
import { CryptoChargeRepository } from "./charge-store.js";
import { createCryptoCheckout, MIN_PAYMENT_USD } from "./checkout.js";
import type { BTCPayClient } from "./client.js";

function createMockClient(overrides: { createInvoice?: ReturnType<typeof vi.fn> } = {}): BTCPayClient {
  return {
    createInvoice:
      overrides.createInvoice ??
      vi.fn().mockResolvedValue({
        id: "inv-mock-001",
        checkoutLink: "https://btcpay.example.com/i/inv-mock-001",
      }),
  } as unknown as BTCPayClient;
}

describe("createCryptoCheckout", () => {
  let pool: PGlite;
  let db: PlatformDb;
  let chargeStore: CryptoChargeRepository;
  let client: BTCPayClient;

  beforeAll(async () => {
    ({ db, pool } = await createTestDb());
    await beginTestTransaction(pool);
  });

  afterAll(async () => {
    await endTestTransaction(pool);
    await pool.close();
  });

  beforeEach(async () => {
    await rollbackTestTransaction(pool);
    chargeStore = new CryptoChargeRepository(db);
    client = createMockClient();
  });

  it("rejects amounts below $10 minimum", async () => {
    await expect(createCryptoCheckout(client, chargeStore, { tenant: "t-1", amountUsd: 5 })).rejects.toThrow(
      `Minimum payment amount is $${MIN_PAYMENT_USD}`,
    );
  });

  it("rejects amounts of exactly $0", async () => {
    await expect(createCryptoCheckout(client, chargeStore, { tenant: "t-1", amountUsd: 0 })).rejects.toThrow();
  });

  it("calls client.createInvoice with correct params", async () => {
    const createInvoice = vi.fn().mockResolvedValue({
      id: "inv-abc",
      checkoutLink: "https://btcpay.example.com/i/inv-abc",
    });
    const mockClient = createMockClient({ createInvoice });

    await createCryptoCheckout(mockClient, chargeStore, { tenant: "t-test", amountUsd: 25 });

    expect(createInvoice).toHaveBeenCalledOnce();
    const args = createInvoice.mock.calls[0][0];
    expect(args.amountUsd).toBe(25);
    expect(args.buyerEmail).toContain("t-test@");
  });

  it("stores the charge with correct amountUsdCents (converts from USD)", async () => {
    const createInvoice = vi.fn().mockResolvedValue({
      id: "inv-store-test",
      checkoutLink: "https://btcpay.example.com/i/inv-store-test",
    });
    const mockClient = createMockClient({ createInvoice });

    await createCryptoCheckout(mockClient, chargeStore, { tenant: "t-2", amountUsd: 25 });

    const charge = await chargeStore.getByReferenceId("inv-store-test");
    expect(charge).not.toBeNull();
    expect(charge?.tenantId).toBe("t-2");
    expect(charge?.amountUsdCents).toBe(2500); // $25.00 = 2500 cents
    expect(charge?.status).toBe("New");
  });

  it("returns referenceId and url", async () => {
    const result = await createCryptoCheckout(client, chargeStore, { tenant: "t-3", amountUsd: 10 });

    expect(result.referenceId).toBe("inv-mock-001");
    expect(result.url).toBe("https://btcpay.example.com/i/inv-mock-001");
  });

  it("accepts exactly $10 (minimum boundary)", async () => {
    await expect(createCryptoCheckout(client, chargeStore, { tenant: "t-4", amountUsd: 10 })).resolves.not.toBeNull();
  });
});
