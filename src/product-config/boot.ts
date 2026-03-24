import type { DrizzleDb } from "../db/index.js";
import { DrizzleProductConfigRepository } from "./drizzle-product-config-repository.js";
import type { ProductConfig } from "./repository-types.js";
import { deriveCorsOrigins } from "./repository-types.js";
import { ProductConfigService } from "./service.js";

export interface PlatformBootResult {
  /** The product config service — single point of access for config reads/writes. */
  service: ProductConfigService;
  /** The resolved product config (cached). */
  config: ProductConfig;
  /** CORS origins derived from product domains + optional dev origins. */
  corsOrigins: string[];
}

export interface PlatformBootOptions {
  /** Product slug (e.g. "paperclip", "wopr", "holyship", "nemoclaw"). */
  slug: string;
  /** Drizzle database instance. */
  db: DrizzleDb;
  /** Additional CORS origins for local dev (from DEV_ORIGINS env var). */
  devOrigins?: string[];
}

/**
 * Bootstrap product configuration from DB.
 *
 * Call once at startup, after DB + migrations, before route registration.
 * Returns the service (for tRPC router wiring) and the resolved config
 * (for CORS, email, fleet, auth initialization).
 *
 * This replaces: BRAND_NAME, PLATFORM_DOMAIN, UI_ORIGIN, FROM_EMAIL,
 * SUPPORT_EMAIL, COOKIE_DOMAIN, APP_BASE_URL, and all other product-
 * specific env vars that platform-core modules previously read from
 * process.env.
 *
 * Product backends still own their specific wiring (crypto watchers,
 * fleet updaters, notification pipelines). platformBoot handles the
 * config-driven parts that are identical across products.
 */
export async function platformBoot(opts: PlatformBootOptions): Promise<PlatformBootResult> {
  const { slug, db, devOrigins = [] } = opts;

  const repo = new DrizzleProductConfigRepository(db);
  const service = new ProductConfigService(repo);

  const config = await service.getBySlug(slug);
  if (!config) {
    throw new Error(
      `Product "${slug}" not found in database. Run the seed script: DATABASE_URL=... npx tsx scripts/seed-products.ts`,
    );
  }

  const corsOrigins = [...deriveCorsOrigins(config.product, config.domains), ...devOrigins];

  return { service, config, corsOrigins };
}
