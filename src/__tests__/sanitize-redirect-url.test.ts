import { describe, expect, it } from "vitest";
import { sanitizeRedirectUrl } from "@/lib/utils";

describe("sanitizeRedirectUrl", () => {
  it("allows valid relative paths", () => {
    expect(sanitizeRedirectUrl("/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectUrl("/settings")).toBe("/settings");
    expect(sanitizeRedirectUrl("/settings/profile")).toBe("/settings/profile");
  });

  it("rejects absolute URLs to external origins", () => {
    expect(sanitizeRedirectUrl("https://evil.com/phishing")).toBe("/");
    expect(sanitizeRedirectUrl("http://evil.com")).toBe("/");
  });

  it("rejects protocol-relative URLs", () => {
    expect(sanitizeRedirectUrl("//evil.com")).toBe("/");
    expect(sanitizeRedirectUrl("//evil.com/path")).toBe("/");
  });

  it("falls back to / for null and undefined", () => {
    expect(sanitizeRedirectUrl(null)).toBe("/");
    expect(sanitizeRedirectUrl(undefined)).toBe("/");
  });

  it("falls back to / for empty string", () => {
    expect(sanitizeRedirectUrl("")).toBe("/");
  });

  it("allows root path", () => {
    expect(sanitizeRedirectUrl("/")).toBe("/");
  });

  it("allows paths with query strings", () => {
    expect(sanitizeRedirectUrl("/settings?tab=billing")).toBe("/settings?tab=billing");
  });
});

// This test documents the fix — signup previously passed raw callbackUrl to OAuthButtons
describe("signup page callbackUrl sanitization", () => {
  it("sanitizeRedirectUrl rejects external URLs that could be passed as callbackUrl", () => {
    // Before fix: searchParams.get("callbackUrl") ?? "/" was passed directly
    // After fix: sanitizeRedirectUrl(searchParams.get("callbackUrl")) is used
    const maliciousParam = "https://evil.com/phishing";
    expect(sanitizeRedirectUrl(maliciousParam)).toBe("/");
  });
});
