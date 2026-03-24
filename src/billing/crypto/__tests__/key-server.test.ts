import { describe, expect, it, vi } from "vitest";
import type { ICryptoChargeRepository } from "../charge-store.js";
import type { KeyServerDeps } from "../key-server.js";
import { createKeyServerApp } from "../key-server.js";
import type { IPaymentMethodStore } from "../payment-method-store.js";

/** Create a mock db that supports transaction() by passing itself to the callback. */
function createMockDb() {
  const mockMethod = {
    id: "btc",
    type: "native",
    token: "BTC",
    chain: "bitcoin",
    xpub: "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz",
    nextIndex: 1,
    decimals: 8,
    addressType: "bech32",
    encodingParams: '{"hrp":"bc"}',
    watcherType: "utxo",
    oracleAssetId: "bitcoin",
    confirmations: 6,
  };

  const db = {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockMethod]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue({ rowCount: 1 }),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
    // transaction() passes itself as tx — mocks work the same way
    transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => unknown) => fn(db)),
  };
  return db;
}

/** Minimal mock deps for key server tests. */
function mockDeps(): KeyServerDeps & {
  chargeStore: { [K in keyof ICryptoChargeRepository]: ReturnType<typeof vi.fn> };
  methodStore: { [K in keyof IPaymentMethodStore]: ReturnType<typeof vi.fn> };
} {
  const chargeStore = {
    getByReferenceId: vi.fn().mockResolvedValue({
      referenceId: "btc:bc1q...",
      status: "New",
      depositAddress: "bc1q...",
      chain: "bitcoin",
      token: "BTC",
      amountUsdCents: 5000,
      creditedAt: null,
    }),
    createStablecoinCharge: vi.fn().mockResolvedValue(undefined),
    create: vi.fn(),
    updateStatus: vi.fn(),
    markCredited: vi.fn(),
    isCredited: vi.fn(),
    getByDepositAddress: vi.fn(),
    getNextDerivationIndex: vi.fn(),
    listActiveDepositAddresses: vi.fn(),
  };
  const methodStore = {
    listEnabled: vi.fn().mockResolvedValue([
      {
        id: "btc",
        token: "BTC",
        chain: "bitcoin",
        decimals: 8,
        displayName: "Bitcoin",
        contractAddress: null,
        confirmations: 6,
        iconUrl: null,
      },
      {
        id: "base-usdc",
        token: "USDC",
        chain: "base",
        decimals: 6,
        displayName: "USDC on Base",
        contractAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        confirmations: 12,
        iconUrl: null,
      },
    ]),
    listAll: vi.fn(),
    getById: vi.fn().mockResolvedValue({
      id: "btc",
      type: "native",
      token: "BTC",
      chain: "bitcoin",
      decimals: 8,
      displayName: "Bitcoin",
      contractAddress: null,
      confirmations: 6,
      oracleAddress: "0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F",
      xpub: null,
      displayOrder: 0,
      iconUrl: null,
      enabled: true,
      rpcUrl: null,
    }),
    listByType: vi.fn(),
    upsert: vi.fn().mockResolvedValue(undefined),
    setEnabled: vi.fn().mockResolvedValue(undefined),
    patchMetadata: vi.fn().mockResolvedValue(true),
  };
  return {
    db: createMockDb() as never,
    chargeStore: chargeStore as never,
    methodStore: methodStore as never,
    oracle: { getPrice: vi.fn().mockResolvedValue({ priceMicros: 65_000_000_000, updatedAt: new Date() }) } as never,
  };
}

describe("key-server routes", () => {
  it("GET /chains returns enabled payment methods", async () => {
    const app = createKeyServerApp(mockDeps());
    const res = await app.request("/chains");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].token).toBe("BTC");
    expect(body[1].token).toBe("USDC");
  });

  it("POST /address requires chain", async () => {
    const app = createKeyServerApp(mockDeps());
    const res = await app.request("/address", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("POST /address derives BTC address", async () => {
    const app = createKeyServerApp(mockDeps());
    const res = await app.request("/address", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chain: "btc" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.address).toMatch(/^bc1q/);
    expect(body.index).toBe(0);
    expect(body.chain).toBe("bitcoin");
    expect(body.token).toBe("BTC");
  });

  it("GET /charges/:id returns charge status", async () => {
    const app = createKeyServerApp(mockDeps());
    const res = await app.request("/charges/btc:bc1q...");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.chargeId).toBe("btc:bc1q...");
    expect(body.status).toBe("New");
  });

  it("GET /charges/:id returns 404 for missing charge", async () => {
    const deps = mockDeps();
    (deps.chargeStore.getByReferenceId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const app = createKeyServerApp(deps);
    const res = await app.request("/charges/nonexistent");
    expect(res.status).toBe(404);
  });

  it("POST /charges validates amountUsd", async () => {
    const app = createKeyServerApp(mockDeps());
    const res = await app.request("/charges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chain: "btc", amountUsd: -10 }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /address retries on shared-xpub address collision", async () => {
    const collision = Object.assign(new Error("unique_violation"), { code: "23505" });
    let callCount = 0;

    const mockMethod = {
      id: "eth",
      type: "native",
      token: "ETH",
      chain: "base",
      xpub: "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz",
      nextIndex: 0,
      decimals: 18,
      addressType: "evm",
      encodingParams: "{}",
      watcherType: "evm",
      oracleAssetId: "ethereum",
      confirmations: 1,
    };

    const db = {
      // Each update call increments nextIndex
      update: vi.fn().mockImplementation(() => ({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockImplementation(() => {
              callCount++;
              return Promise.resolve([{ ...mockMethod, nextIndex: callCount }]);
            }),
          }),
        }),
      })),
      insert: vi.fn().mockImplementation(() => ({
        values: vi.fn().mockImplementation(() => {
          // First insert collides, second succeeds
          if (callCount <= 1) throw collision;
          return { onConflictDoNothing: vi.fn().mockResolvedValue({ rowCount: 1 }) };
        }),
      })),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
      transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => unknown) => fn(db)),
    };

    const deps = mockDeps();
    (deps as unknown as { db: unknown }).db = db;
    const app = createKeyServerApp(deps);

    const res = await app.request("/address", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chain: "eth" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.address).toMatch(/^0x/);
    // Should have called update twice (first collision, then success)
    expect(callCount).toBe(2);
    expect(body.index).toBe(1); // skipped index 0
  });

  it("POST /address retries on Drizzle-wrapped collision error (cause.code)", async () => {
    // Drizzle wraps PG errors: err.code is undefined, err.cause.code has "23505"
    const pgError = Object.assign(new Error("unique_violation"), { code: "23505" });
    const drizzleError = Object.assign(new Error("DrizzleQueryError"), { cause: pgError });
    let callCount = 0;

    const mockMethod = {
      id: "eth",
      type: "native",
      token: "ETH",
      chain: "base",
      xpub: "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKrhko4egpiMZbpiaQL2jkwSB1icqYh2cfDfVxdx4df189oLKnC5fSwqPfgyP3hooxujYzAu3fDVmz",
      nextIndex: 0,
      decimals: 18,
      addressType: "evm",
      encodingParams: "{}",
      watcherType: "evm",
      oracleAssetId: "ethereum",
      confirmations: 1,
    };

    const db = {
      update: vi.fn().mockImplementation(() => ({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockImplementation(() => {
              callCount++;
              return Promise.resolve([{ ...mockMethod, nextIndex: callCount }]);
            }),
          }),
        }),
      })),
      insert: vi.fn().mockImplementation(() => ({
        values: vi.fn().mockImplementation(() => {
          if (callCount <= 1) throw drizzleError;
          return { onConflictDoNothing: vi.fn().mockResolvedValue({ rowCount: 1 }) };
        }),
      })),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      }),
      transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => unknown) => fn(db)),
    };

    const deps = mockDeps();
    (deps as unknown as { db: unknown }).db = db;
    const app = createKeyServerApp(deps);

    const res = await app.request("/address", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chain: "eth" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.address).toMatch(/^0x/);
    expect(callCount).toBe(2);
    expect(body.index).toBe(1);
  });

  it("POST /charges creates a charge", async () => {
    const app = createKeyServerApp(mockDeps());
    const res = await app.request("/charges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chain: "btc", amountUsd: 50 }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.address).toMatch(/^bc1q/);
    expect(body.amountUsd).toBe(50);
    expect(body.expiresAt).toBeTruthy();
  });

  it("GET /admin/next-path returns available path", async () => {
    const deps = mockDeps();
    deps.adminToken = "test-admin";
    const app = createKeyServerApp(deps);
    const res = await app.request("/admin/next-path?coin_type=0", {
      headers: { Authorization: "Bearer test-admin" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.path).toBe("m/44'/0'/0'");
    expect(body.status).toBe("available");
  });

  it("DELETE /admin/chains/:id disables chain", async () => {
    const deps = mockDeps();
    deps.adminToken = "test-admin";
    const app = createKeyServerApp(deps);
    const res = await app.request("/admin/chains/doge", {
      method: "DELETE",
      headers: { Authorization: "Bearer test-admin" },
    });
    expect(res.status).toBe(204);
    expect(deps.methodStore.setEnabled).toHaveBeenCalledWith("doge", false);
  });
});

describe("key-server auth", () => {
  it("rejects unauthenticated request when serviceKey is set", async () => {
    const deps = mockDeps();
    deps.serviceKey = "sk-test-secret";
    const app = createKeyServerApp(deps);
    const res = await app.request("/address", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chain: "btc" }),
    });
    expect(res.status).toBe(401);
  });

  it("allows authenticated request with correct serviceKey", async () => {
    const deps = mockDeps();
    deps.serviceKey = "sk-test-secret";
    const app = createKeyServerApp(deps);
    const res = await app.request("/address", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer sk-test-secret" },
      body: JSON.stringify({ chain: "btc" }),
    });
    expect(res.status).toBe(201);
  });

  it("rejects admin route without adminToken", async () => {
    const deps = mockDeps();
    // no adminToken set — admin routes disabled
    const app = createKeyServerApp(deps);
    const res = await app.request("/admin/next-path?coin_type=0");
    expect(res.status).toBe(403);
  });

  it("allows admin route with correct adminToken", async () => {
    const deps = mockDeps();
    deps.adminToken = "admin-secret";
    const app = createKeyServerApp(deps);
    const res = await app.request("/admin/next-path?coin_type=0", {
      headers: { Authorization: "Bearer admin-secret" },
    });
    expect(res.status).toBe(200);
  });
});
