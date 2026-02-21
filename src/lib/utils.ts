import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validate a redirect URL is a safe relative path.
 * Accepts paths starting with "/" but rejects protocol-relative URLs like "//evil.com".
 * Falls back to "/" for any unsafe value.
 */
export function sanitizeRedirectUrl(raw: string | null | undefined): string {
  if (raw?.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return "/";
}
