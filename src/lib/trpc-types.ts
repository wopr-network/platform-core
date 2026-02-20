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
import type { AnyTRPCRootTypes, TRPCBuiltRouter } from "@trpc/server";

/**
 * Empty placeholder router — satisfies tRPC's type constraints with no procedures.
 * Replacing `Record<never, never>` with the real router record adds autocomplete
 * once @wopr-network/sdk ships.
 */
export type AppRouter = TRPCBuiltRouter<AnyTRPCRootTypes, Record<never, never>>;
