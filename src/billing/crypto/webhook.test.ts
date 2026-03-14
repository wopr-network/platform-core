import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { DrizzleLedger } from "../../credits/ledger.js";
import type { PlatformDb } from "../../db/index.js";
import { createTestDb, truncateAllTables } from "../../test/db.js";
import { DrizzleWebhookSeenRepository } from "../drizzle-webhook-seen-repository.js";
import { noOpReplayGuard } from "../webhook-seen-repository.js";
import { CryptoChargeRepository } from "./charge-store.js";
import type { CryptoWebhookDeps } from "./webhook.js";
import type { CryptoWebhookPayload } from "./types.js";
import { handleCryptoWebhook, verifyCryptoWebhookSignature } from "./webhook.js";
import crypto from "node:crypto";

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
let db: PlatformDb;

beforeAll(async () => {
  ({ db, pool } = await createTestDb());
});

afterAll(async () => {
  await pool.close();
});

describe("handleCryptoWebhook", () => {
  let chargeStore: CryptoChargeRepository;
  let creditLedger: DrizzleLedger;
  let deps: CryptoWebhookDeps;

  beforeEach(async () => {
    await truncateAllTables(pool);
    chargeStore = new CryptoChargeRepository(db);
    creditLedger = new DrizzleLedger(db);
    await creditLedger.seedSystemAccounts();
    deps = { chargeStore, creditLedger, replayGuard: noOpReplayGuard };

    // Create a default test charge
    await chargeStore.create("inv-test-001", "tenant-a", 2500);
  });

  // ---------------------------------------------------------------------------
  // InvoiceSettled — should credit ledger
  // ---------------------------------------------------------------------------

  describe("InvoiceSettled", () => {
    it("credits the ledger with the requested USD amount", async () => {
      const result = await handleCryptoWebhook(deps, makePayload({ type: "InvoiceSettled" }));

      expect(result.handled).toBe(true);
      expect(result.status).toBe("Settled");
      expect(result.tenant).toBe("tenant-a");
      expect(result.creditedCents).toBe(2500);

      const balance = await creditLedger.balance("tenant-a");
      expect(balance.toCents()).toBe(2500);
    });

    it("uses crypto: prefix on reference ID in credit transaction", async () => {
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

    it("marks the charge as credited after Settled", async () => {
      await handleCryptoWebhook(deps, makePayload({ type: "InvoiceSettled" }));
      expect(await chargeStore.isCredited("inv-test-001")).toBe(true);
    });

    it("is idempotent — duplicate InvoiceSettled does not double-credit", async () => {
      await handleCryptoWebhook(deps, makePayload({ type: "InvoiceSettled" }));
      const result2 = await handleCryptoWebhook(deps, makePayload({ type: "InvoiceSettled" }));

      expect(result2.handled).toBe(true);
      expect(result2.creditedCents).toBe(0);

      const balance = await creditLedger.balance("tenant-a");
      expect(balance.toCents()).toBe(2500); // Only credited once
    });
  });

  // ---------------------------------------------------------------------------
  // Statuses that should NOT credit the ledger
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
  // Unknown invoice ID
  // ---------------------------------------------------------------------------

  describe("unknown invoiceId", () => {
    it("returns handled:false when charge not found", async () => {
      const result = await handleCryptoWebhook(deps, makePayload({ invoiceId: "inv-unknown-999" }));

      expect(result.handled).toBe(false);
      expect(result.tenant).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Charge store updates
  // ---------------------------------------------------------------------------

  describe("charge store updates", () => {
    it("updates charge status on every webhook call", async () => {
      await handleCryptoWebhook(deps, makePayload({ type: "InvoiceProcessing" }));

      const charge = await chargeStore.getByReferenceId("inv-test-001");
      expect(charge?.status).toBe("Processing");
    });
  });

  // ---------------------------------------------------------------------------
  // Multiple tenants
  // ---------------------------------------------------------------------------

  describe("different invoices", () => {
    it("processes multiple invoices independently", async () => {
      await chargeStore.create("inv-b-001", "tenant-b", 5000);
      await chargeStore.create("inv-c-001", "tenant-c", 1500);

      await handleCryptoWebhook(deps, makePayload({ invoiceId: "inv-b-001", type: "InvoiceSettled" }));
      await handleCryptoWebhook(deps, makePayload({ invoiceId: "inv-c-001", type: "InvoiceSettled" }));

      expect((await creditLedger.balance("tenant-b")).toCents()).toBe(5000);
      expect((await creditLedger.balance("tenant-c")).toCents()).toBe(1500);
    });
  });

  // ---------------------------------------------------------------------------
  // Replay guard
  // ---------------------------------------------------------------------------

  describe("replay guard", () => {
    it("blocks duplicate invoiceId + event type combos", async () => {
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

      expect((await creditLedger.balance("tenant-a")).toCents()).toBe(2500);
    });

    it("same invoice with different event type is not blocked", async () => {
      const replayGuard = new DrizzleWebhookSeenRepository(db);
      const depsWithGuard: CryptoWebhookDeps = { ...deps, replayGuard };

      await handleCryptoWebhook(depsWithGuard, makePayload({ type: "InvoiceProcessing" }));
      const result = await handleCryptoWebhook(depsWithGuard, makePayload({ type: "InvoiceSettled" }));

      expect(result.duplicate).toBeUndefined();
      expect(result.creditedCents).toBe(2500);
    });
  });

  // ---------------------------------------------------------------------------
  // Resource reactivation
  // ---------------------------------------------------------------------------

  describe("resource reactivation via onCreditsPurchased", () => {
    it("calls onCreditsPurchased on Settled and includes reactivatedBots", async () => {
      const mockOnCreditsPurchased = vi.fn().mockResolvedValue(["bot-1", "bot-2"]);
      const depsWithCallback: CryptoWebhookDeps = {
        ...deps,
        onCreditsPurchased: mockOnCreditsPurchased,
      };

      const result = await handleCryptoWebhook(depsWithCallback, makePayload({ type: "InvoiceSettled" }));

      expect(mockOnCreditsPurchased).toHaveBeenCalledWith("tenant-a", creditLedger);
      expect(result.reactivatedBots).toEqual(["bot-1", "bot-2"]);
    });

    it("does not include reactivatedBots when no resources reactivated", async () => {
      const mockOnCreditsPurchased = vi.fn().mockResolvedValue([]);
      const depsWithCallback: CryptoWebhookDeps = {
        ...deps,
        onCreditsPurchased: mockOnCreditsPurchased,
      };

      const result = await handleCryptoWebhook(depsWithCallback, makePayload({ type: "InvoiceSettled" }));

      expect(result.reactivatedBots).toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// Webhook signature verification
// ---------------------------------------------------------------------------

describe("verifyCryptoWebhookSignature", () => {
  const secret = "test-webhook-secret";
  const body = '{"type":"InvoiceSettled","invoiceId":"inv-001"}';

  it("returns true for valid signature", () => {
    const sig = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyCryptoWebhookSignature(body, sig, secret)).toBe(true);
  });

  it("returns false for invalid signature", () => {
    expect(verifyCryptoWebhookSignature(body, "sha256=badhex", secret)).toBe(false);
  });

  it("returns false for wrong secret", () => {
    const sig = "sha256=" + crypto.createHmac("sha256", "wrong-secret").update(body).digest("hex");
    expect(verifyCryptoWebhookSignature(body, sig, secret)).toBe(false);
  });

  it("returns false for tampered body", () => {
    const sig = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyCryptoWebhookSignature(body + "tampered", sig, secret)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Replay guard unit tests
// ---------------------------------------------------------------------------

describe("DrizzleWebhookSeenRepository (crypto replay guard)", () => {
  beforeEach(async () => {
    await truncateAllTables(pool);
  });

  it("reports unseen keys as not duplicate", async () => {
    const guard = new DrizzleWebhookSeenRepository(db);
    expect(await guard.isDuplicate("inv-001:InvoiceSettled", "crypto")).toBe(false);
  });

  it("reports seen keys as duplicate", async () => {
    const guard = new DrizzleWebhookSeenRepository(db);
    await guard.markSeen("inv-001:InvoiceSettled", "crypto");
    expect(await guard.isDuplicate("inv-001:InvoiceSettled", "crypto")).toBe(true);
  });
});
