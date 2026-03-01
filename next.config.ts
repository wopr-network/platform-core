import type { NextConfig } from "next";

const apiOrigin = process.env.NEXT_PUBLIC_API_URL
  ? new URL(process.env.NEXT_PUBLIC_API_URL).origin
  : "";

// Only use upgrade-insecure-requests when the API origin itself is HTTPS.
// This prevents Chrome from upgrading http://localhost → https://localhost
// during e2e tests, which would break cookie injection.
const isSecureOrigin = apiOrigin.startsWith("https://");

const nextConfig: NextConfig = {
  output: "standalone",
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        ...(isSecureOrigin
          ? [
              {
                key: "Strict-Transport-Security",
                value: "max-age=31536000; includeSubDomains; preload",
              },
            ]
          : []),
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "X-DNS-Prefetch-Control",
          value: "off",
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
        },
        // Content-Security-Policy is set per-request by the middleware (src/proxy.ts)
        // with a unique nonce. No static CSP here to avoid overwriting the nonce-based header.
      ],
    },
  ],
};

export default nextConfig;
