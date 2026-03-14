import type {
  CryptoChargeRepository,
  CryptoWebhookPayload,
  CryptoWebhookResult,
  IWebhookSeenRepository,
} from "@wopr-network/platform-core/billing";
import type { ILedger } from "@wopr-network/platform-core/credits";
import { Credit } from "@wopr-network/platform-core/credits";
import type { BotBilling } from "../credits/bot-billing.js";

export interface CryptoWebhookDeps {
  chargeStore: CryptoChargeRepository;
  creditLedger: ILedger;
  botBilling?: BotBilling;
  replayGuard: IWebhookSeenRepository;
}

/**
 * Process a BTCPay Server webhook event (WOPR-specific version).
 *
 * Only credits the ledger on InvoiceSettled.
 * Uses botBilling.checkReactivation for WOPR bot suspension recovery.
 *
 * CRITICAL: charge.amountUsdCents is in USD cents (integer).
 * Credit.fromCents() converts cents → nanodollars for the ledger.
 */
export async function handleCryptoWebhook(
  deps: CryptoWebhookDeps,
  payload: CryptoWebhookPayload,
): Promise<CryptoWebhookResult> {
  const { chargeStore, creditLedger } = deps;

  const status = mapEventTypeToStatus(payload.type);

  // Replay guard: deduplicate by invoiceId + event type.
  const dedupeKey = `${payload.invoiceId}:${payload.type}`;
  if (await deps.replayGuard.isDuplicate(dedupeKey, "crypto")) {
    return { handled: true, status, duplicate: true };
  }

  // Look up the charge record to find the tenant.
  const charge = await chargeStore.getByReferenceId(payload.invoiceId);
  if (!charge) {
    return { handled: false, status };
  }

  // Update charge status regardless of event type.
  await chargeStore.updateStatus(payload.invoiceId, status as "New" | "Processing" | "Expired" | "Invalid" | "Settled");

  let result: CryptoWebhookResult;

  if (payload.type === "InvoiceSettled") {
    // Idempotency: skip if already credited.
    if (await chargeStore.isCredited(payload.invoiceId)) {
      result = {
        handled: true,
        status,
        tenant: charge.tenantId,
        creditedCents: 0,
      };
    } else {
      // Credit the original USD amount requested (not the crypto amount).
      // charge.amountUsdCents is in USD cents (integer).
      // Credit.fromCents() converts to nanodollars for the ledger.
      const creditCents = charge.amountUsdCents;

      await creditLedger.credit(charge.tenantId, Credit.fromCents(creditCents), "purchase", {
        description: `Crypto credit purchase via BTCPay (invoice: ${payload.invoiceId})`,
        referenceId: `crypto:${payload.invoiceId}`,
        fundingSource: "crypto",
      });

      await chargeStore.markCredited(payload.invoiceId);

      // Reactivate suspended bots (same as Stripe webhook).
      let reactivatedBots: string[] | undefined;
      if (deps.botBilling) {
        reactivatedBots = await deps.botBilling.checkReactivation(charge.tenantId, creditLedger);
        if (reactivatedBots.length === 0) reactivatedBots = undefined;
      }

      result = {
        handled: true,
        status,
        tenant: charge.tenantId,
        creditedCents: creditCents,
        reactivatedBots,
      };
    }
  } else {
    // New, Processing, Expired, Invalid — just track status.
    result = {
      handled: true,
      status,
      tenant: charge.tenantId,
    };
  }

  await deps.replayGuard.markSeen(dedupeKey, "crypto");
  return result;
}

function mapEventTypeToStatus(eventType: string): string {
  switch (eventType) {
    case "InvoiceCreated":
      return "New";
    case "InvoiceReceivedPayment":
    case "InvoiceProcessing":
      return "Processing";
    case "InvoiceSettled":
    case "InvoicePaymentSettled":
      return "Settled";
    case "InvoiceExpired":
      return "Expired";
    case "InvoiceInvalid":
      return "Invalid";
    default:
      return eventType;
  }
}
