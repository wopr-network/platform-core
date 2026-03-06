import type { Page } from "@playwright/test";

const PLATFORM_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const API_BASE_URL = `${PLATFORM_BASE_URL}/api`;

/** Stateful mock — POST handlers mutate state so subsequent GETs reflect changes. */
export interface FleetMockState {
  bots: Array<{
    id: string;
    name: string;
    state: string;
    env: Record<string, string>;
    uptime: string;
    createdAt: string;
    stats: {
      cpuPercent: number;
      memoryUsageMb: number;
      memoryLimitMb: number;
      memoryPercent: number;
    } | null;
  }>;
  installedPlugins: Map<string, Array<{ pluginId: string; enabled: boolean }>>;
  secrets: Record<string, Record<string, string>>;
}

export function createFleetMockState(): FleetMockState {
  return {
    bots: [],
    installedPlugins: new Map(),
    secrets: {},
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
    // tRPC v11 httpBatchLink sends POST body as {"0": {input}} (no "json" wrapper).
    const body = route.request().postDataJSON() as Record<string, { name?: string }> | null;
    const input = body?.["0"];
    const botName = input?.name ?? "e2e-test-bot";
    const botId = `e2e-bot-${++_botCounter}`;
    const newBot = {
      id: botId,
      name: botName,
      state: "running",
      env: {},
      uptime: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      stats: { cpuPercent: 12, memoryUsageMb: 128, memoryLimitMb: 512, memoryPercent: 25 },
    };
    state.bots.push(newBot);
    state.installedPlugins.set(botId, []);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          result: { data: { id: botId, name: botName } },
        },
      ]),
    });
  });

  // tRPC fleet.getInstance (GET batch)
  await page.route(`${PLATFORM_BASE_URL}/trpc/fleet.getInstance**`, async (route) => {
    const url = new URL(route.request().url());
    const inputParam = url.searchParams.get("input");
    let botId = "";
    try {
      const parsed = JSON.parse(inputParam ?? "{}");
      // tRPC v11 httpBatchLink: input is {"0": {id}} (no "json" wrapper)
      botId = parsed?.["0"]?.id ?? parsed?.["0"]?.json?.id ?? "";
    } catch {
      /* ignore */
    }
    const bot = state.bots.find((b) => b.id === botId);
    if (!bot) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ result: { data: null } }]),
      });
      return;
    }
    const plugins = state.installedPlugins.get(botId) ?? [];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          result: {
            data: {
              id: bot.id,
              name: bot.name,
              state: bot.state,
              env: bot.env,
              uptime: bot.uptime,
              createdAt: bot.createdAt,
              stats: bot.stats,
              plugins: plugins.map((p) => ({
                id: p.pluginId,
                name: p.pluginId,
                version: "1.0.0",
                enabled: p.enabled,
              })),
            },
          },
        },
      ]),
    });
  });

  // tRPC fleet.controlInstance (POST)
  await page.route(`${PLATFORM_BASE_URL}/trpc/fleet.controlInstance**`, async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    // tRPC v11 httpBatchLink: POST body is {"0": {id, action}} (no "json" wrapper)
    const body = route.request().postDataJSON() as Record<
      string,
      { id: string; action: string }
    > | null;
    const input = body?.["0"];
    const botId = input?.id ?? "";
    const action = input?.action ?? "";
    const bot = state.bots.find((b) => b.id === botId);
    if (bot) {
      if (action === "stop") bot.state = "exited";
      else if (action === "start" || action === "restart") bot.state = "running";
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ result: { data: { success: true } } }]),
    });
  });

  // tRPC fleet.getInstanceHealth (GET)
  await page.route(`${PLATFORM_BASE_URL}/trpc/fleet.getInstanceHealth**`, async (route) => {
    const url = new URL(route.request().url());
    const inputParam = url.searchParams.get("input");
    let botId = "";
    try {
      const parsed = JSON.parse(inputParam ?? "{}");
      botId = parsed?.["0"]?.id ?? parsed?.["0"]?.json?.id ?? "";
    } catch {
      /* ignore */
    }
    const bot = state.bots.find((b) => b.id === botId);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          result: {
            data: {
              id: botId,
              state: bot?.state ?? "running",
              health: "healthy",
              uptime: bot?.uptime ?? new Date().toISOString(),
              stats: bot?.stats ?? { cpuPercent: 10, memoryUsageMb: 128 },
            },
          },
        },
      ]),
    });
  });

  // tRPC fleet.getInstanceMetrics (GET)
  await page.route(`${PLATFORM_BASE_URL}/trpc/fleet.getInstanceMetrics**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          result: {
            data: {
              id: "mock",
              stats: { cpuPercent: 12, memoryUsageMb: 128, memoryLimitMb: 512, memoryPercent: 25 },
            },
          },
        },
      ]),
    });
  });

  // tRPC fleet.getInstanceLogs (GET)
  await page.route(`${PLATFORM_BASE_URL}/trpc/fleet.getInstanceLogs**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          result: {
            data: { logs: ["2026-03-05T00:00:00Z [INFO] Bot started successfully"] },
          },
        },
      ]),
    });
  });

  // Fleet REST: PATCH /fleet/bots/:id (update config)
  await page.route(`${PLATFORM_BASE_URL}/fleet/bots/*`, async (route) => {
    if (route.request().method() !== "PATCH") {
      await route.continue();
      return;
    }
    const url = route.request().url();
    const match = url.match(/\/fleet\/bots\/([^/?]+)/);
    const botId = match?.[1] ?? "";
    const body = route.request().postDataJSON() as { env?: Record<string, string> } | null;
    const bot = state.bots.find((b) => b.id === botId);
    if (bot && body?.env) {
      bot.env = { ...bot.env, ...body.env };
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  // Fleet REST: GET/PUT /fleet/bots/:id/secrets
  await page.route(`${PLATFORM_BASE_URL}/fleet/bots/*/secrets`, async (route) => {
    const method = route.request().method();
    const url = route.request().url();
    const match = url.match(/\/fleet\/bots\/([^/]+)\/secrets/);
    const botId = match?.[1] ?? "";

    if (method === "GET") {
      const botSecrets = state.secrets[botId] ?? {};
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ keys: Object.keys(botSecrets) }),
      });
    } else if (method === "PUT") {
      const body = route.request().postDataJSON() as Record<string, string> | null;
      if (body) {
        state.secrets[botId] = { ...state.secrets[botId], ...body };
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    } else {
      await route.continue();
    }
  });

  // tRPC fleet.listInstances (GET)
  await page.route(`${PLATFORM_BASE_URL}/trpc/fleet.listInstances**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          result: { data: { bots: state.bots } },
        },
      ]),
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
