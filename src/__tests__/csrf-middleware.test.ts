import { describe, expect, it } from "vitest";
import { validateCsrfOrigin } from "../proxy";

// Minimal NextRequest-compatible mock for testing Origin/Referer validation
function mockRequest(opts: { method: string; url: string; headers?: Record<string, string> }) {
  const url = new URL(opts.url);
  const headers = new Headers(opts.headers ?? {});
  if (!headers.has("host")) {
    headers.set("host", url.host);
  }
  return {
    method: opts.method,
    url: opts.url,
    nextUrl: url,
    headers,
    cookies: { get: () => undefined },
  } as unknown as Parameters<typeof validateCsrfOrigin>[0];
}

describe("CSRF Origin validation", () => {
  it("allows POST with matching Origin header", () => {
    const req = mockRequest({
      method: "POST",
      url: "https://app.wopr.dev/api/instances",
      headers: { origin: "https://app.wopr.dev" },
    });
    expect(validateCsrfOrigin(req)).toBe(true);
  });

  it("blocks POST with cross-origin Origin header", () => {
    const req = mockRequest({
      method: "POST",
      url: "https://app.wopr.dev/api/instances",
      headers: { origin: "https://evil.com" },
    });
    expect(validateCsrfOrigin(req)).toBe(false);
  });

  it("blocks POST with no Origin or Referer", () => {
    const req = mockRequest({
      method: "POST",
      url: "https://app.wopr.dev/api/instances",
    });
    expect(validateCsrfOrigin(req)).toBe(false);
  });

  it("allows POST with matching Referer when Origin is absent", () => {
    const req = mockRequest({
      method: "POST",
      url: "https://app.wopr.dev/api/instances",
      headers: { referer: "https://app.wopr.dev/instances/new" },
    });
    expect(validateCsrfOrigin(req)).toBe(true);
  });

  it("blocks POST with cross-origin Referer when Origin is absent", () => {
    const req = mockRequest({
      method: "POST",
      url: "https://app.wopr.dev/api/instances",
      headers: { referer: "https://evil.com/attack" },
    });
    expect(validateCsrfOrigin(req)).toBe(false);
  });

  it("blocks request when host header is missing", () => {
    const headers = new Headers();
    // Explicitly do not set host
    const req = {
      method: "POST",
      url: "https://app.wopr.dev/api/instances",
      nextUrl: new URL("https://app.wopr.dev/api/instances"),
      headers,
      cookies: { get: () => undefined },
    } as unknown as Parameters<typeof validateCsrfOrigin>[0];
    expect(validateCsrfOrigin(req)).toBe(false);
  });

  it("blocks POST with malformed Referer URL", () => {
    const req = mockRequest({
      method: "POST",
      url: "https://app.wopr.dev/api/instances",
      headers: { referer: "not-a-url" },
    });
    expect(validateCsrfOrigin(req)).toBe(false);
  });

  it("allows same-origin request over HTTP (development)", () => {
    const req = mockRequest({
      method: "POST",
      url: "http://localhost:3000/api/instances",
      headers: { origin: "http://localhost:3000" },
    });
    expect(validateCsrfOrigin(req)).toBe(true);
  });

  it("blocks HTTP origin against HTTPS host", () => {
    const req = mockRequest({
      method: "POST",
      url: "https://app.wopr.dev/api/instances",
      headers: {
        host: "app.wopr.dev",
        origin: "http://app.wopr.dev",
      },
    });
    // http:// origin against https:// host must be blocked to prevent
    // protocol downgrade attacks (CSRF from HTTP origin to HTTPS endpoint)
    expect(validateCsrfOrigin(req)).toBe(false);
  });
});
