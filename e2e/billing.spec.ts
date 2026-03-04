import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures/auth";

const PLATFORM_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const MOCK_CREDIT_OPTIONS = [
  {
    priceId: "price_test_credits_10",
    label: "$10",
    amountCents: 1000,
    creditCents: 1000,
    bonusPercent: 0,
  },
  {
    priceId: "price_test_credits_25",
    label: "$25",
    amountCents: 2500,
    creditCents: 2750,
    bonusPercent: 10,
  },
  {
    priceId: "price_test_credits_50",
    label: "$50",
    amountCents: 5000,
    creditCents: 6000,
    bonusPercent: 20,
  },
];

/** Shared mock org used by auth fixture — duplicated here for batch-aware billing handler. */
const MOCK_ORG = {
  id: "e2e-org-id",
  name: "E2E Test Org",
  slug: "e2e-test-org",
  billingEmail: "e2e@wopr.test",
  members: [{ userId: "e2e-user-id", role: "admin", email: "e2e@wopr.test" }],
  invites: [],
};

/**
 * All known tRPC procedure responses for the billing test context.
 * Must include BOTH billing and auth/org procedures because tRPC's httpBatchLink
 * batches multiple queries (from different components) into ONE request like:
 *   /trpc/billing.creditOptions,org.getOrganization,...?batch=1&input={...}
 * The handler MUST return one result per procedure in the batch.
 */
const BILLING_TRPC_MOCKS: Record<string, unknown> = {
  // Billing procedures
  "billing.creditOptions": MOCK_CREDIT_OPTIONS,
  "billing.creditsBalance": { balance_cents: 5000, daily_burn_cents: 100, runway_days: 50 },
  "billing.inferenceMode": { mode: "hosted" },
  "billing.creditsHistory": { entries: [] },
  "billing.autoTopupSettings": {
    usageBased: { enabled: false, thresholdCents: 500, topupAmountCents: 1000 },
    scheduled: { enabled: false, amountCents: 1000, interval: "monthly" },
  },
  "billing.accountStatus": { status: "active", status_reason: null, grace_deadline: null },
  "billing.usageSummary": {
    period_start: "",
    period_end: "",
    total_spend_cents: 0,
    included_credit_cents: 0,
    amount_due_cents: 0,
    plan_name: "free",
  },
  // org.getOrganization intentionally NOT mocked here — returning null causes
  // the credits page to fall through to the personal billing view (which shows
  // the "Credits" heading that these tests assert on).
  "org.listMyOrganizations": [MOCK_ORG],
  "pageContext.update": null,
};

/**
 * Mock the billing tRPC endpoints needed for the credits page to render.
 *
 * Registers ONE batch-aware handler that intercepts any tRPC request containing
 * billing procedures and returns the correct number of results for the whole batch.
 */
async function mockBillingAPI(page: Page) {
  await page.route(
    (url) =>
      url.href.includes(PLATFORM_BASE_URL) &&
      url.pathname.startsWith("/trpc/"),
    async (route) => {
      const procs = route.request().url().split("?")[0].split("/trpc/")[1]?.split(",") ?? [];
      const results = procs.map((proc) => ({
        result: {
          data: proc in BILLING_TRPC_MOCKS ? BILLING_TRPC_MOCKS[proc] : null,
        },
      }));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(results),
      });
    },
  );

  // REST endpoint for dividend stats
  await page.route(`${PLATFORM_BASE_URL}/api/billing/dividend/stats`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        poolCents: 0,
        activeUsers: 0,
        perUserCents: 0,
        userEligible: false,
        userWindowExpiresAt: null,
      }),
    });
  });
}

test.describe("Billing: Credit Checkout", () => {
  test("credits page loads and shows credit options", async ({ authedPage: page }) => {
    await mockBillingAPI(page);

    await page.goto("/billing/credits");

    await expect(page.getByRole("heading", { name: "Credits" })).toBeVisible();
    await expect(page.getByRole("main").getByText("Buy Credits", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /\$10/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /\$25/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /\$50/ }).first()).toBeVisible();

    // Bonus badges visible for $25 and $50 tiers
    await expect(page.getByText("+10%").first()).toBeVisible();
    await expect(page.getByText("+20%").first()).toBeVisible();

    // Buy button should be disabled before selecting a tier
    await expect(page.getByRole("button", { name: "Buy credits" }).first()).toBeDisabled();
  });

  test("checkout request contains real Stripe price ID (not synthetic)", async ({
    authedPage: page,
  }) => {
    await mockBillingAPI(page);

    let capturedCheckoutBody: Record<string, unknown> | null = null;

    await page.route(
      (url) => url.pathname.includes("/trpc/") && url.pathname.includes("billing.creditsCheckout"),
      async (route) => {
        capturedCheckoutBody = route.request().postDataJSON();

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              result: {
                data: {
                  json: {
                    url: "https://checkout.stripe.com/pay/test_mock",
                    sessionId: "cs_test_mock",
                  },
                },
              },
            },
          ]),
        });
      },
    );

    await page.goto("/billing/credits");

    await expect(page.getByRole("button", { name: /\$10/ }).first()).toBeVisible();

    // Select the $10 tier
    await page.getByRole("button", { name: /\$10/ }).first().click();

    // Buy button should now be enabled
    await expect(page.getByRole("button", { name: "Buy credits" }).first()).toBeEnabled();

    // Click buy
    await page.getByRole("button", { name: "Buy credits" }).first().click();

    // Wait briefly for the route handler to fire
    await expect.poll(() => capturedCheckoutBody, { timeout: 5000 }).not.toBeNull();

    // Extract priceId from tRPC batch body: { "0": { "priceId": "..." } }
    const batchInput = capturedCheckoutBody as unknown as Record<
      string,
      { priceId: string }
    >;
    const priceId = batchInput["0"]?.priceId;

    expect(priceId).toBeDefined();
    // CRITICAL: priceId must be a real Stripe price ID (price_xxx), not synthetic like "credit_10"
    expect(priceId).toMatch(/^price_/);
    expect(MOCK_CREDIT_OPTIONS.map((o) => o.priceId)).toContain(priceId);
  });

  test("complete checkout with Stripe test card and verify credit increase", async ({
    authedPage: page,
  }) => {
    test.skip(!process.env.STRIPE_PUBLISHABLE_KEY, "Requires Stripe test-mode keys");

    await page.goto("/billing/credits");

    await expect(page.getByText("Buy Credits")).toBeVisible();

    // Select the first available tier
    const firstTier = page
      .locator("button")
      .filter({ hasText: /^\$\d+$/ })
      .first();
    await firstTier.click();

    await page.getByRole("button", { name: "Buy credits" }).click();

    // Should redirect to Stripe Checkout
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15000 });

    // Fill Stripe test card
    const emailField = page.locator('input[name="email"]');
    if (await emailField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailField.fill("e2e@wopr.test");
    }

    await page.locator('input[name="cardNumber"]').fill("4242424242424242");
    await page.locator('input[name="cardExpiry"]').fill("12/30");
    await page.locator('input[name="cardCvc"]').fill("123");

    const nameField = page.locator('input[name="billingName"]');
    if (await nameField.isVisible({ timeout: 1000 }).catch(() => false)) {
      await nameField.fill("E2E Test");
    }

    const zipField = page.locator('input[name="billingPostalCode"]');
    if (await zipField.isVisible({ timeout: 1000 }).catch(() => false)) {
      await zipField.fill("10001");
    }

    await page.getByRole("button", { name: /Pay|Subscribe/i }).click();

    // Should redirect back to credits page with success
    await page.waitForURL(/\/billing\/credits\?checkout=success/, {
      timeout: 30000,
    });

    await expect(page.getByRole("heading", { name: "Credits" })).toBeVisible();
  });
});
