// Database
export type { PlatformDb, PlatformSchema } from "./db/index.js";
export { createDb, schema } from "./db/index.js";

// Admin
export * from "./admin/index.js";

// Auth
export * from "./auth/index.js";

// Billing (selective — ITenantCustomerRepository/TenantCustomerRow also in credits)
export {
  PaymentMethodOwnershipError,
  noOpReplayGuard,
  DrizzleWebhookSeenRepository,
  type SavedPaymentMethod,
  type CheckoutOpts,
  type CheckoutSession,
  type ChargeOpts,
  type ChargeResult,
  type SetupResult,
  type PortalOpts,
  type WebhookResult,
  type IPaymentProcessor,
  type Invoice,
  type IWebhookSeenRepository,
} from "./billing/index.js";

// Config
export { config, billingConfigSchema, type PlatformConfig } from "./config/index.js";

// Credits
export * from "./credits/index.js";

// Email
export * from "./email/index.js";

// Metering
export * from "./metering/index.js";

// Middleware
export * from "./middleware/index.js";

// Security
export * from "./security/index.js";

// Tenancy
export * from "./tenancy/index.js";

// tRPC
export * from "./trpc/index.js";
