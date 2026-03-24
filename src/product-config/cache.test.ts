import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProductConfigCache } from "./cache.js";
import type { Product, ProductConfig } from "./repository-types.js";

function makeConfig(slug: string): ProductConfig {
  const product: Product = {
    id: "test-id",
    slug,
    brandName: "Test",
    productName: "Test",
    tagline: "",
    domain: "test.com",
    appDomain: "app.test.com",
    cookieDomain: ".test.com",
    companyLegal: "",
    priceLabel: "",
    defaultImage: "",
    emailSupport: "",
    emailPrivacy: "",
    emailLegal: "",
    fromEmail: "",
    homePath: "/dashboard",
    storagePrefix: "test",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return { product, navItems: [], domains: [], features: null, fleet: null, billing: null };
}

describe("ProductConfigCache", () => {
  let fetcher: (slug: string) => Promise<ProductConfig | null>;
  let fetcherMock: ReturnType<typeof vi.fn>;
  let cache: ProductConfigCache;

  beforeEach(() => {
    fetcherMock = vi.fn().mockResolvedValue(makeConfig("test"));
    fetcher = fetcherMock as unknown as (slug: string) => Promise<ProductConfig | null>;
    cache = new ProductConfigCache(fetcher, { ttlMs: 100 });
  });

  it("calls fetcher on first get", async () => {
    const result = await cache.get("test");
    expect(result).not.toBeNull();
    expect(result?.product.slug).toBe("test");
    expect(fetcherMock).toHaveBeenCalledOnce();
  });

  it("returns cached value on second get", async () => {
    await cache.get("test");
    await cache.get("test");
    expect(fetcherMock).toHaveBeenCalledOnce();
  });

  it("refetches after TTL expires", async () => {
    await cache.get("test");
    await new Promise((r) => setTimeout(r, 150));
    await cache.get("test");
    expect(fetcherMock).toHaveBeenCalledTimes(2);
  });

  it("invalidate forces refetch", async () => {
    await cache.get("test");
    cache.invalidate("test");
    await cache.get("test");
    expect(fetcherMock).toHaveBeenCalledTimes(2);
  });

  it("invalidateAll clears all entries", async () => {
    await cache.get("test");
    cache.invalidateAll();
    await cache.get("test");
    expect(fetcherMock).toHaveBeenCalledTimes(2);
  });

  it("does not cache null results", async () => {
    fetcherMock.mockResolvedValue(null);
    await cache.get("missing");
    await cache.get("missing");
    expect(fetcherMock).toHaveBeenCalledTimes(2);
  });
});
