// --- Plugin Manifest types ---

export type PluginCategory =
  | "channel"
  | "provider"
  | "voice"
  | "memory"
  | "context"
  | "webhook"
  | "integration"
  | "ui"
  | "moderation"
  | "analytics";

export type SetupFlowType = "paste" | "oauth" | "qr" | "interactive";

export interface ConfigSchemaField {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "select";
  required: boolean;
  secret?: boolean;
  setupFlow?: SetupFlowType;
  placeholder?: string;
  description?: string;
  default?: string | number | boolean;
  options?: { label: string; value: string }[];
  validation?: { pattern: string; message: string };
  oauthProvider?: string;
}

export interface SetupStep {
  id: string;
  title: string;
  description: string;
  fields: ConfigSchemaField[];
  instruction?: string;
  externalUrl?: string;
}

export type MarketplaceTab = "superpower" | "channel" | "capability" | "utility";

export const MARKETPLACE_TABS: { id: MarketplaceTab; label: string }[] = [
  { id: "superpower", label: "Superpowers" },
  { id: "channel", label: "Channels" },
  { id: "capability", label: "Capabilities" },
  { id: "utility", label: "Utilities" },
];

export interface PluginManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  icon: string;
  color: string;
  category: PluginCategory;
  tags: string[];
  capabilities: string[];
  requires: { id: string; label: string }[];
  install: string[];
  configSchema: ConfigSchemaField[];
  setup: SetupStep[];
  installCount: number;
  changelog: { version: string; date: string; notes: string }[];
  connectionTest?: {
    label: string;
    endpoint: string;
  };
  /** Outcome-first headline for the superpower surface */
  superpowerHeadline?: string;
  /** One punchy tagline sentence */
  superpowerTagline?: string;
  /** Long-form markdown content (from SUPERPOWER.md) */
  superpowerMarkdown?: string;
  /** User-facing outcome bullets */
  superpowerOutcomes?: string[];
  /** Marketplace category for the 4-tab nav */
  marketplaceTab?: MarketplaceTab;
}

// --- Hosted Adapter Registry ---
// Capabilities that have WOPR-hosted adapter options.
// When a plugin declares a capability listed here, it gets a "WOPR Hosted Available" badge
// and the install flow shows a "WOPR Hosted" option for that capability.

export interface HostedAdapter {
  capability: string;
  label: string;
  description: string;
  pricing: string;
}

export const HOSTED_ADAPTERS: HostedAdapter[] = [
  {
    capability: "llm",
    label: "WOPR Hosted LLM",
    description: "Managed LLM inference with automatic model routing.",
    pricing: "Pay-per-token",
  },
  {
    capability: "tts",
    label: "WOPR Hosted TTS",
    description: "Managed text-to-speech synthesis.",
    pricing: "Pay-per-character",
  },
  {
    capability: "stt",
    label: "WOPR Hosted STT",
    description: "Managed speech-to-text transcription.",
    pricing: "Pay-per-minute",
  },
  {
    capability: "embeddings",
    label: "WOPR Hosted Embeddings",
    description: "Managed vector embeddings for semantic search.",
    pricing: "Pay-per-request",
  },
  {
    capability: "image-gen",
    label: "WOPR Hosted Image Generation",
    description: "Managed image generation.",
    pricing: "Pay-per-image",
  },
];

export function getHostedAdaptersForCapabilities(capabilities: string[]): HostedAdapter[] {
  return HOSTED_ADAPTERS.filter((a) => capabilities.includes(a.capability));
}

export function hasHostedOption(capabilities: string[]): boolean {
  return HOSTED_ADAPTERS.some((a) => capabilities.includes(a.capability));
}

// --- Capability Color Map ---
// Consistent color-coded badges for capability types across all marketplace surfaces.

export const CAPABILITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  channel: { bg: "bg-blue-500/15", text: "text-blue-500", border: "border-blue-500/25" },
  llm: { bg: "bg-purple-500/15", text: "text-purple-500", border: "border-purple-500/25" },
  tts: { bg: "bg-amber-500/15", text: "text-amber-500", border: "border-amber-500/25" },
  stt: { bg: "bg-cyan-500/15", text: "text-cyan-500", border: "border-cyan-500/25" },
  voice: { bg: "bg-pink-500/15", text: "text-pink-500", border: "border-pink-500/25" },
  memory: { bg: "bg-violet-500/15", text: "text-violet-500", border: "border-violet-500/25" },
  embeddings: { bg: "bg-indigo-500/15", text: "text-indigo-500", border: "border-indigo-500/25" },
  webhook: { bg: "bg-yellow-500/15", text: "text-yellow-500", border: "border-yellow-500/25" },
  integration: { bg: "bg-orange-500/15", text: "text-orange-500", border: "border-orange-500/25" },
  ui: { bg: "bg-sky-500/15", text: "text-sky-500", border: "border-sky-500/25" },
  moderation: { bg: "bg-red-500/15", text: "text-red-500", border: "border-red-500/25" },
  analytics: { bg: "bg-emerald-500/15", text: "text-emerald-500", border: "border-emerald-500/25" },
  "image-gen": {
    bg: "bg-fuchsia-500/15",
    text: "text-fuchsia-500",
    border: "border-fuchsia-500/25",
  },
};

export function getCapabilityColor(cap: string) {
  return (
    CAPABILITY_COLORS[cap] ?? {
      bg: "bg-muted",
      text: "text-muted-foreground",
      border: "border-border",
    }
  );
}

// --- Categories list derived from manifests ---

export const ALL_CATEGORIES: { id: PluginCategory; label: string }[] = [
  { id: "channel", label: "Channel" },
  { id: "provider", label: "Provider" },
  { id: "voice", label: "Voice" },
  { id: "memory", label: "Memory" },
  { id: "context", label: "Context" },
  { id: "webhook", label: "Webhook" },
  { id: "integration", label: "Integration" },
  { id: "ui", label: "UI" },
  { id: "moderation", label: "Moderation" },
  { id: "analytics", label: "Analytics" },
];

// --- API functions (mock-first, same pattern as api.ts) ---

import { fleetFetch } from "./api";
import { API_BASE_URL } from "./api-config";
import { handleUnauthorized } from "./fetch-utils";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (res.status === 401) {
    handleUnauthorized();
  }
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export interface BotSummary {
  id: string;
  name: string;
  state: string;
}

export async function listBots(): Promise<BotSummary[]> {
  const data = await fleetFetch<{ bots: BotSummary[] }>("/bots");
  return data.bots;
}

export async function listMarketplacePlugins(): Promise<PluginManifest[]> {
  return apiFetch<PluginManifest[]>("/marketplace/plugins");
}

export interface PluginContentResponse {
  markdown: string;
  source: "superpower_md" | "manifest_description";
  version: string;
}

export async function getPluginContent(pluginId: string): Promise<PluginContentResponse | null> {
  try {
    return await apiFetch<PluginContentResponse>(`/marketplace/plugins/${pluginId}/content`);
  } catch {
    return null;
  }
}

export async function getMarketplacePlugin(id: string): Promise<PluginManifest | null> {
  return apiFetch<PluginManifest>(`/marketplace/plugins/${id}`);
}

export async function installPlugin(
  pluginId: string,
  botId: string,
  config: Record<string, unknown>,
  providerChoices: Record<string, string>,
): Promise<{ success: boolean; botId: string; pluginId: string; installedPlugins: string[] }> {
  return fleetFetch(`/bots/${botId}/plugins/${pluginId}`, {
    method: "POST",
    body: JSON.stringify({ config, providerChoices }),
  });
}

/** Fetch installed plugins for a bot, with enabled state. */
export async function listInstalledPlugins(
  botId: string,
): Promise<{ pluginId: string; enabled: boolean }[]> {
  const data = await fleetFetch<{
    botId: string;
    plugins: { pluginId: string; enabled: boolean }[];
  }>(`/bots/${botId}/plugins`);
  return data.plugins;
}

/** Toggle a plugin's enabled state on a bot. */
export async function togglePluginEnabled(
  botId: string,
  pluginId: string,
  enabled: boolean,
): Promise<void> {
  await fleetFetch(`/bots/${botId}/plugins/${pluginId}`, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
}

export function formatInstallCount(count: number): string {
  if (count >= 10000) return `${(count / 1000).toFixed(1)}k`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}
