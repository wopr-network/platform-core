import { mockAuthAPI, bypassOnboarding } from "./fixtures/auth";
import { test } from "@playwright/test";

test("debug cookie flow", async ({ page }) => {
    await mockAuthAPI(page);

    // Intercept ALL requests to see what's happening
    page.on("request", req => {
        const url = req.url();
        if (!url.includes("_rsc") && !url.includes("_next") && !url.includes(".css") && !url.includes(".js") && !url.includes(".ico")) {
            console.log(`REQUEST: ${req.method()} ${url}`);
            const cookie = req.headers()["cookie"];
            if (cookie) console.log(`  Cookie: ${cookie.slice(0, 80)}`);
        }
    });
    
    await page.goto("/login");
    await bypassOnboarding(page);
    
    // Check cookies BEFORE login
    const cookiesBefore = await page.context().cookies();
    console.log("Cookies before login:", JSON.stringify(cookiesBefore.map(c => ({name: c.name, value: c.value.slice(0,20)}))));
    
    await page.getByLabel("Email").fill("e2e@wopr.test");
    await page.getByLabel("Password").fill("TestPassword123!");
    await page.getByRole("button", { name: "Sign in" }).click();
    
    await page.waitForTimeout(5000);
    
    // Check cookies AFTER login
    const cookiesAfter = await page.context().cookies();
    console.log("Cookies after login:", JSON.stringify(cookiesAfter.map(c => ({name: c.name, value: c.value.slice(0,20)}))));
    console.log("Final URL:", page.url());
});
