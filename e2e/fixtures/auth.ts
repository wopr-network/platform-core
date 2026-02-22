import { test as base, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

const PLATFORM_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * Intercept Better Auth API calls and return mock success responses.
 * This avoids needing a running backend for E2E tests.
 */
export async function mockAuthAPI(page: Page) {
	// Mock sign-up endpoint
	await page.route(`${PLATFORM_BASE_URL}/api/auth/sign-up/email`, async (route) => {
		const body = route.request().postDataJSON();
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				user: {
					id: randomUUID(),
					name: body?.name ?? "Test User",
					email: body?.email ?? "test@wopr.test",
					emailVerified: false,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
				session: null,
			}),
		});
	});

	// Mock sign-in endpoint
	await page.route(`${PLATFORM_BASE_URL}/api/auth/sign-in/email`, async (route) => {
		const sessionToken = `e2e-session-${randomUUID()}`;
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			headers: {
				"set-cookie": `better-auth.session_token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax`,
			},
			body: JSON.stringify({
				user: {
					id: "e2e-user-id",
					name: "E2E Test User",
					email: "e2e@wopr.test",
					emailVerified: true,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
				session: {
					id: randomUUID(),
					userId: "e2e-user-id",
					token: sessionToken,
					expiresAt: new Date(Date.now() + 86400000).toISOString(),
				},
			}),
		});
	});

	// Mock get-session endpoint (for useSession hook after login)
	await page.route(`${PLATFORM_BASE_URL}/api/auth/get-session`, async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				user: {
					id: "e2e-user-id",
					name: "E2E Test User",
					email: "e2e@wopr.test",
					emailVerified: true,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
				session: {
					id: "e2e-session-id",
					userId: "e2e-user-id",
					token: "e2e-token",
					expiresAt: new Date(Date.now() + 86400000).toISOString(),
				},
			}),
		});
	});

	// Mock password reset endpoint
	// authClient.$fetch("/request-password-reset") resolves to
	// PLATFORM_BASE_URL/api/auth/request-password-reset
	await page.route(`${PLATFORM_BASE_URL}/api/auth/request-password-reset`, async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ status: true }),
		});
	});

	// Mock send-verification-email endpoint
	await page.route(
		`${PLATFORM_BASE_URL}/api/auth/send-verification-email`,
		async (route) => {
			await route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ status: true }),
			});
		},
	);
}

/**
 * Set localStorage flags to bypass onboarding gate.
 * Must be called after page.goto() so there's a page context.
 */
export async function bypassOnboarding(page: Page) {
	await page.evaluate(() => {
		localStorage.setItem("wopr-onboarding-complete", "1");
	});
}

/** Generate a unique test email that won't collide across runs. */
export function testEmail(): string {
	return `e2e-test-${randomUUID()}@wopr.test`;
}

/** Extended test fixtures for auth E2E tests. */
export const test = base.extend<{ authedPage: Page }>({
	authedPage: async ({ page }, use) => {
		await mockAuthAPI(page);

		// Navigate to login to establish page context, then bypass onboarding
		await page.goto("/login");
		await bypassOnboarding(page);

		// Perform login via the form
		await page.getByLabel("Email").fill("e2e@wopr.test");
		await page.getByLabel("Password").fill("TestPassword123!");
		await page.getByRole("button", { name: "Sign in" }).click();

		// Wait for redirect to complete (middleware redirects / -> /marketplace)
		await page.waitForURL("**/marketplace");

		await use(page);
	},
});

export { expect };
