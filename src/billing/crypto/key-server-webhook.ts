/**
 * Key Server webhook handler — processes payment confirmations from the
 * centralized crypto key server.
 *
 * Payload shape (from watcher-service.ts):
 * {
 *   chargeId: "btc:bc1q...",
 *   chain: "bitcoin",
 *   address: "bc1q...",
 *   amountUsdCents: 5000,
 *   status: "confirmed",
 *   txHash: "abc123...",
 *   amountReceived: "50000 sats",
 *   confirmations: 6
 * }
 *
 * Replaces handleCryptoWebhook() for products using the key server.
 */
import { Credit } from "../../credits/credit.js";
import type { ILedger } from "../../credits/ledger.js";
import type { IWebhookSeenRepository } from "../webhook-seen-repository.js";
import type { ICryptoChargeRepository } from "./charge-store.js";

export interface KeyServerWebhookPayload {
  chargeId: string;
  chain: string;
  address: string;
  amountUsdCents: number;
  status: string;
  txHash?: string;
  amountReceived?: string;
  confirmations?: number;
}

export interface KeyServerWebhookDeps {
  chargeStore: ICryptoChargeRepository;
  creditLedger: ILedger;
  replayGuard: IWebhookSeenRepository;
  onCreditsPurchased?: (tenantId: string, ledger: ILedger) => Promise<string[]>;
}

export interface KeyServerWebhookResult {
  handled: boolean;
  duplicate?: boolean;
  tenant?: string;
  creditedCents?: number;
  reactivatedBots?: string[];
}

/**
 * Process a payment confirmation from the crypto key server.
 *
 * Credits the ledger when status is "confirmed".
 * Idempotency: ledger referenceId + replay guard (same pattern as Stripe handler).
 */
export async function handleKeyServerWebhook(
  deps: KeyServerWebhookDeps,
  payload: KeyServerWebhookPayload,
): Promise<KeyServerWebhookResult> {
  const { chargeStore, creditLedger } = deps;

  // Replay guard: deduplicate by chargeId
  const dedupeKey = `ks:${payload.chargeId}`;
  if (await deps.replayGuard.isDuplicate(dedupeKey, "crypto")) {
    return { handled: true, duplicate: true };
  }

  // Look up the charge to find the tenant + amount
  const charge = await chargeStore.getByReferenceId(payload.chargeId);
  if (!charge) {
    return { handled: false };
  }

  if (payload.status === "confirmed") {
    // Only settle when payment is confirmed
    await chargeStore.updateStatus(payload.chargeId, "Settled", charge.token ?? undefined, payload.amountReceived);

    // Idempotency: check ledger referenceId (atomic, same as BTCPay handler)
    const creditRef = `crypto:${payload.chargeId}`;
    if (await creditLedger.hasReferenceId(creditRef)) {
      await deps.replayGuard.markSeen(dedupeKey, "crypto");
      return { handled: true, duplicate: true, tenant: charge.tenantId };
    }

    // Credit the original USD amount requested.
    // charge.amountUsdCents is integer cents. Credit.fromCents() → nanodollars.
    await creditLedger.credit(charge.tenantId, Credit.fromCents(charge.amountUsdCents), "purchase", {
      description: `Crypto payment confirmed (${payload.chain}, tx: ${payload.txHash ?? "unknown"})`,
      referenceId: creditRef,
      fundingSource: "crypto",
    });

    await chargeStore.markCredited(payload.chargeId);

    let reactivatedBots: string[] | undefined;
    if (deps.onCreditsPurchased) {
      reactivatedBots = await deps.onCreditsPurchased(charge.tenantId, creditLedger);
      if (reactivatedBots.length === 0) reactivatedBots = undefined;
    }

    await deps.replayGuard.markSeen(dedupeKey, "crypto");
    return {
      handled: true,
      tenant: charge.tenantId,
      creditedCents: charge.amountUsdCents,
      reactivatedBots,
    };
  }

  // Non-confirmed status — update status but don't settle or credit
  await chargeStore.updateStatus(
    payload.chargeId,
    payload.status as "Processing",
    charge.token ?? undefined,
    payload.amountReceived,
  );
  await deps.replayGuard.markSeen(dedupeKey, "crypto");
  return { handled: true, tenant: charge.tenantId };
}
