import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 4 : undefined,
	reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "html",
	use: {
		baseURL: "http://localhost:3000",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "npm run start",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		env: {
			// Needed so next.config.ts includes http://localhost:3001 in CSP connect-src
			// when the server starts (NEXT_PUBLIC_API_URL is baked into the client bundle
			// at build time, but the CSP header is computed at server startup from this var).
			NEXT_PUBLIC_API_URL: "http://localhost:3001",
		},
	},
});
