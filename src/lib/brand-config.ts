/**
 * Brand Configuration — the shape every brand deployment must provide.
 *
 * platform-ui-core is brand-agnostic. All product names, domains,
 * copy, and visual identity come from the brand config set at boot.
 * Consumers (wopr-platform-ui, paperclip-dashboard, etc.) call
 * `setBrandConfig()` in their root layout before anything renders.
 */

export interface BrandConfig {
  /** Product name shown to users (e.g. "WOPR Bot", "Paperclip") */
  productName: string;

  /** Short brand identifier (e.g. "WOPR", "Paperclip") */
  brandName: string;

  /** Primary domain (e.g. "wopr.bot", "runpaperclip.ai") */
  domain: string;

  /** App subdomain (e.g. "app.wopr.bot", "app.runpaperclip.ai") */
  appDomain: string;

  /** One-line tagline */
  tagline: string;

  /** Contact emails */
  emails: {
    privacy: string;
    legal: string;
    support: string;
  };

  /** Default container image for new instances */
  defaultImage: string;

  /** Prefix for local storage keys (e.g. "wopr", "paperclip") */
  storagePrefix: string;

  /** Prefix for custom DOM events (e.g. "wopr", "paperclip") */
  eventPrefix: string;

  /** Cookie name for tenant ID */
  tenantCookieName: string;

  /** Company legal name for legal pages */
  companyLegalName: string;

  /** Base pricing display string (e.g. "$5/month") */
  price: string;
}

/**
 * Build default config from NEXT_PUBLIC_BRAND_* env vars, falling
 * back to generic "Platform" values. Each brand deployment sets
 * its env vars in .env (or .env.local) and the config picks them up
 * at build time — no code changes required.
 */
function envDefaults(): BrandConfig {
  const env = (key: string) =>
    (typeof process !== "undefined" ? process.env?.[key] : undefined) ?? "";
  const productName = env("NEXT_PUBLIC_BRAND_PRODUCT_NAME") || "Platform";
  const brandName = env("NEXT_PUBLIC_BRAND_NAME") || "Platform";
  const storagePrefix = env("NEXT_PUBLIC_BRAND_STORAGE_PREFIX") || "platform";
  const eventPrefix = env("NEXT_PUBLIC_BRAND_EVENT_PREFIX") || storagePrefix;
  return {
    productName,
    brandName,
    domain: env("NEXT_PUBLIC_BRAND_DOMAIN") || "localhost",
    appDomain: env("NEXT_PUBLIC_BRAND_APP_DOMAIN") || "localhost:3000",
    tagline: env("NEXT_PUBLIC_BRAND_TAGLINE") || "Your platform, your rules.",
    emails: {
      privacy: env("NEXT_PUBLIC_BRAND_EMAIL_PRIVACY") || "privacy@example.com",
      legal: env("NEXT_PUBLIC_BRAND_EMAIL_LEGAL") || "legal@example.com",
      support: env("NEXT_PUBLIC_BRAND_EMAIL_SUPPORT") || "support@example.com",
    },
    defaultImage: env("NEXT_PUBLIC_BRAND_DEFAULT_IMAGE"),
    storagePrefix,
    eventPrefix,
    tenantCookieName:
      env("NEXT_PUBLIC_BRAND_TENANT_COOKIE") || `${storagePrefix}_tenant_id`,
    companyLegalName:
      env("NEXT_PUBLIC_BRAND_COMPANY_LEGAL") || "Platform Inc.",
    price: env("NEXT_PUBLIC_BRAND_PRICE"),
  };
}

let _config: BrandConfig = envDefaults();

/**
 * Set the brand configuration. Call once at app startup
 * (typically in the root layout or _app).
 */
export function setBrandConfig(config: Partial<BrandConfig>): void {
  _config = { ...envDefaults(), ...config };
}

/** Get the current brand configuration. */
export function getBrandConfig(): BrandConfig {
  return _config;
}

/** Shorthand — get brand name. */
export function brandName(): string {
  return _config.brandName;
}

/** Shorthand — get product name. */
export function productName(): string {
  return _config.productName;
}

/** Build a storage key with the brand prefix. */
export function storageKey(key: string): string {
  return `${_config.storagePrefix}-${key}`;
}

/** Build a custom event name with the brand prefix. */
export function eventName(event: string): string {
  return `${_config.eventPrefix}-${event}`;
}
