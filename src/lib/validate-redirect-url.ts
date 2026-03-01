/** Origins that are allowed as redirect targets from backend checkout responses. */
export const ALLOWED_REDIRECT_ORIGINS: ReadonlySet<string> = new Set([
  "https://checkout.stripe.com",
  "https://billing.stripe.com",
  "https://commerce.coinbase.com",
  "https://pay.coinbase.com",
  "https://payram.io",
  "https://app.payram.io",
]);

/**
 * Returns true if `url` is safe to navigate to.
 * Allowed: same-origin, or origin is in ALLOWED_REDIRECT_ORIGINS.
 * Rejects: non-http(s) schemes, relative URLs that could be abused, unknown origins.
 */
export function isAllowedRedirectUrl(url: string): boolean {
  if (!url) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(url, window.location.origin);
  } catch {
    return false;
  }

  // Only http(s) schemes
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return false;
  }

  // Same-origin is always allowed
  if (parsed.origin === window.location.origin) {
    return true;
  }

  return ALLOWED_REDIRECT_ORIGINS.has(parsed.origin);
}
