/**
 * Centralized API base URL configuration.
 *
 * Set NEXT_PUBLIC_API_URL to the platform root (e.g. "http://localhost:3001").
 * All API clients derive their paths from this single value.
 *
 * In production runtime, validates that the URL is a public HTTPS endpoint.
 * This prevents internal Docker hostnames from leaking into the browser bundle.
 */

const INTERNAL_HOSTNAME_RE =
  /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|.*\.local$)/i;

function isInternalHostname(hostname: string): boolean {
  return INTERNAL_HOSTNAME_RE.test(hostname) || !hostname.includes(".");
}

function validateProductionApiUrl(url: string | undefined): void {
  const isProductionRuntime =
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NEXT_PHASE !== "phase-production-build" &&
    !process.env.PLAYWRIGHT_TESTING;

  if (!isProductionRuntime) return;

  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not set. In production it must be a public HTTPS URL (e.g. https://api.wopr.bot). An internal hostname or localhost will not work in the browser.",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_API_URL ("${url}") is not a valid URL. In production it must be a public HTTPS URL.`,
    );
  }

  if (isInternalHostname(parsed.hostname)) {
    throw new Error(
      `NEXT_PUBLIC_API_URL ("${url}") contains an internal hostname ("${parsed.hostname}"). In production it must be a public HTTPS URL (e.g. https://api.wopr.bot).`,
    );
  }

  if (parsed.protocol !== "https:") {
    throw new Error(
      `NEXT_PUBLIC_API_URL ("${url}") uses ${parsed.protocol} but production requires https. Set it to the public HTTPS URL (e.g. https://api.wopr.bot).`,
    );
  }
}

validateProductionApiUrl(process.env.NEXT_PUBLIC_API_URL);

export const PLATFORM_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Base URL for REST API calls (platform root + /api). */
export const API_BASE_URL = `${PLATFORM_BASE_URL}/api`;

/** Canonical site URL for SEO metadata (sitemap, OG tags, robots). */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wopr.bot";
