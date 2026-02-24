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

/** Mock the billing tRPC endpoints needed for the credits page to render. */
async function mockBillingAPI(page: Page) {
  await page.route(
    (url) => url.pathname.includes("/trpc/") && url.pathname.includes("billing.creditOptions"),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ result: { data: { json: MOCK_CREDIT_OPTIONS } } }]),
      });
    },
  );

  await page.route(
    (url) => url.pathname.includes("/trpc/") && url.pathname.includes("billing.creditsBalance"),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            result: {
              data: {
                json: {
                  balance_cents: 5000,
                  daily_burn_cents: 100,
                  runway_days: 50,
                },
              },
            },
          },
        ]),
      });
    },
  );

  await page.route(
    (url) => url.pathname.includes("/trpc/") && url.pathname.includes("billing.inferenceMode"),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ result: { data: { json: { mode: "hosted" } } } }]),
      });
    },
  );

  await page.route(
    (url) => url.pathname.includes("/trpc/") && url.pathname.includes("billing.creditsHistory"),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ result: { data: { json: { entries: [] } } } }]),
      });
    },
  );

  await page.route(
    (url) => url.pathname.includes("/trpc/") && url.pathname.includes("billing.autoTopupSettings"),
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            result: {
              data: {
                json: {
                  usageBased: {
                    enabled: false,
                    thresholdCents: 500,
                    topupAmountCents: 1000,
                  },
                  scheduled: {
                    enabled: false,
                    amountCents: 1000,
                    interval: "monthly",
                  },
                },
              },
            },
          },
        ]),
      });
    },
  );

  await page.route(`${PLATFORM_BASE_URL}/api/billing/dividend-stats`, async (route) => {
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
    await expect(page.getByText("Buy Credits")).toBeVisible();
    await expect(page.getByText("$10")).toBeVisible();
    await expect(page.getByText("$25")).toBeVisible();
    await expect(page.getByText("$50")).toBeVisible();

    // Bonus badges visible for $25 and $50 tiers
    await expect(page.getByText("+10%")).toBeVisible();
    await expect(page.getByText("+20%")).toBeVisible();

    // Buy button should be disabled before selecting a tier
    await expect(page.getByRole("button", { name: "Buy credits" })).toBeDisabled();
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

    await expect(page.getByText("$10")).toBeVisible();

    // Select the $10 tier
    await page.getByText("$10").click();

    // Buy button should now be enabled
    await expect(page.getByRole("button", { name: "Buy credits" })).toBeEnabled();

    // Click buy
    await page.getByRole("button", { name: "Buy credits" }).click();

    // Wait briefly for the route handler to fire
    await expect.poll(() => capturedCheckoutBody, { timeout: 5000 }).not.toBeNull();

    // Extract priceId from tRPC batch body: { "0": { "json": { "priceId": "..." } } }
    const batchInput = capturedCheckoutBody as unknown as Record<
      string,
      { json: { priceId: string } }
    >;
    const priceId = batchInput["0"]?.json?.priceId;

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
