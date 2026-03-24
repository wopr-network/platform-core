import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { ProductConfigCache } from "../product-config/index.js";
import type { IProductConfigRepository } from "../product-config/repository-types.js";
import { toBrandConfig } from "../product-config/repository-types.js";
import { adminProcedure, publicProcedure, router } from "./init.js";

export function createProductConfigRouter(
  getRepo: () => IProductConfigRepository,
  getCache: () => ProductConfigCache,
  productSlug: string,
) {
  /** Resolve product id, throwing NOT_FOUND if the product doesn't exist. */
  async function resolveProductId(): Promise<string> {
    const config = await getRepo().getBySlug(productSlug);
    if (!config) {
      throw new TRPCError({ code: "NOT_FOUND", message: `Product not found: ${productSlug}` });
    }
    return config.product.id;
  }

  return router({
    // -----------------------------------------------------------------------
    // Public endpoints
    // -----------------------------------------------------------------------

    /** Returns brand config for the current product (used by UI). */
    getBrandConfig: publicProcedure.query(async () => {
      const config = await getCache().get(productSlug);
      if (!config) return null;
      return toBrandConfig(config);
    }),

    /** Returns enabled nav items for the current product. */
    getNavItems: publicProcedure.query(async () => {
      const config = await getCache().get(productSlug);
      if (!config) return [];
      return config.navItems.filter((n) => n.enabled).map((n) => ({ label: n.label, href: n.href }));
    }),

    // -----------------------------------------------------------------------
    // Admin endpoints
    // -----------------------------------------------------------------------

    admin: router({
      /** Get full product config. */
      get: adminProcedure.query(async () => {
        return getRepo().getBySlug(productSlug);
      }),

      /** List all product configs. */
      listAll: adminProcedure.query(async () => {
        return getRepo().listAll();
      }),

      /** Update brand fields. */
      updateBrand: adminProcedure
        .input(
          z.object({
            brandName: z.string().min(1).optional(),
            productName: z.string().min(1).optional(),
            tagline: z.string().optional(),
            domain: z.string().min(1).optional(),
            appDomain: z.string().min(1).optional(),
            cookieDomain: z.string().optional(),
            companyLegal: z.string().optional(),
            priceLabel: z.string().optional(),
            defaultImage: z.string().optional(),
            emailSupport: z.string().email().optional(),
            emailPrivacy: z.string().email().optional(),
            emailLegal: z.string().email().optional(),
            fromEmail: z.string().email().optional(),
            homePath: z.string().optional(),
            storagePrefix: z.string().min(1).optional(),
          }),
        )
        .mutation(async ({ input }) => {
          await getRepo().upsertProduct(productSlug, input);
          getCache().invalidate(productSlug);
        }),

      /** Replace nav items. */
      updateNavItems: adminProcedure
        .input(
          z.array(
            z.object({
              label: z.string().min(1),
              href: z.string().min(1),
              icon: z.string().optional(),
              sortOrder: z.number().int().min(0),
              requiresRole: z.string().optional(),
              enabled: z.boolean().optional(),
            }),
          ),
        )
        .mutation(async ({ input }) => {
          const productId = await resolveProductId();
          await getRepo().replaceNavItems(productId, input);
          getCache().invalidate(productSlug);
        }),

      /** Update feature flags. */
      updateFeatures: adminProcedure
        .input(
          z.object({
            chatEnabled: z.boolean().optional(),
            onboardingEnabled: z.boolean().optional(),
            onboardingDefaultModel: z.string().optional(),
            onboardingSystemPrompt: z.string().optional(),
            onboardingMaxCredits: z.number().int().min(0).optional(),
            onboardingWelcomeMsg: z.string().optional(),
            sharedModuleBilling: z.boolean().optional(),
            sharedModuleMonitoring: z.boolean().optional(),
            sharedModuleAnalytics: z.boolean().optional(),
          }),
        )
        .mutation(async ({ input }) => {
          const productId = await resolveProductId();
          await getRepo().upsertFeatures(productId, input);
          getCache().invalidate(productSlug);
        }),

      /** Update fleet config. */
      updateFleet: adminProcedure
        .input(
          z.object({
            containerImage: z.string().optional(),
            containerPort: z.number().int().optional(),
            lifecycle: z.enum(["managed", "ephemeral"]).optional(),
            billingModel: z.enum(["monthly", "per_use", "none"]).optional(),
            maxInstances: z.number().int().min(1).optional(),
            imageAllowlist: z.array(z.string()).optional(),
            dockerNetwork: z.string().optional(),
            placementStrategy: z.string().optional(),
            fleetDataDir: z.string().optional(),
          }),
        )
        .mutation(async ({ input }) => {
          const productId = await resolveProductId();
          await getRepo().upsertFleetConfig(productId, input);
          getCache().invalidate(productSlug);
        }),

      /** Update billing config. */
      updateBilling: adminProcedure
        .input(
          z.object({
            stripePublishableKey: z.string().optional(),
            stripeSecretKey: z.string().optional(),
            stripeWebhookSecret: z.string().optional(),
            creditPrices: z.record(z.string(), z.number()).optional(),
            affiliateBaseUrl: z.string().url().optional().or(z.literal("")),
            affiliateMatchRate: z.number().min(0).optional(),
            affiliateMaxCap: z.number().int().min(0).optional(),
            dividendRate: z.number().min(0).optional(),
            marginConfig: z.unknown().optional(),
          }),
        )
        .mutation(async ({ input }) => {
          const productId = await resolveProductId();
          await getRepo().upsertBillingConfig(productId, input);
          getCache().invalidate(productSlug);
        }),
    }),
  });
}
