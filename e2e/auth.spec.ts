import { bypassOnboarding, expect, mockAuthAPI, test, testEmail } from "./fixtures/auth";

test.describe("Auth critical path", () => {
	test("signup — fill form, submit, see verification interstitial", async ({ page }) => {
		const email = testEmail();

		await mockAuthAPI(page);
		await page.goto("/signup");

		// Fill the signup form
		await page.getByLabel("Name").fill("E2E Test User");
		await page.getByLabel("Email").fill(email);
		await page.getByLabel("Password", { exact: true }).fill("StrongP@ssw0rd!");
		await page.getByLabel("Confirm password").fill("StrongP@ssw0rd!");

		// Check terms checkbox
		await page.getByRole("checkbox").check();

		// Submit
		await page.getByRole("button", { name: "Create account" }).click();

		// Expect the "Transmission sent" verification interstitial (no redirect — stays on /signup)
		await expect(page.getByText("Transmission sent")).toBeVisible();
		await expect(page.getByText("We sent a verification link to")).toBeVisible();
		await expect(page.getByText(email)).toBeVisible();
	});

	test("login — fill form, submit, arrive at marketplace", async ({ page }) => {
		await mockAuthAPI(page);

		// Navigate to login — first go to a page to set localStorage
		await page.goto("/login");
		await bypassOnboarding(page);

		// Fill login form
		await page.getByLabel("Email").fill("e2e@wopr.test");
		await page.getByLabel("Password").fill("TestPassword123!");

		// Submit
		await page.getByRole("button", { name: "Sign in" }).click();

		// After login, the client calls router.push(callbackUrl) which defaults to "/"
		// Middleware then redirects / -> /marketplace when session cookie is present
		await page.waitForURL("**/marketplace");
		await expect(page).toHaveURL(/\/marketplace/);
	});

	test("forgot password — fill email, submit, see confirmation", async ({ page }) => {
		const email = testEmail();

		await mockAuthAPI(page);
		await page.goto("/forgot-password");

		// Fill the email
		await page.getByLabel("Email").fill(email);

		// Submit
		await page.getByRole("button", { name: "Send reset link" }).click();

		// Expect the "Transmission sent" confirmation
		await expect(page.getByText("Transmission sent")).toBeVisible();
		await expect(page.getByText("We sent a password reset link to")).toBeVisible();
		await expect(page.getByText(email)).toBeVisible();
	});
});
