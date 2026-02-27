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
 * TODO: import from @wopr-network/sdk once published
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
 * TODO: import from @wopr-network/sdk once published
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
};

export type AppRouter = TRPCBuiltRouter<AnyTRPCRootTypes, AppRouterRecord>;
