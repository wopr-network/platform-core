import crypto from "node:crypto";
import { Credit } from "../../credits/credit.js";
import type { ILedger } from "../../credits/ledger.js";
import type { IWebhookSeenRepository } from "../webhook-seen-repository.js";
import type { CryptoChargeRepository } from "./charge-store.js";
import type { CryptoWebhookPayload, CryptoWebhookResult } from "./types.js";

export interface CryptoWebhookDeps {
  chargeStore: CryptoChargeRepository;
  creditLedger: ILedger;
  replayGuard: IWebhookSeenRepository;
  /** Called after credits are purchased — consumer can reactivate suspended resources. Returns reactivated resource IDs. */
  onCreditsPurchased?: (tenantId: string, ledger: ILedger) => Promise<string[]>;
}

/**
 * Verify BTCPay webhook signature (HMAC-SHA256).
 *
 * BTCPay sends the signature in the BTCPAY-SIG header as "sha256=<hex>".
 */
export function verifyCryptoWebhookSignature(rawBody: Buffer | string, sigHeader: string, secret: string): boolean {
  const expectedSig = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  const expected = Buffer.from(expectedSig, "utf8");
  const received = Buffer.from(sigHeader, "utf8");

  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

/**
 * Process a BTCPay Server webhook event.
 *
 * Only credits the ledger on InvoiceSettled status.
 * Uses the BTCPay invoice ID mapped to the stored charge record
 * for tenant resolution and idempotency.
 *
 * CRITICAL: The charge store holds amountUsdCents (USD cents, integer).
 * Credit.fromCents() converts cents → nanodollars for the ledger.
 * Never pass raw cents to the ledger — always go through Credit.fromCents().
 */
export async function handleCryptoWebhook(
  deps: CryptoWebhookDeps,
  payload: CryptoWebhookPayload,
): Promise<CryptoWebhookResult> {
  const { chargeStore, creditLedger } = deps;

  // Map BTCPay event type to a status string for the charge store.
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
      // For overpayments, we still credit the requested amount.
      // charge.amountUsdCents is in USD cents (integer).
      // Credit.fromCents() converts to nanodollars for the ledger.
      const creditCents = charge.amountUsdCents;

      await creditLedger.credit(charge.tenantId, Credit.fromCents(creditCents), "purchase", {
        description: `Crypto credit purchase via BTCPay (invoice: ${payload.invoiceId})`,
        referenceId: `crypto:${payload.invoiceId}`,
        fundingSource: "crypto",
      });

      await chargeStore.markCredited(payload.invoiceId);

      // Reactivate suspended resources after credit purchase.
      let reactivatedBots: string[] | undefined;
      if (deps.onCreditsPurchased) {
        reactivatedBots = await deps.onCreditsPurchased(charge.tenantId, creditLedger);
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

/** Map BTCPay event type string to a CryptoPaymentState. */
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
