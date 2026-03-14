import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BTCPayClient, loadCryptoConfig } from "./client.js";

describe("BTCPayClient", () => {
  it("createInvoice sends correct request and returns id + checkoutLink", async () => {
    const mockResponse = { id: "inv-001", checkoutLink: "https://btcpay.example.com/i/inv-001" };
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(mockResponse), { status: 200 }));

    const client = new BTCPayClient({
      apiKey: "test-key",
      baseUrl: "https://btcpay.example.com",
      storeId: "store-abc",
    });

    const result = await client.createInvoice({
      amountUsd: 25,
      orderId: "order-123",
      buyerEmail: "test@example.com",
    });

    expect(result.id).toBe("inv-001");
    expect(result.checkoutLink).toBe("https://btcpay.example.com/i/inv-001");

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://btcpay.example.com/api/v1/stores/store-abc/invoices");
    expect(opts?.method).toBe("POST");

    const headers = opts?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("token test-key");
    expect(headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(opts?.body as string);
    expect(body.amount).toBe("25");
    expect(body.currency).toBe("USD");
    expect(body.metadata.orderId).toBe("order-123");
    expect(body.metadata.buyerEmail).toBe("test@example.com");
    expect(body.checkout.speedPolicy).toBe("MediumSpeed");

    fetchSpy.mockRestore();
  });

  it("createInvoice includes redirectURL when provided", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "inv-002", checkoutLink: "https://btcpay.example.com/i/inv-002" }), {
        status: 200,
      }),
    );

    const client = new BTCPayClient({ apiKey: "k", baseUrl: "https://btcpay.example.com", storeId: "s" });
    await client.createInvoice({ amountUsd: 10, orderId: "o", redirectURL: "https://app.example.com/success" });

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.checkout.redirectURL).toBe("https://app.example.com/success");

    fetchSpy.mockRestore();
  });

  it("createInvoice throws on non-ok response", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("Unauthorized", { status: 401 }));

    const client = new BTCPayClient({ apiKey: "bad-key", baseUrl: "https://btcpay.example.com", storeId: "s" });
    await expect(client.createInvoice({ amountUsd: 10, orderId: "o" })).rejects.toThrow(
      "BTCPay createInvoice failed (401)",
    );

    fetchSpy.mockRestore();
  });

  it("getInvoice sends correct request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "inv-001", status: "Settled", amount: "25", currency: "USD" }), {
        status: 200,
      }),
    );

    const client = new BTCPayClient({ apiKey: "k", baseUrl: "https://btcpay.example.com", storeId: "store-abc" });
    const result = await client.getInvoice("inv-001");

    expect(result.status).toBe("Settled");
    expect(fetchSpy.mock.calls[0][0]).toBe("https://btcpay.example.com/api/v1/stores/store-abc/invoices/inv-001");

    fetchSpy.mockRestore();
  });
});

describe("loadCryptoConfig", () => {
  beforeEach(() => {
    delete process.env.BTCPAY_API_KEY;
    delete process.env.BTCPAY_BASE_URL;
    delete process.env.BTCPAY_STORE_ID;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when BTCPAY_API_KEY is missing", () => {
    vi.stubEnv("BTCPAY_BASE_URL", "https://btcpay.test");
    vi.stubEnv("BTCPAY_STORE_ID", "store-1");
    expect(loadCryptoConfig()).toBeNull();
  });

  it("returns null when BTCPAY_BASE_URL is missing", () => {
    vi.stubEnv("BTCPAY_API_KEY", "test-key");
    vi.stubEnv("BTCPAY_STORE_ID", "store-1");
    expect(loadCryptoConfig()).toBeNull();
  });

  it("returns null when BTCPAY_STORE_ID is missing", () => {
    vi.stubEnv("BTCPAY_API_KEY", "test-key");
    vi.stubEnv("BTCPAY_BASE_URL", "https://btcpay.test");
    expect(loadCryptoConfig()).toBeNull();
  });

  it("returns config when all env vars are set", () => {
    vi.stubEnv("BTCPAY_API_KEY", "test-key");
    vi.stubEnv("BTCPAY_BASE_URL", "https://btcpay.test");
    vi.stubEnv("BTCPAY_STORE_ID", "store-1");
    expect(loadCryptoConfig()).toEqual({
      apiKey: "test-key",
      baseUrl: "https://btcpay.test",
      storeId: "store-1",
    });
  });

  it("returns null when all env vars are missing", () => {
    expect(loadCryptoConfig()).toBeNull();
  });
});
