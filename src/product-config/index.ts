import type { DrizzleDb } from "../db/index.js";
import { ProductConfigCache } from "./cache.js";
import { DrizzleProductConfigRepository } from "./drizzle-product-config-repository.js";
import type { IProductConfigRepository, ProductBrandConfig, ProductConfig } from "./repository-types.js";
import { toBrandConfig } from "./repository-types.js";

export { ProductConfigCache } from "./cache.js";
export { DrizzleProductConfigRepository } from "./drizzle-product-config-repository.js";
// Re-exports for consumers
export type {
  FleetBillingModel,
  FleetLifecycle,
  IProductConfigRepository,
  Product,
  ProductBillingConfig,
  ProductBrandConfig,
  ProductConfig,
  ProductDomain,
  ProductFeatures,
  ProductFleetConfig,
  ProductNavItem,
} from "./repository-types.js";
export { deriveCorsOrigins, toBrandConfig } from "./repository-types.js";

let _repo: IProductConfigRepository | null = null;
let _cache: ProductConfigCache | null = null;

/** Initialize the product config system. Call once at startup. */
export function initProductConfig(db: DrizzleDb): void {
  _repo = new DrizzleProductConfigRepository(db);
  _cache = new ProductConfigCache((slug) => _repo?.getBySlug(slug) ?? Promise.resolve(null));
}

/** Initialize with a custom repository (for testing or alternative backends). */
export function initProductConfigWithRepo(repo: IProductConfigRepository): void {
  _repo = repo;
  _cache = new ProductConfigCache((slug) => _repo?.getBySlug(slug) ?? Promise.resolve(null));
}

/** Get full product config by slug. Cached. */
export async function getProductConfig(slug: string): Promise<ProductConfig | null> {
  if (!_cache) throw new Error("Product config not initialized. Call initProductConfig() first.");
  return _cache.get(slug);
}

/** Get brand config formatted for UI consumption. */
export async function getProductBrand(slug: string): Promise<ProductBrandConfig | null> {
  const config = await getProductConfig(slug);
  if (!config) return null;
  return toBrandConfig(config);
}

/** Get the repository for admin mutations. */
export function getProductConfigRepo(): IProductConfigRepository {
  if (!_repo) throw new Error("Product config not initialized.");
  return _repo;
}

/** Invalidate cache for a product (call after admin mutations). */
export function invalidateProductConfig(slug: string): void {
  _cache?.invalidate(slug);
}

/** Invalidate all cached product configs. */
export function invalidateAllProductConfigs(): void {
  _cache?.invalidateAll();
}
