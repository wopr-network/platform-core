import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { IPaymentProcessor } from "../billing/payment-processor.js";
import type { IAutoTopupSettingsRepository } from "../credits/auto-topup-settings-repository.js";
import { orgAdminProcedure, router } from "./init.js";

export interface OrgRemovePaymentMethodDeps {
  processor: IPaymentProcessor;
  autoTopupSettingsStore?: IAutoTopupSettingsRepository;
}

export function createOrgRemovePaymentMethodRouter(getDeps: () => OrgRemovePaymentMethodDeps) {
  return router({
    orgRemovePaymentMethod: orgAdminProcedure
      .input(
        z.object({
          orgId: z.string().min(1),
          paymentMethodId: z.string().min(1),
        }),
      )
      .mutation(async ({ input }) => {
        const { processor, autoTopupSettingsStore } = getDeps();
        const { PaymentMethodOwnershipError } = await import("../billing/payment-processor.js");

        // Guard: prevent removing the last payment method when auto-topup is enabled
        if (autoTopupSettingsStore) {
          const methods = await processor.listPaymentMethods(input.orgId);
          if (methods.length <= 1) {
            const settings = await autoTopupSettingsStore.getByTenant(input.orgId);
            if (settings && (settings.usageEnabled || settings.scheduleEnabled)) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: "Cannot remove last payment method while auto-topup is enabled. Disable auto-topup first.",
              });
            }
          }
        }

        try {
          await processor.detachPaymentMethod(input.orgId, input.paymentMethodId);
          return { removed: true };
        } catch (err) {
          if (err instanceof PaymentMethodOwnershipError) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Payment method does not belong to this organization",
            });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to remove payment method. Please try again.",
          });
        }
      }),
  });
}
