/**
 * AppRouter type from wopr-platform.
 *
 * The platform backend is a separate repo (wopr-network/wopr-platform).
 * This type will eventually be published via @wopr-network/sdk and imported from there.
 *
 * For local development with full type safety, run:
 *   cd ../wopr-platform && pnpm build && cd ../wopr-platform-ui && pnpm link ../wopr-platform
 * Then switch to:
 *   export type { AppRouter } from "@wopr-network/wopr-platform/dist/trpc/index.js";
 *
 * TODO: WOP-1189 — import from @wopr-network/sdk and delete this stub
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
 * Replacing this with the real router record from @wopr-network/sdk adds full autocomplete.
 * TODO: WOP-1189 — import from @wopr-network/sdk and delete this stub
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
};

export type AppRouter = TRPCBuiltRouter<AnyTRPCRootTypes, AppRouterRecord>;
