import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PlatformDb } from "../../db/index.js";
import { beginTestTransaction, createTestDb, endTestTransaction, rollbackTestTransaction } from "../../test/db.js";
import { CryptoChargeRepository } from "./charge-store.js";

describe("CryptoChargeRepository", () => {
  let pool: PGlite;
  let db: PlatformDb;
  let store: CryptoChargeRepository;

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
    store = new CryptoChargeRepository(db);
  });

  it("create() stores a charge with New status", async () => {
    await store.create("inv-001", "tenant-1", 2500);

    const charge = await store.getByReferenceId("inv-001");
    expect(charge).not.toBeNull();
    expect(charge?.referenceId).toBe("inv-001");
    expect(charge?.tenantId).toBe("tenant-1");
    expect(charge?.amountUsdCents).toBe(2500);
    expect(charge?.status).toBe("New");
    expect(charge?.creditedAt).toBeNull();
  });

  it("getByReferenceId() returns null when not found", async () => {
    const charge = await store.getByReferenceId("inv-nonexistent");
    expect(charge).toBeNull();
  });

  it("updateStatus() updates status, currency and filled_amount", async () => {
    await store.create("inv-002", "tenant-2", 5000);
    await store.updateStatus("inv-002", "Settled", "BTC", "0.00025");

    const charge = await store.getByReferenceId("inv-002");
    expect(charge?.status).toBe("Settled");
    expect(charge?.currency).toBe("BTC");
    expect(charge?.filledAmount).toBe("0.00025");
  });

  it("updateStatus() handles partial updates (no currency)", async () => {
    await store.create("inv-003", "tenant-3", 1000);
    await store.updateStatus("inv-003", "Processing");

    const charge = await store.getByReferenceId("inv-003");
    expect(charge?.status).toBe("Processing");
    expect(charge?.currency).toBeNull();
  });

  it("isCredited() returns false before markCredited", async () => {
    await store.create("inv-004", "tenant-4", 1500);
    expect(await store.isCredited("inv-004")).toBe(false);
  });

  it("markCredited() sets creditedAt", async () => {
    await store.create("inv-005", "tenant-5", 3000);
    await store.markCredited("inv-005");

    const charge = await store.getByReferenceId("inv-005");
    expect(charge?.creditedAt).not.toBeNull();
  });

  it("isCredited() returns true after markCredited", async () => {
    await store.create("inv-006", "tenant-6", 2000);
    await store.markCredited("inv-006");
    expect(await store.isCredited("inv-006")).toBe(true);
  });
});
