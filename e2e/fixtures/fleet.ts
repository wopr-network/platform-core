import type { Page } from "@playwright/test";

const PLATFORM_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const API_BASE_URL = `${PLATFORM_BASE_URL}/api`;

/** Stateful mock — POST handlers mutate state so subsequent GETs reflect changes. */
export interface FleetMockState {
	bots: Array<{ id: string; name: string; state: string }>;
	installedPlugins: Map<string, Array<{ pluginId: string; enabled: boolean }>>;
}

export function createFleetMockState(): FleetMockState {
	return {
		bots: [],
		installedPlugins: new Map(),
	};
}

const DISCORD_MANIFEST = {
	id: "discord",
	name: "Discord",
	description: "Connect your WOPR instance to Discord servers.",
	version: "3.2.0",
	author: "WOPR Team",
	icon: "MessageCircle",
	color: "#5865F2",
	category: "channel",
	tags: ["channel", "chat", "community"],
	capabilities: ["channel"],
	requires: [],
	install: [],
	configSchema: [],
	setup: [{ id: "done", title: "Connection Complete", description: "Ready.", fields: [] }],
	installCount: 12400,
	changelog: [],
};

let _botCounter = 0;

export async function mockFleetAPI(page: Page, state: FleetMockState) {
	// tRPC fleet.createInstance (POST) — must be registered before batch routes
	await page.route(`${PLATFORM_BASE_URL}/trpc/fleet.createInstance**`, async (route) => {
		if (route.request().method() !== "POST") {
			await route.continue();
			return;
		}
		// tRPC sends batch requests as an array; each item has a `json` field containing
		// the procedure input. Index 0 is the first (and usually only) call in the batch.
		const body = route.request().postDataJSON() as Array<{ json: { name?: string } }> | null;
		const botName = body?.[0]?.json?.name ?? "e2e-test-bot";
		const botId = `e2e-bot-${++_botCounter}`;
		const newBot = { id: botId, name: botName, state: "running" };
		state.bots.push(newBot);
		state.installedPlugins.set(botId, []);
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				result: { data: { id: botId, name: botName } },
			}),
		});
	});

	// tRPC fleet.listInstances (GET)
	await page.route(`${PLATFORM_BASE_URL}/trpc/fleet.listInstances**`, async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				result: { data: { bots: state.bots } },
			}),
		});
	});

	// Fleet REST: GET /fleet/bots (used by marketplace listBots)
	await page.route(`${PLATFORM_BASE_URL}/fleet/bots`, async (route) => {
		if (route.request().method() !== "GET") {
			await route.continue();
			return;
		}
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				bots: state.bots.map((b) => ({ id: b.id, name: b.name, state: b.state })),
			}),
		});
	});

	// Fleet REST: POST /fleet/bots/:id/plugins/:pluginId (install plugin)
	// Register BEFORE the GET route since both match similar patterns
	await page.route(`${PLATFORM_BASE_URL}/fleet/bots/*/plugins/*`, async (route) => {
		if (route.request().method() !== "POST") {
			await route.continue();
			return;
		}
		const url = route.request().url();
		const match = url.match(/\/fleet\/bots\/([^/]+)\/plugins\/([^/?]+)/);
		const botId = match?.[1] ?? "";
		const pluginId = match?.[2] ?? "";

		const plugins = state.installedPlugins.get(botId) ?? [];
		plugins.push({ pluginId, enabled: true });
		state.installedPlugins.set(botId, plugins);

		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				success: true,
				botId,
				pluginId,
				installedPlugins: plugins.map((p) => p.pluginId),
			}),
		});
	});

	// Fleet REST: GET /fleet/bots/:id/plugins
	await page.route(`${PLATFORM_BASE_URL}/fleet/bots/*/plugins`, async (route) => {
		if (route.request().method() !== "GET") {
			await route.continue();
			return;
		}
		const url = route.request().url();
		const match = url.match(/\/fleet\/bots\/([^/]+)\/plugins/);
		const botId = match?.[1] ?? "";
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				botId,
				plugins: state.installedPlugins.get(botId) ?? [],
			}),
		});
	});

	// API: GET /api/marketplace/plugins (list)
	await page.route(`${API_BASE_URL}/marketplace/plugins`, async (route) => {
		if (route.request().method() !== "GET") {
			await route.continue();
			return;
		}
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify([DISCORD_MANIFEST]),
		});
	});

	// API: GET /api/marketplace/plugins/discord (detail)
	await page.route(`${API_BASE_URL}/marketplace/plugins/discord`, async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(DISCORD_MANIFEST),
		});
	});
}
