import crypto from "node:crypto";
import { Credit } from "../../credits/credit.js";
import type { ICryptoChargeRepository } from "./charge-store.js";
import type { BTCPayClient } from "./client.js";
import type { CryptoCheckoutOpts } from "./types.js";

/** Minimum payment amount in USD. */
export const MIN_PAYMENT_USD = 10;

/**
 * Create a BTCPay invoice and store the charge record.
 *
 * Returns the BTCPay-hosted checkout page URL and invoice ID.
 * The user is redirected to checkoutLink to complete the crypto payment.
 *
 * NOTE: amountUsd is converted to cents (integer) for the charge store.
 * The charge store holds USD cents, NOT nanodollars.
 */
export async function createCryptoCheckout(
  client: BTCPayClient,
  chargeStore: ICryptoChargeRepository,
  opts: CryptoCheckoutOpts,
): Promise<{ referenceId: string; url: string }> {
  if (opts.amountUsd < MIN_PAYMENT_USD) {
    throw new Error(`Minimum payment amount is $${MIN_PAYMENT_USD}`);
  }

  const orderId = `crypto:${opts.tenant}:${crypto.randomUUID()}`;

  const invoice = await client.createInvoice({
    amountUsd: opts.amountUsd,
    orderId,
    buyerEmail: `${opts.tenant}@${process.env.PLATFORM_DOMAIN ?? "wopr.bot"}`,
  });

  // Store the charge record for webhook correlation.
  // amountUsdCents = USD * 100 (cents, NOT nanodollars).
  // Credit.fromDollars() handles the float → integer boundary safely via Math.round
  // on the nanodollar scale, then toCentsRounded() converts back to integer cents.
  // This avoids direct floating-point multiplication for the cents conversion.
  const amountUsdCents = Credit.fromDollars(opts.amountUsd).toCentsRounded();
  await chargeStore.create(invoice.id, opts.tenant, amountUsdCents);

  return {
    referenceId: invoice.id,
    url: invoice.checkoutLink,
  };
}
