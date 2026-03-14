import crypto from "node:crypto";
import { Credit } from "../../credits/credit.js";
import type { ILedger } from "../../credits/ledger.js";
import type { IWebhookSeenRepository } from "../webhook-seen-repository.js";
import type { ICryptoChargeRepository } from "./charge-store.js";
import type { CryptoWebhookPayload, CryptoWebhookResult } from "./types.js";
import { mapBtcPayEventToStatus } from "./types.js";

export interface CryptoWebhookDeps {
  chargeStore: ICryptoChargeRepository;
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
export function verifyCryptoWebhookSignature(
  rawBody: Buffer | string,
  sigHeader: string | undefined,
  secret: string,
): boolean {
  if (!sigHeader) return false;
  const expectedSig = `sha256=${crypto.createHmac("sha256", secret).update(rawBody).digest("hex")}`;

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
 * Idempotency strategy (matches Stripe webhook pattern):
 *   Primary: `creditLedger.hasReferenceId("crypto:<invoiceId>")` — atomic,
 *   checked inside the ledger's serialized transaction.
 *   Secondary: `chargeStore.markCredited()` — advisory flag for queries.
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

  // Replay guard FIRST: deduplicate by invoiceId + event type.
  // Must run before mapBtcPayEventToStatus() — unknown event types throw,
  // and BTCPay retries webhooks on failure. Without this ordering, an unknown
  // event type causes an infinite retry loop.
  const dedupeKey = `${payload.invoiceId}:${payload.type}`;
  if (await deps.replayGuard.isDuplicate(dedupeKey, "crypto")) {
    return { handled: true, status: "New", duplicate: true };
  }

  // Map BTCPay event type to a CryptoPaymentState (throws on unknown types).
  const status = mapBtcPayEventToStatus(payload.type);

  // Look up the charge record to find the tenant.
  const charge = await chargeStore.getByReferenceId(payload.invoiceId);
  if (!charge) {
    return { handled: false, status };
  }

  // Update charge status regardless of event type.
  await chargeStore.updateStatus(payload.invoiceId, status);

  let result: CryptoWebhookResult;

  if (payload.type === "InvoiceSettled") {
    // Idempotency: use ledger referenceId check (same pattern as Stripe webhook).
    // This is atomic — the referenceId is checked inside the ledger's serialized
    // transaction, eliminating the TOCTOU race of isCredited() + creditLedger().
    const creditRef = `crypto:${payload.invoiceId}`;
    if (await creditLedger.hasReferenceId(creditRef)) {
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
        referenceId: creditRef,
        fundingSource: "crypto",
      });

      // Mark credited (advisory — primary idempotency is the ledger referenceId above).
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
