import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Must mock before importing
vi.mock("@/lib/api-config", () => ({
  API_BASE_URL: "http://test-api/api",
  PLATFORM_BASE_URL: "http://test-api",
}));

// Mock trpc and fetch-utils so api.ts can import without issues
vi.mock("@/lib/trpc", () => ({
  trpcVanilla: {},
}));

vi.mock("@/lib/fetch-utils", () => ({
  handleUnauthorized: vi.fn(),
  UnauthorizedError: class extends Error {},
}));

describe("fetchPublicPricing", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed rates on success", async () => {
    const mockResponse = {
      rates: {
        llm: [{ name: "GPT-4o", unit: "1M input tokens", price: 2.5 }],
      },
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { fetchPublicPricing } = await import("@/lib/api");
    const result = await fetchPublicPricing();
    expect(result).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://test-api/api/v1/pricing",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("returns null on fetch failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const { fetchPublicPricing } = await import("@/lib/api");
    const result = await fetchPublicPricing();
    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { fetchPublicPricing } = await import("@/lib/api");
    const result = await fetchPublicPricing();
    expect(result).toBeNull();
  });
});
