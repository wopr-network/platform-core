/**
 * Unit tests for the monetization crypto webhook handler.
 *
 * This handler is the WOPR-specific layer on top of the platform-core
 * billing/crypto webhook. Key differences from billing/crypto/webhook.ts:
 *  - Uses BotBilling.checkReactivation() instead of onCreditsPurchased callback
 *  - Imports charge store / replay guard types from billing layer (relative)
 */
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { CryptoChargeRepository } from "../../../billing/crypto/charge-store.js";
import type { CryptoWebhookPayload } from "../../../billing/crypto/types.js";
import { DrizzleWebhookSeenRepository } from "../../../billing/drizzle-webhook-seen-repository.js";
import { noOpReplayGuard } from "../../../billing/webhook-seen-repository.js";
import { DrizzleLedger } from "../../../credits/ledger.js";
import { createTestDb, truncateAllTables } from "../../../test/db.js";
import type { BotBilling } from "../../credits/bot-billing.js";
import type { CryptoWebhookDeps } from "../webhook.js";
import { handleCryptoWebhook } from "../webhook.js";

function makePayload(overrides: Partial<CryptoWebhookPayload> = {}): CryptoWebhookPayload {
  return {
    deliveryId: "del-001",
    webhookId: "whk-001",
    originalDeliveryId: "del-001",
    isRedelivery: false,
    type: "InvoiceSettled",
    timestamp: Date.now(),
    storeId: "store-test",
    invoiceId: "inv-test-001",
    metadata: { orderId: "order-001" },
    ...overrides,
  };
}

let pool: PGlite;
let db: Awaited<ReturnType<typeof createTestDb>>["db"];

beforeAll(async () => {
  ({ db, pool } = await createTestDb());
});

afterAll(async () => {
  await pool.close();
});

describe("handleCryptoWebhook (monetization layer)", () => {
  let chargeStore: CryptoChargeRepository;
  let creditLedger: DrizzleLedger;
  let deps: CryptoWebhookDeps;

  beforeEach(async () => {
    await truncateAllTables(pool);
    chargeStore = new CryptoChargeRepository(db);
    creditLedger = new DrizzleLedger(db);
    await creditLedger.seedSystemAccounts();
    deps = { chargeStore, creditLedger, replayGuard: noOpReplayGuard };

    // Default test charge: $25 = 2500 cents
    await chargeStore.create("inv-test-001", "tenant-a", 2500);
  });

  // ---------------------------------------------------------------------------
  // InvoiceSettled — credits ledger
  // ---------------------------------------------------------------------------

  describe("InvoiceSettled", () => {
    it("credits the ledger with the USD amount in cents", async () => {
      const result = await handleCryptoWebhook(deps, makePayload({ type: "InvoiceSettled" }));

      expect(result.handled).toBe(true);
      expect(result.status).toBe("Settled");
      expect(result.tenant).toBe("tenant-a");
      expect(result.creditedCents).toBe(2500);

      const balance = await creditLedger.balance("tenant-a");
      expect(balance.toCents()).toBe(2500);
    });

    it("marks the charge as credited after settlement", async () => {
      await handleCryptoWebhook(deps, makePayload({ type: "InvoiceSettled" }));
      expect(await chargeStore.isCredited("inv-test-001")).toBe(true);
    });

    it("uses crypto: prefix on reference ID in ledger entry", async () => {
      await handleCryptoWebhook(deps, makePayload({ type: "InvoiceSettled" }));

      const history = await creditLedger.history("tenant-a");
      expect(history).toHaveLength(1);
      expect(history[0].referenceId).toBe("crypto:inv-test-001");
      expect(history[0].entryType).toBe("purchase");
    });

    it("records fundingSource as crypto", async () => {
      await handleCryptoWebhook(deps, makePayload({ type: "InvoiceSettled" }));

      const history = await creditLedger.history("tenant-a");
      expect(history[0].metadata?.fundingSource).toBe("crypto");
    });

    it("is idempotent — second InvoiceSettled does not double-credit", async () => {
      await handleCryptoWebhook(deps, makePayload({ type: "InvoiceSettled" }));
      const result2 = await handleCryptoWebhook(deps, makePayload({ type: "InvoiceSettled" }));

      expect(result2.handled).toBe(true);
      expect(result2.creditedCents).toBe(0);

      // Balance is still $25, not $50
      const balance = await creditLedger.balance("tenant-a");
      expect(balance.toCents()).toBe(2500);
    });
  });

  // ---------------------------------------------------------------------------
  // Non-settlement event types — no ledger credit
  // ---------------------------------------------------------------------------

  describe("InvoiceProcessing", () => {
    it("does NOT credit the ledger", async () => {
      const result = await handleCryptoWebhook(deps, makePayload({ type: "InvoiceProcessing" }));

      expect(result.handled).toBe(true);
      expect(result.tenant).toBe("tenant-a");
      expect(result.creditedCents).toBeUndefined();
      expect((await creditLedger.balance("tenant-a")).toCents()).toBe(0);
    });
  });

  describe("InvoiceCreated", () => {
    it("does NOT credit the ledger", async () => {
      const result = await handleCryptoWebhook(deps, makePayload({ type: "InvoiceCreated" }));

      expect(result.handled).toBe(true);
      expect(result.creditedCents).toBeUndefined();
      expect((await creditLedger.balance("tenant-a")).toCents()).toBe(0);
    });
  });

  describe("InvoiceExpired", () => {
    it("does NOT credit the ledger", async () => {
      const result = await handleCryptoWebhook(deps, makePayload({ type: "InvoiceExpired" }));

      expect(result.handled).toBe(true);
      expect(result.creditedCents).toBeUndefined();
      expect((await creditLedger.balance("tenant-a")).toCents()).toBe(0);
    });
  });

  describe("InvoiceInvalid", () => {
    it("does NOT credit the ledger", async () => {
      const result = await handleCryptoWebhook(deps, makePayload({ type: "InvoiceInvalid" }));

      expect(result.handled).toBe(true);
      expect(result.creditedCents).toBeUndefined();
      expect((await creditLedger.balance("tenant-a")).toCents()).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Unknown invoiceId — returns handled:false
  // ---------------------------------------------------------------------------

  describe("missing charge", () => {
    it("returns handled:false when invoiceId is not in the charge store", async () => {
      const result = await handleCryptoWebhook(deps, makePayload({ invoiceId: "inv-unknown-999" }));

      expect(result.handled).toBe(false);
      expect(result.tenant).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Status mapping for all known event types
  // ---------------------------------------------------------------------------

  describe("status mapping", () => {
    it.each([
      ["InvoiceCreated", "New"],
      ["InvoiceProcessing", "Processing"],
      ["InvoiceReceivedPayment", "Processing"],
      ["InvoiceSettled", "Settled"],
      ["InvoicePaymentSettled", "Settled"],
      ["InvoiceExpired", "Expired"],
      ["InvoiceInvalid", "Invalid"],
    ] as const)("maps %s event to %s status", async (eventType, expectedStatus) => {
      const result = await handleCryptoWebhook(deps, makePayload({ type: eventType }));
      expect(result.status).toBe(expectedStatus);
    });

    it("throws on unknown event types", async () => {
      await expect(handleCryptoWebhook(deps, makePayload({ type: "InvoiceSomeUnknownEvent" }))).rejects.toThrow(
        "Unknown BTCPay event type: InvoiceSomeUnknownEvent",
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Charge store status updates
  // ---------------------------------------------------------------------------

  describe("charge store updates", () => {
    it("updates charge status on every webhook call", async () => {
      await handleCryptoWebhook(deps, makePayload({ type: "InvoiceProcessing" }));

      const charge = await chargeStore.getByReferenceId("inv-test-001");
      expect(charge?.status).toBe("Processing");
    });
  });

  // ---------------------------------------------------------------------------
  // Replay guard / idempotency
  // ---------------------------------------------------------------------------

  describe("replay guard", () => {
    it("blocks duplicate invoiceId + event type combinations", async () => {
      const replayGuard = new DrizzleWebhookSeenRepository(db);
      const depsWithGuard: CryptoWebhookDeps = { ...deps, replayGuard };

      const first = await handleCryptoWebhook(depsWithGuard, makePayload({ type: "InvoiceSettled" }));
      expect(first.handled).toBe(true);
      expect(first.creditedCents).toBe(2500);
      expect(first.duplicate).toBeUndefined();

      const second = await handleCryptoWebhook(depsWithGuard, makePayload({ type: "InvoiceSettled" }));
      expect(second.handled).toBe(true);
      expect(second.duplicate).toBe(true);
      expect(second.creditedCents).toBeUndefined();

      // Balance is still $25, not $50
      expect((await creditLedger.balance("tenant-a")).toCents()).toBe(2500);
    });

    it("same invoice with a different event type is not blocked", async () => {
      const replayGuard = new DrizzleWebhookSeenRepository(db);
      const depsWithGuard: CryptoWebhookDeps = { ...deps, replayGuard };

      await handleCryptoWebhook(depsWithGuard, makePayload({ type: "InvoiceProcessing" }));
      const result = await handleCryptoWebhook(depsWithGuard, makePayload({ type: "InvoiceSettled" }));

      expect(result.duplicate).toBeUndefined();
      expect(result.creditedCents).toBe(2500);
    });
  });

  // ---------------------------------------------------------------------------
  // BotBilling reactivation — WOPR-specific behaviour
  // ---------------------------------------------------------------------------

  describe("BotBilling reactivation", () => {
    it("calls botBilling.checkReactivation on InvoiceSettled and returns reactivatedBots", async () => {
      const mockBotBilling = {
        checkReactivation: vi.fn().mockResolvedValue(["bot-1", "bot-2"]),
      } as unknown as BotBilling;
      const depsWithBots: CryptoWebhookDeps = { ...deps, botBilling: mockBotBilling };

      const result = await handleCryptoWebhook(depsWithBots, makePayload({ type: "InvoiceSettled" }));

      expect(mockBotBilling.checkReactivation).toHaveBeenCalledWith("tenant-a", creditLedger);
      expect(result.reactivatedBots).toEqual(["bot-1", "bot-2"]);
    });

    it("omits reactivatedBots when no bots are reactivated", async () => {
      const mockBotBilling = {
        checkReactivation: vi.fn().mockResolvedValue([]),
      } as unknown as BotBilling;
      const depsWithBots: CryptoWebhookDeps = { ...deps, botBilling: mockBotBilling };

      const result = await handleCryptoWebhook(depsWithBots, makePayload({ type: "InvoiceSettled" }));

      expect(result.reactivatedBots).toBeUndefined();
    });

    it("does NOT call botBilling on non-settled events", async () => {
      const mockBotBilling = {
        checkReactivation: vi.fn().mockResolvedValue(["bot-1"]),
      } as unknown as BotBilling;
      const depsWithBots: CryptoWebhookDeps = { ...deps, botBilling: mockBotBilling };

      await handleCryptoWebhook(depsWithBots, makePayload({ type: "InvoiceProcessing" }));

      expect(mockBotBilling.checkReactivation).not.toHaveBeenCalled();
    });

    it("does NOT call botBilling when charge is already credited (idempotency path)", async () => {
      const mockBotBilling = {
        checkReactivation: vi.fn().mockResolvedValue(["bot-1"]),
      } as unknown as BotBilling;
      const depsWithBots: CryptoWebhookDeps = { ...deps, botBilling: mockBotBilling };

      // First settlement — should call reactivation
      await handleCryptoWebhook(depsWithBots, makePayload({ type: "InvoiceSettled" }));
      expect(mockBotBilling.checkReactivation).toHaveBeenCalledTimes(1);

      // Second settlement — charge already credited, should NOT call reactivation again
      await handleCryptoWebhook(depsWithBots, makePayload({ type: "InvoiceSettled" }));
      expect(mockBotBilling.checkReactivation).toHaveBeenCalledTimes(1);
    });

    it("operates correctly when botBilling is not provided", async () => {
      // No botBilling dependency — should complete without error
      const result = await handleCryptoWebhook(deps, makePayload({ type: "InvoiceSettled" }));

      expect(result.handled).toBe(true);
      expect(result.creditedCents).toBe(2500);
      expect(result.reactivatedBots).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Multiple tenants — independent processing
  // ---------------------------------------------------------------------------

  describe("multiple tenants", () => {
    it("processes invoices for different tenants independently", async () => {
      await chargeStore.create("inv-b-001", "tenant-b", 5000);
      await chargeStore.create("inv-c-001", "tenant-c", 1500);

      await handleCryptoWebhook(deps, makePayload({ invoiceId: "inv-b-001", type: "InvoiceSettled" }));
      await handleCryptoWebhook(deps, makePayload({ invoiceId: "inv-c-001", type: "InvoiceSettled" }));

      expect((await creditLedger.balance("tenant-b")).toCents()).toBe(5000);
      expect((await creditLedger.balance("tenant-c")).toCents()).toBe(1500);
      // Original tenant-a was not settled in this test
      expect((await creditLedger.balance("tenant-a")).toCents()).toBe(0);
    });
  });
});
