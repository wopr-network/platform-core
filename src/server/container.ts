/**
 * PlatformContainer — the central DI container for platform-core.
 *
 * Products compose a container at boot time, enabling only the feature
 * slices they need. Nullable sub-containers (fleet, crypto, stripe,
 * gateway, hotPool) let each product opt in without pulling unused deps.
 */

import type Docker from "dockerode";
import type { Pool } from "pg";
import type Stripe from "stripe";
import type { IUserRoleRepository } from "../auth/user-role-repository.js";
import type { ICryptoChargeRepository } from "../billing/crypto/charge-store.js";
import type { IWebhookSeenRepository } from "../billing/webhook-seen-repository.js";
import type { ILedger } from "../credits/ledger.js";
import type { ITenantCustomerRepository } from "../credits/tenant-customer-repository.js";
import type { DrizzleDb } from "../db/index.js";
import type { FleetManager } from "../fleet/fleet-manager.js";
import type { IProfileStore } from "../fleet/profile-store.js";
import type { IServiceKeyRepository } from "../gateway/service-key-repository.js";
import type { ProductConfig } from "../product-config/repository-types.js";
import type { ProxyManagerInterface } from "../proxy/types.js";
import type { IOrgMemberRepository } from "../tenancy/org-member-repository.js";
import type { OrgService } from "../tenancy/org-service.js";

// ---------------------------------------------------------------------------
// Feature sub-containers
// ---------------------------------------------------------------------------

export interface FleetServices {
  manager: FleetManager;
  docker: Docker;
  proxy: ProxyManagerInterface;
  profileStore: IProfileStore;
  serviceKeyRepo: IServiceKeyRepository;
}

export interface CryptoServices {
  chargeRepo: ICryptoChargeRepository;
  webhookSeenRepo: IWebhookSeenRepository;
}

export interface StripeServices {
  stripe: Stripe;
  webhookSecret: string;
  customerRepo: ITenantCustomerRepository;
  processor: { handleWebhook(payload: Buffer, signature: string): Promise<unknown> };
}

export interface GatewayServices {
  serviceKeyRepo: IServiceKeyRepository;
}

export interface HotPoolServices {
  /** Will be typed properly when extracted from nemoclaw. */
  poolManager: unknown;
}

// ---------------------------------------------------------------------------
// Main container
// ---------------------------------------------------------------------------

export interface PlatformContainer {
  db: DrizzleDb;
  pool: Pool;
  productConfig: ProductConfig;
  creditLedger: ILedger;
  orgMemberRepo: IOrgMemberRepository;
  orgService: OrgService;
  userRoleRepo: IUserRoleRepository;

  /** Null when the product does not use fleet management. */
  fleet: FleetServices | null;
  /** Null when the product does not accept crypto payments. */
  crypto: CryptoServices | null;
  /** Null when the product does not use Stripe billing. */
  stripe: StripeServices | null;
  /** Null when the product does not expose a metered inference gateway. */
  gateway: GatewayServices | null;
  /** Null when the product does not use a hot-pool of pre-provisioned instances. */
  hotPool: HotPoolServices | null;
}
