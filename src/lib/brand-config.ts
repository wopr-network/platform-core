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

  /** Primary domain (e.g. "wopr.bot", "runpaperclip.com") */
  domain: string;

  /** App subdomain (e.g. "app.wopr.bot", "app.runpaperclip.com") */
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

  /** Prefix for container env vars (e.g. "WOPR" → WOPR_LLM_MODEL) */
  envVarPrefix: string;

  /** Prefix for WebMCP tool names (e.g. "wopr" → wopr_list_instances) */
  toolPrefix: string;

  /** Cookie name for tenant ID */
  tenantCookieName: string;

  /** Company legal name for legal pages */
  companyLegalName: string;

  /** Base pricing display string (e.g. "$5/month") */
  price: string;

  /**
   * Post-auth redirect path (default "/marketplace").
   *
   * The Next.js middleware reads this from NEXT_PUBLIC_BRAND_HOME_PATH
   * at build time. setBrandConfig({ homePath }) only affects client-side
   * redirects. Brand shells must set the env var AND call setBrandConfig
   * to keep both paths in sync.
   */
  homePath: string;

  /** Sidebar navigation items. Each has a label and href. */
  navItems: Array<{ label: string; href: string }>;
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
    envVarPrefix: env("NEXT_PUBLIC_BRAND_ENV_PREFIX") || storagePrefix.toUpperCase(),
    toolPrefix: env("NEXT_PUBLIC_BRAND_TOOL_PREFIX") || storagePrefix,
    tenantCookieName: env("NEXT_PUBLIC_BRAND_TENANT_COOKIE") || `${storagePrefix}_tenant_id`,
    companyLegalName: env("NEXT_PUBLIC_BRAND_COMPANY_LEGAL") || "Platform Inc.",
    price: env("NEXT_PUBLIC_BRAND_PRICE"),
    homePath: env("NEXT_PUBLIC_BRAND_HOME_PATH") || "/marketplace",
    navItems: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Chat", href: "/chat" },
      { label: "Marketplace", href: "/marketplace" },
      { label: "Channels", href: "/channels" },
      { label: "Plugins", href: "/plugins" },
      { label: "Instances", href: "/instances" },
      { label: "Changesets", href: "/changesets" },
      { label: "Network", href: "/dashboard/network" },
      { label: "Fleet Health", href: "/fleet/health" },
      { label: "Credits", href: "/billing/credits" },
      { label: "Billing", href: "/billing/plans" },
      { label: "Settings", href: "/settings/profile" },
      { label: "Admin", href: "/admin/tenants" },
    ],
  };
}

let _config: BrandConfig = envDefaults();

/**
 * Set the brand configuration. Call once at app startup
 * (typically in the root layout or _app).
 *
 * If `storagePrefix` is overridden, derived fields (`envVarPrefix`,
 * `toolPrefix`, `eventPrefix`, `tenantCookieName`) are re-computed
 * from the new prefix unless explicitly provided.
 */
export function setBrandConfig(config: Partial<BrandConfig>): void {
  const base = { ...envDefaults(), ...config };
  // Re-derive prefix-dependent fields when storagePrefix is overridden
  // but the dependent fields were not explicitly provided.
  if (config.storagePrefix) {
    const sp = config.storagePrefix;
    if (!config.envVarPrefix) base.envVarPrefix = sp.toUpperCase();
    if (!config.toolPrefix) base.toolPrefix = sp;
    if (!config.eventPrefix) base.eventPrefix = sp;
    if (!config.tenantCookieName) base.tenantCookieName = `${sp}_tenant_id`;
  }
  _config = base;
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

/** Construct a brand-aware environment variable key (e.g. envKey("LLM_MODEL") → "WOPR_LLM_MODEL"). */
export function envKey(suffix: string): string {
  return `${_config.envVarPrefix}_${suffix}`;
}
