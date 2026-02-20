import { describe, expect, it } from "vitest";

describe("next.config headers", () => {
  it("exports headers function", async () => {
    const config = await import("../../next.config.js");
    const nextConfig = config.default;
    expect(nextConfig.headers).toBeDefined();
    expect(typeof nextConfig.headers).toBe("function");

    const headers = await nextConfig.headers?.();
    if (!headers) throw new Error("headers() returned undefined");
    expect(headers).toHaveLength(1);
    expect(headers[0].source).toBe("/:path*");

    const headerMap = new Map(
      headers[0].headers.map((h: { key: string; value: string }) => [h.key, h.value]),
    );
    expect(headerMap.get("X-Frame-Options")).toBe("DENY");
    expect(headerMap.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headerMap.get("Content-Security-Policy")).toContain("default-src 'self'");
    expect(headerMap.get("Content-Security-Policy")).toContain("https://js.stripe.com");
    expect(headerMap.get("Strict-Transport-Security")).toContain("max-age=31536000");
    expect(headerMap.get("Permissions-Policy")).toBeDefined();
  });
});
