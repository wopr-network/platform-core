import { expect, test } from "@playwright/test";

test("homepage loads with status 200", async ({ page }) => {
	const response = await page.goto("/");
	expect(response).not.toBeNull();
	expect(response!.status()).toBe(200);
});
