/**
 * Convert USD cents to native token amount using a price in cents.
 *
 * Formula: rawAmount = amountCents × 10^decimals / priceCents
 *
 * Examples:
 *   $50 in ETH at $3,500:  centsToNative(5000, 350000, 18) = 14285714285714285n (≈0.01429 ETH)
 *   $50 in BTC at $65,000: centsToNative(5000, 6500000, 8)  = 76923n (76,923 sats ≈ 0.00077 BTC)
 *
 * Integer math only. No floating point.
 */
export function centsToNative(amountCents: number, priceCents: number, decimals: number): bigint {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error(`amountCents must be a positive integer, got ${amountCents}`);
  }
  if (!Number.isInteger(priceCents) || priceCents <= 0) {
    throw new Error(`priceCents must be a positive integer, got ${priceCents}`);
  }
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new Error(`decimals must be a non-negative integer, got ${decimals}`);
  }
  return (BigInt(amountCents) * 10n ** BigInt(decimals)) / BigInt(priceCents);
}

/**
 * Convert native token amount back to USD cents using a price in cents.
 *
 * Inverse of centsToNative. Truncates fractional cents.
 *
 * Integer math only.
 */
export function nativeToCents(rawAmount: bigint, priceCents: number, decimals: number): number {
  if (rawAmount < 0n) throw new Error("rawAmount must be non-negative");
  if (!Number.isInteger(priceCents) || priceCents <= 0) {
    throw new Error(`priceCents must be a positive integer, got ${priceCents}`);
  }
  return Number((rawAmount * BigInt(priceCents)) / 10n ** BigInt(decimals));
}
