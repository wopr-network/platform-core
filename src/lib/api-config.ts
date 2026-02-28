/**
 * Centralized API base URL configuration.
 *
 * Set NEXT_PUBLIC_API_URL to the platform root (e.g. "http://localhost:3001").
 * All API clients derive their paths from this single value.
 */
export const PLATFORM_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Base URL for REST API calls (platform root + /api). */
export const API_BASE_URL = `${PLATFORM_BASE_URL}/api`;

/** Canonical site URL for SEO metadata (sitemap, OG tags, robots). */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wopr.bot";
