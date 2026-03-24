import type { ProductConfig } from "./repository-types.js";

interface CacheEntry {
  config: ProductConfig;
  expiresAt: number;
}

export class ProductConfigCache {
  private cache = new Map<string, CacheEntry>();
  private ttlMs: number;
  private fetcher: (slug: string) => Promise<ProductConfig | null>;

  constructor(fetcher: (slug: string) => Promise<ProductConfig | null>, opts: { ttlMs?: number } = {}) {
    this.fetcher = fetcher;
    this.ttlMs = opts.ttlMs ?? 60_000;
  }

  async get(slug: string): Promise<ProductConfig | null> {
    const entry = this.cache.get(slug);
    if (entry && Date.now() < entry.expiresAt) {
      return entry.config;
    }
    const config = await this.fetcher(slug);
    if (config) {
      this.cache.set(slug, { config, expiresAt: Date.now() + this.ttlMs });
    }
    return config;
  }

  invalidate(slug: string): void {
    this.cache.delete(slug);
  }

  invalidateAll(): void {
    this.cache.clear();
  }
}
