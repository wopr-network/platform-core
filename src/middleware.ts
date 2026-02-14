import { type NextRequest, NextResponse } from "next/server";

const publicPaths = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/onboard",
  "/onboarding",
];

/** Paths that are public only when matched exactly (not as a prefix). */
const publicExactPaths = new Set(["/", "/og"]);

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Validate that a state-changing request originates from this application.
 * Checks the Origin header (preferred) with Referer as fallback.
 * Returns true if the request is safe, false if it should be blocked.
 */
export function validateCsrfOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  if (!host) return false;

  // Build the allowed origin using the request's actual protocol only,
  // preventing protocol downgrade attacks (e.g. HTTP origin to HTTPS endpoint)
  const protocol = request.nextUrl.protocol; // "https:" or "http:"
  const allowedOrigin = `${protocol}//${host}`;

  // Check Origin header first (most reliable)
  if (origin) {
    return origin === allowedOrigin;
  }

  // Fall back to Referer header
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      return refererOrigin === allowedOrigin;
    } catch {
      return false;
    }
  }

  // No Origin or Referer on a mutation request is suspicious — block it.
  // Legitimate browser form submissions and fetch() calls include Origin.
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CSRF protection: validate Origin/Referer on state-changing API requests.
  // Exempt /api/auth routes — Better Auth handles its own CSRF protection
  // and applying ours breaks OAuth callback flows.
  if (
    pathname.startsWith("/api") &&
    !pathname.startsWith("/api/auth") &&
    MUTATION_METHODS.has(request.method)
  ) {
    if (!validateCsrfOrigin(request)) {
      return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
    }
  }

  // Redirect authenticated users from "/" to "/marketplace" so they see the dashboard
  if (pathname === "/") {
    const sessionToken =
      request.cookies.get("better-auth.session_token") ??
      request.cookies.get("__Secure-better-auth.session_token");
    if (sessionToken?.value.trim()) {
      return NextResponse.redirect(new URL("/marketplace", request.url));
    }
  }

  // Allow public paths
  if (publicExactPaths.has(pathname) || publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files and API routes
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Check for session cookie (Better Auth uses "better-auth.session_token" by default)
  const sessionToken =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token");

  if (!sessionToken || !sessionToken.value.trim()) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
