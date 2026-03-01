/**
 * AppRouter type stub for wopr-platform.
 *
 * NOTE(WOP-1189): The platform backend is a separate repo (wopr-network/wopr-platform)
 * and @wopr-network/wopr-platform is not published on npm. Using a local `link:`
 * dependency breaks CI (ERR_PNPM_LOCKFILE_CONFIG_MISMATCH — the path doesn't exist
 * on GitHub Actions runners). This stub re-declares the procedures consumed by the UI
 * so the build stays type-safe without a local path dependency.
 *
 * When @wopr-network/sdk is published, replace this file with:
 *   export type { AppRouter } from "@wopr-network/sdk";
 *
 * The real AppRouter type lives at:
 *   wopr-network/wopr-platform/src/trpc/index.ts → `export type AppRouter = typeof appRouter;`
 */
import type {
  AnyTRPCMutationProcedure,
  AnyTRPCQueryProcedure,
  AnyTRPCRootTypes,
  TRPCBuiltRouter,
  TRPCRouterRecord,
} from "@trpc/server";

/**
 * Minimal router record for the procedures this UI consumes.
 * Extend this when adding new tRPC calls. Remove entries when procedures are dropped.
 */
type AppRouterRecord = TRPCRouterRecord & {
  pageContext: {
    update: AnyTRPCMutationProcedure;
  };
  admin: {
    inference: {
      dailyCost: AnyTRPCQueryProcedure;
      pageCost: AnyTRPCQueryProcedure;
      cacheHitRate: AnyTRPCQueryProcedure;
      sessionCost: AnyTRPCQueryProcedure;
    };
    billingHealth: AnyTRPCQueryProcedure;
  };
  promotions: {
    list: AnyTRPCQueryProcedure;
    get: AnyTRPCQueryProcedure;
    create: AnyTRPCMutationProcedure;
    update: AnyTRPCMutationProcedure;
    activate: AnyTRPCMutationProcedure;
    pause: AnyTRPCMutationProcedure;
    cancel: AnyTRPCMutationProcedure;
    generateCouponBatch: AnyTRPCMutationProcedure;
    listRedemptions: AnyTRPCQueryProcedure;
  };
  rateOverrides: {
    list: AnyTRPCQueryProcedure;
    create: AnyTRPCMutationProcedure;
    cancel: AnyTRPCMutationProcedure;
  };
  billing: {
    applyCoupon: AnyTRPCMutationProcedure;
  };
  settings: {
    notificationPreferences: AnyTRPCQueryProcedure;
    updateNotificationPreferences: AnyTRPCMutationProcedure;
  };
  capabilities: {
    storeKey: AnyTRPCMutationProcedure;
    testKey: AnyTRPCMutationProcedure;
    listCapabilitySettings: AnyTRPCQueryProcedure;
    updateCapabilitySettings: AnyTRPCMutationProcedure;
    listCapabilityMeta: AnyTRPCQueryProcedure;
  };
  authSocial: {
    enabledSocialProviders: AnyTRPCQueryProcedure;
  };
};

export type AppRouter = TRPCBuiltRouter<AnyTRPCRootTypes, AppRouterRecord>;
