import { logger } from "./logger";
import { trpcVanilla } from "./trpc";

const log = logger("admin-marketplace");

// ---- Types ----

/** A plugin as seen by the admin marketplace curation UI */
export interface AdminPlugin {
  id: string;
  npm_package: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  icon_url: string | null;
  enabled: boolean;
  featured: boolean;
  sort_order: number;
  notes: string;
  superpower_md: string | null;
  discovered_at: number;
  enabled_at: number | null;
  reviewed: boolean;
}

/** Payload for manual add */
export interface AddPluginRequest {
  npm_package: string;
}

/** Payload for updating a plugin */
export interface UpdatePluginRequest {
  id: string;
  enabled?: boolean;
  featured?: boolean;
  sort_order?: number;
  notes?: string;
  reviewed?: boolean;
}

// ---- Mock mode detection ----

/**
 * Returns true when the admin marketplace tRPC procedures are not yet live.
 * Mock mode is ONLY allowed in development. In production, API failures propagate.
 *
 * To switch to live mode once the backend procedures exist:
 *   1. Add `adminMarketplace` to AppRouterRecord in src/lib/trpc-types.ts
 *   2. Set NEXT_PUBLIC_ADMIN_MARKETPLACE_LIVE=true in .env
 *   3. Remove MOCK_ADMIN_PLUGINS and this function
 */
export function isMockMode(): boolean {
  return process.env.NEXT_PUBLIC_ADMIN_MARKETPLACE_LIVE !== "true";
}

// ---- Mock data (development only) ----
const MOCK_ADMIN_PLUGINS: AdminPlugin[] = [
  {
    id: "discord",
    npm_package: "@wopr-network/plugin-discord",
    name: "Discord",
    description: "Connect your WOPR instance to Discord servers.",
    version: "3.2.0",
    author: "WOPR Team",
    category: "channel",
    icon_url: null,
    enabled: true,
    featured: true,
    sort_order: 0,
    notes: "",
    superpower_md: null,
    discovered_at: Date.now() - 86400000 * 30,
    enabled_at: Date.now() - 86400000 * 28,
    reviewed: true,
  },
  {
    id: "semantic-memory",
    npm_package: "@wopr-network/plugin-semantic-memory",
    name: "Semantic Memory",
    description: "Long-term memory with vector search across conversations.",
    version: "1.4.0",
    author: "WOPR Team",
    category: "utility",
    icon_url: null,
    enabled: true,
    featured: false,
    sort_order: 1,
    notes: "",
    superpower_md: null,
    discovered_at: Date.now() - 86400000 * 20,
    enabled_at: Date.now() - 86400000 * 18,
    reviewed: true,
  },
  {
    id: "fire-your-secretary",
    npm_package: "@wopr-network/plugin-secretary",
    name: "Fire Your Secretary",
    description: "AI-powered scheduling, email triage, and calendar management.",
    version: "0.9.0",
    author: "Community",
    category: "superpower",
    icon_url: null,
    enabled: true,
    featured: true,
    sort_order: 2,
    notes: "Great community plugin. Watch for rate limiting issues.",
    superpower_md:
      "# Fire Your Secretary\n\nStop paying a human to manage your calendar.\n\n## What it does\n- Reads your email and triages by urgency\n- Manages calendar conflicts automatically\n- Drafts responses in your voice\n- Learns your preferences over time\n\n## Pricing\nIncluded with WOPR Bot subscription. LLM credits consumed per interaction.",
    discovered_at: Date.now() - 86400000 * 15,
    enabled_at: Date.now() - 86400000 * 10,
    reviewed: true,
  },
  {
    id: "slack-bridge",
    npm_package: "@wopr-network/plugin-slack",
    name: "Slack Bridge",
    description: "Bridge your WOPR bot into Slack workspaces.",
    version: "2.1.0",
    author: "WOPR Team",
    category: "channel",
    icon_url: null,
    enabled: true,
    featured: false,
    sort_order: 3,
    notes: "",
    superpower_md: null,
    discovered_at: Date.now() - 86400000 * 25,
    enabled_at: Date.now() - 86400000 * 22,
    reviewed: true,
  },
  {
    id: "code-review-bot",
    npm_package: "@community/wopr-code-review",
    name: "Code Review Bot",
    description: "Automated PR reviews powered by your WOPR instance.",
    version: "0.3.1",
    author: "Community",
    category: "superpower",
    icon_url: null,
    enabled: false,
    featured: false,
    sort_order: 99,
    notes: "",
    superpower_md:
      "# Code Review Bot\n\nNever ship bad code again.\n\n## Features\n- Inline PR comments with actionable suggestions\n- Security vulnerability scanning\n- Style consistency enforcement\n- Learns your team's conventions",
    discovered_at: Date.now() - 86400000 * 2,
    enabled_at: null,
    reviewed: false,
  },
  {
    id: "voice-assistant",
    npm_package: "@community/wopr-voice",
    name: "Voice Assistant",
    description: "Talk to your WOPR bot with natural voice interaction.",
    version: "0.1.0",
    author: "Community",
    category: "superpower",
    icon_url: null,
    enabled: false,
    featured: false,
    sort_order: 99,
    notes: "",
    superpower_md:
      "# Voice Assistant\n\nHands-free WOPR.\n\n## Capabilities\n- Wake word detection\n- Real-time STT via Whisper\n- Natural TTS via Kokoro\n- Multi-language support",
    discovered_at: Date.now() - 86400000,
    enabled_at: null,
    reviewed: false,
  },
];

const getMockPlugins = (): AdminPlugin[] => structuredClone(MOCK_ADMIN_PLUGINS);

// ---- Typed admin client stub ----

interface AdminMarketplaceProcedures {
  listPlugins: { query(): Promise<AdminPlugin[]> };
  updatePlugin: { mutate(input: UpdatePluginRequest): Promise<AdminPlugin> };
  addPlugin: { mutate(input: AddPluginRequest): Promise<AdminPlugin> };
}

const marketplaceClient = (
  trpcVanilla as unknown as { adminMarketplace: AdminMarketplaceProcedures }
).adminMarketplace;

// ---- API calls with mock fallback ----

export async function getDiscoveryQueue(): Promise<AdminPlugin[]> {
  try {
    const all = await marketplaceClient.listPlugins.query();
    return all.filter((p) => !p.reviewed);
  } catch (e) {
    if (!isMockMode()) throw e;
    log.warn("[MOCK MODE] Failed to fetch pending plugins, using mock data", e);
    return getMockPlugins().filter((p) => !p.reviewed);
  }
}

export async function getEnabledPlugins(): Promise<AdminPlugin[]> {
  try {
    const all = await marketplaceClient.listPlugins.query();
    return all.filter((p) => p.enabled && p.reviewed).sort((a, b) => a.sort_order - b.sort_order);
  } catch (e) {
    if (!isMockMode()) throw e;
    log.warn("[MOCK MODE] Failed to fetch enabled plugins, using mock data", e);
    return getMockPlugins()
      .filter((p) => p.enabled && p.reviewed)
      .sort((a, b) => a.sort_order - b.sort_order);
  }
}

export async function getAllPlugins(): Promise<AdminPlugin[]> {
  try {
    return await marketplaceClient.listPlugins.query();
  } catch (e) {
    if (!isMockMode()) throw e;
    log.warn("[MOCK MODE] Failed to fetch all plugins, using mock data", e);
    return getMockPlugins();
  }
}

export async function updatePlugin(req: UpdatePluginRequest): Promise<AdminPlugin> {
  try {
    return await marketplaceClient.updatePlugin.mutate(req);
  } catch (e) {
    if (!isMockMode()) throw e;
    log.warn("[MOCK MODE] Failed to update plugin, using mock fallback", e);
    const plugins = getMockPlugins();
    const idx = plugins.findIndex((p) => p.id === req.id);
    if (idx === -1) throw new Error(`Plugin not found: ${req.id}`);
    const plugin = plugins[idx];
    if (req.enabled !== undefined) plugin.enabled = req.enabled;
    if (req.featured !== undefined) plugin.featured = req.featured;
    if (req.sort_order !== undefined) plugin.sort_order = req.sort_order;
    if (req.notes !== undefined) plugin.notes = req.notes;
    if (req.reviewed !== undefined) plugin.reviewed = req.reviewed;
    if (req.enabled && !plugin.enabled_at) plugin.enabled_at = Date.now();
    return structuredClone(plugin);
  }
}

export async function addPluginByNpm(req: AddPluginRequest): Promise<AdminPlugin> {
  try {
    return await marketplaceClient.addPlugin.mutate(req);
  } catch (e) {
    if (!isMockMode()) throw e;
    log.warn("[MOCK MODE] Failed to add plugin via API, using mock fallback", e);
    const newPlugin: AdminPlugin = {
      id: `manual-${Date.now()}`,
      npm_package: req.npm_package,
      name: req.npm_package.split("/").pop() ?? req.npm_package,
      description: "Manually added plugin — metadata will be fetched on next sync.",
      version: "0.0.0",
      author: "Unknown",
      category: "utility",
      icon_url: null,
      enabled: false,
      featured: false,
      sort_order: 99,
      notes: "",
      superpower_md: null,
      discovered_at: Date.now(),
      enabled_at: null,
      reviewed: false,
    };
    return structuredClone(newPlugin);
  }
}

export async function reorderPlugins(orderedIds: string[]): Promise<void> {
  try {
    await Promise.all(
      orderedIds.map((id, i) => marketplaceClient.updatePlugin.mutate({ id, sort_order: i })),
    );
  } catch (e) {
    if (!isMockMode()) throw e;
    // No-op in mock mode: state is not persisted between calls
  }
}
