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
		// NEXT_PUBLIC_API_URL must be present at build time so next.config.ts bakes
		// http://localhost:3001 into the CSP connect-src header (headers() in next.config.ts
		// is evaluated during `next build`, not at server startup). The CI workflow
		// sets this env var on the Build step. Locally, set it before running `pnpm build`.
		command: "npm run start",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		env: {
			NEXT_PUBLIC_API_URL: "http://localhost:3001",
		},
	},
});
