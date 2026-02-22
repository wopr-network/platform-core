import { API_BASE_URL, PLATFORM_BASE_URL } from "./api-config";
import { handleUnauthorized } from "./fetch-utils";
import type { ApiPricingResponse } from "./pricing-data";
import { trpcVanilla } from "./trpc";

export { UnauthorizedError } from "./fetch-utils";

// --- Public pricing API (no auth required) ---

/**
 * Fetch live pricing rates from the backend.
 * Returns null if the fetch fails (caller should fall back to static data).
 * Uses no-store to bypass Next.js cache and get fresh rates every request.
 */
export async function fetchPublicPricing(): Promise<ApiPricingResponse | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/pricing`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as ApiPricingResponse;
  } catch {
    return null;
  }
}

export type InstanceStatus = "running" | "stopped" | "degraded" | "error";

export interface Instance {
  id: string;
  name: string;
  template: string;
  status: InstanceStatus;
  provider: string;
  channels: string[];
  plugins: PluginInfo[];
  uptime: number | null;
  createdAt: string;
}

export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
}

export interface ChannelInfo {
  id: string;
  name: string;
  type: string;
  status: "connected" | "disconnected" | "error";
}

export interface SessionInfo {
  id: string;
  userId: string;
  messageCount: number;
  startedAt: string;
  lastActivityAt: string;
}

export interface InstanceDetail extends Instance {
  config: Record<string, unknown>;
  channelDetails: ChannelInfo[];
  sessions: SessionInfo[];
  resourceUsage: {
    memoryMb: number;
    cpuPercent: number;
  };
}

// --- API client ---

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (res.status === 401) {
    handleUnauthorized();
  }
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function fleetFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${PLATFORM_BASE_URL}/fleet${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (res.status === 401) {
    handleUnauthorized();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `API error: ${res.status} ${res.statusText}`,
    );
  }
  return res.json() as Promise<T>;
}

// --- Instance API ---

/** Shape returned by GET /fleet/bots on the backend */
interface BotStatusResponse {
  id: string;
  name: string;
  state: string;
  health: string | null;
  uptime: string | null;
  startedAt: string | null;
  createdAt?: string;
  env?: Record<string, string>;
  stats: {
    cpuPercent: number;
    memoryUsageMb: number;
    memoryLimitMb: number;
    memoryPercent: number;
  } | null;
  [key: string]: unknown;
}

/** Parse channel IDs from bot env vars (WOPR_PLUGINS_CHANNELS is comma-separated). */
function parseChannelsFromEnv(env: Record<string, string> | undefined): string[] {
  const raw = env?.WOPR_PLUGINS_CHANNELS;
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Parse plugin IDs from bot env vars (WOPR_PLUGINS_OTHER + WOPR_PLUGINS_VOICE are comma-separated). */
function parsePluginsFromEnv(env: Record<string, string> | undefined): PluginInfo[] {
  if (!env) return [];
  const ids = new Set<string>();
  for (const key of ["WOPR_PLUGINS_OTHER", "WOPR_PLUGINS_VOICE", "WOPR_PLUGINS_PROVIDERS"]) {
    const raw = env[key];
    if (raw) {
      for (const id of raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)) {
        ids.add(id);
      }
    }
  }
  return [...ids].map((id) => ({ id, name: id, version: "", enabled: true }));
}

// Typed stub for the fleet portion of the tRPC vanilla client.
// AppRouter is currently an empty placeholder — real types come when @wopr-network/sdk ships.
interface FleetClient {
  fleet: {
    listInstances: { query(): Promise<unknown> };
    getInstance: { query(input: { id: string }): Promise<unknown> };
    createInstance: { mutate(input: Record<string, unknown>): Promise<unknown> };
    controlInstance: {
      mutate(input: { id: string; action: "start" | "stop" | "restart" }): Promise<unknown>;
    };
    getInstanceHealth: { query(input: { id: string }): Promise<unknown> };
    getInstanceLogs: { query(input: { id: string; tail?: number }): Promise<unknown> };
    getInstanceMetrics: { query(input: { id: string }): Promise<unknown> };
    listTemplates: { query(): Promise<unknown> };
  };
}

function mapBotState(state: string): InstanceStatus {
  if (state === "running") return "running";
  if (state === "error" || state === "dead") return "error";
  return "stopped";
}

function mapBotStatusToFleetInstance(bot: BotStatusResponse): FleetInstance {
  const status = mapBotState(bot.state);

  let health: HealthStatus;
  if (bot.health === "healthy") health = "healthy";
  else if (bot.health === "unhealthy") health = "unhealthy";
  else if (bot.health === "degraded" || bot.health === "starting") health = "degraded";
  else if (status === "running") health = "healthy";
  else if (status === "stopped" || status === "error") health = "degraded";
  else health = "healthy";

  let uptime: number | null = null;
  if (bot.uptime) {
    const startedMs = new Date(bot.uptime).getTime();
    if (!Number.isNaN(startedMs)) {
      uptime = Math.floor((Date.now() - startedMs) / 1000);
    }
  }

  return {
    id: bot.id,
    name: bot.name,
    status,
    health,
    uptime,
    pluginCount: 0,
    sessionCount: 0,
    provider: "",
  };
}

export async function listInstances(): Promise<Instance[]> {
  const data = await (trpcVanilla as unknown as FleetClient).fleet.listInstances.query();
  const bots = (data as { bots: BotStatusResponse[] }).bots ?? [];
  return bots.map((bot) => ({
    id: bot.id,
    name: bot.name,
    template: "",
    status: mapBotState(bot.state),
    provider: "",
    channels: parseChannelsFromEnv(bot.env),
    plugins: parsePluginsFromEnv(bot.env),
    uptime: (() => {
      const ms = bot.uptime ? new Date(bot.uptime).getTime() : NaN;
      return Number.isNaN(ms) ? null : Math.floor((Date.now() - ms) / 1000);
    })(),
    createdAt: (bot.createdAt as string | undefined) ?? new Date().toISOString(),
  }));
}

export async function getInstance(id: string): Promise<InstanceDetail> {
  const bot = (await (trpcVanilla as unknown as FleetClient).fleet.getInstance.query({
    id,
  })) as BotStatusResponse;
  const uptimeMs = bot.uptime ? new Date(bot.uptime).getTime() : NaN;
  return {
    id: bot.id,
    name: bot.name,
    template: "",
    status: mapBotState(bot.state),
    provider: "",
    channels: [],
    plugins: [],
    uptime: Number.isNaN(uptimeMs) ? null : Math.floor((Date.now() - uptimeMs) / 1000),
    createdAt: (bot.createdAt as string | undefined) ?? new Date().toISOString(),
    config: {},
    channelDetails: [],
    sessions: [],
    resourceUsage: {
      memoryMb: bot.stats?.memoryUsageMb ?? 0,
      cpuPercent: bot.stats?.cpuPercent ?? 0,
    },
  };
}

export async function createInstance(data: {
  name: string;
  template: string;
  provider: string;
  channels: string[];
  plugins: string[];
}): Promise<Instance> {
  const result = await (trpcVanilla as unknown as FleetClient).fleet.createInstance.mutate(data);
  const profile = result as Record<string, unknown>;
  return {
    id: (profile.id as string) ?? "",
    name: (profile.name as string) ?? data.name,
    template: data.template,
    status: "stopped",
    provider: data.provider,
    channels: data.channels,
    plugins: data.plugins.map((id) => ({ id, name: id, version: "", enabled: true })),
    uptime: null,
    createdAt: new Date().toISOString(),
  };
}

/** Payload for deploying a bot from onboarding. */
export interface DeployBotPayload {
  name: string;
  description?: string;
  env?: Record<string, string>;
}

/**
 * Deploy a new bot instance via tRPC fleet.createInstance.
 * Uses the default stable WOPR image. tenantId is injected server-side.
 */
export async function deployInstance(payload: DeployBotPayload): Promise<Instance> {
  const input = {
    name: payload.name,
    image: "ghcr.io/wopr-network/wopr:stable",
    description: payload.description ?? "",
    env: payload.env ?? {},
  };
  const result = await (trpcVanilla as unknown as FleetClient).fleet.createInstance.mutate(input);
  const profile = result as Record<string, unknown>;
  return {
    id: (profile.id as string) ?? "",
    name: (profile.name as string) ?? payload.name,
    template: "",
    status: "stopped",
    provider: "",
    channels: [],
    plugins: [],
    uptime: null,
    createdAt: new Date().toISOString(),
  };
}

// --- Channel QR polling API ---

export type ChannelQrStatus = "pending" | "connected" | "expired" | "no-session";

export interface ChannelQrResponse {
  qrPng: string | null;
  status: ChannelQrStatus;
}

/** Poll the platform for the current QR code state for a given bot instance. */
export async function pollChannelQr(botId: string): Promise<ChannelQrResponse> {
  const res = await fetch(`${PLATFORM_BASE_URL}/api/channels/${encodeURIComponent(botId)}/qr`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<ChannelQrResponse>;
}

// --- Channel API ---

/** Connect a channel (plugin) to a bot instance. */
export async function connectChannel(
  botId: string,
  pluginId: string,
  credentials: Record<string, string>,
): Promise<ChannelInfo> {
  return fleetFetch<ChannelInfo>(`/bots/${botId}/channels/${pluginId}`, {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

/** Test channel credentials against the provider API before connecting. */
export async function testChannelConnection(
  pluginId: string,
  credentials: Record<string, string>,
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${PLATFORM_BASE_URL}/api/channels/${pluginId}/test`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credentials }),
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<{ success: boolean; error?: string }>;
}

/** List channels connected to a bot instance. */
export async function listChannels(botId: string): Promise<ChannelInfo[]> {
  return fleetFetch<ChannelInfo[]>(`/bots/${botId}/channels`);
}

export async function controlInstance(
  id: string,
  action: "start" | "stop" | "restart" | "destroy",
): Promise<void> {
  if (action === "destroy") {
    // TODO(WOP-816): destroyInstance tRPC procedure does not exist on the server yet
    // Server fleet router only accepts start | stop | restart via controlInstance
    await fleetFetch(`/bots/${id}`, { method: "DELETE" });
  } else {
    await (trpcVanilla as unknown as FleetClient).fleet.controlInstance.mutate({ id, action });
  }
}

// --- Observability types ---

export type HealthStatus = "healthy" | "degraded" | "unhealthy";
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface PluginHealth {
  name: string;
  status: HealthStatus;
  latencyMs: number | null;
  lastCheck: string;
}

export interface ProviderHealth {
  name: string;
  available: boolean;
  latencyMs: number | null;
}

export interface HealthHistoryEntry {
  timestamp: string;
  status: HealthStatus;
}

export interface InstanceHealth {
  status: HealthStatus;
  uptime: number;
  activeSessions: number;
  totalSessions: number;
  plugins: PluginHealth[];
  providers: ProviderHealth[];
  history: HealthHistoryEntry[];
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
}

export interface MetricsSnapshot {
  timestamp: string;
  requestCount: number;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  activeSessions: number;
  memoryMb: number;
}

export interface TokenUsage {
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
}

export interface PluginEventCount {
  plugin: string;
  count: number;
}

export interface InstanceMetrics {
  timeseries: MetricsSnapshot[];
  tokenUsage: TokenUsage[];
  pluginEvents: PluginEventCount[];
}

export interface FleetInstance {
  id: string;
  name: string;
  status: InstanceStatus;
  health: HealthStatus;
  uptime: number | null;
  pluginCount: number;
  sessionCount: number;
  provider: string;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  targetHref: string;
}

export interface FleetResources {
  totalCpuPercent: number;
  totalMemoryMb: number;
  memoryCapacityMb: number;
}

// --- Observability API ---

export async function getInstanceHealth(id: string): Promise<InstanceHealth> {
  const data = await (trpcVanilla as unknown as FleetClient).fleet.getInstanceHealth.query({ id });
  const res = data as {
    id: string;
    state: string;
    health: string | null;
    uptime: string | null;
    stats: { cpuPercent: number; memoryUsageMb: number } | null;
  };

  let healthStatus: HealthStatus;
  if (res.health === "healthy") healthStatus = "healthy";
  else if (res.health === "unhealthy") healthStatus = "unhealthy";
  else healthStatus = "degraded";

  let uptime = 0;
  if (res.uptime) {
    const ms = new Date(res.uptime).getTime();
    if (!Number.isNaN(ms)) {
      uptime = Math.floor((Date.now() - ms) / 1000);
    }
  }

  return {
    status: healthStatus,
    uptime,
    activeSessions: 0,
    totalSessions: 0,
    plugins: [],
    providers: [],
    history: [],
  };
}

export async function getInstanceLogs(
  id: string,
  params?: { level?: LogLevel; source?: string; search?: string },
): Promise<LogEntry[]> {
  const data = await (trpcVanilla as unknown as FleetClient).fleet.getInstanceLogs.query({
    id,
    tail: 100,
  });
  const rawLogs = (data as { logs: string[] }).logs ?? [];

  // Parse raw container log strings into structured LogEntry objects
  // Format: "2026-02-20T10:00:00Z [LEVEL] message" or plain text
  let entries: LogEntry[] = rawLogs.map((line, i) => {
    const match = line.match(/^(\S+)\s+\[(\w+)]\s+(.*)$/);
    if (match) {
      const level = match[2].toLowerCase();
      return {
        id: `log-${i}`,
        timestamp: match[1],
        level: (["debug", "info", "warn", "error"].includes(level) ? level : "info") as LogLevel,
        source: "container",
        message: match[3],
      };
    }
    return {
      id: `log-${i}`,
      timestamp: new Date().toISOString(),
      level: "info" as LogLevel,
      source: "container",
      message: line,
    };
  });

  // Apply client-side filters (server doesn't support them via tRPC)
  if (params?.level) {
    entries = entries.filter((e) => e.level === params.level);
  }
  if (params?.source) {
    entries = entries.filter((e) => e.source === params.source);
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    entries = entries.filter((e) => e.message.toLowerCase().includes(q));
  }

  return entries;
}

export async function getInstanceMetrics(id: string): Promise<InstanceMetrics> {
  const data = await (trpcVanilla as unknown as FleetClient).fleet.getInstanceMetrics.query({ id });
  const res = data as {
    id: string;
    stats: {
      cpuPercent: number;
      memoryUsageMb: number;
      memoryLimitMb: number;
      memoryPercent: number;
    } | null;
  };

  // Build a single-point timeseries from current stats
  const snapshot: MetricsSnapshot = {
    timestamp: new Date().toISOString(),
    requestCount: 0,
    latencyP50: 0,
    latencyP95: 0,
    latencyP99: 0,
    activeSessions: 0,
    memoryMb: res.stats?.memoryUsageMb ?? 0,
  };

  return {
    timeseries: [snapshot],
    tokenUsage: [],
    pluginEvents: [],
  };
}

export async function getFleetHealth(): Promise<FleetInstance[]> {
  const data = await (trpcVanilla as unknown as FleetClient).fleet.listInstances.query();
  const bots = (data as { bots: BotStatusResponse[] }).bots ?? [];
  return bots.map(mapBotStatusToFleetInstance);
}

export async function getActivityFeed(): Promise<ActivityEvent[]> {
  return apiFetch<ActivityEvent[]>("/activity");
}

export async function getFleetResources(): Promise<FleetResources> {
  return apiFetch<FleetResources>("/fleet/resources");
}

// --- Settings types ---

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  oauthConnections: { provider: string; connected: boolean }[];
}

export interface ProviderKey {
  id: string;
  provider: string;
  maskedKey: string;
  status: "valid" | "invalid" | "unchecked";
  lastChecked: string | null;
  defaultModel: string | null;
  models: string[];
}

export interface PlatformApiKey {
  id: string;
  name: string;
  prefix: string;
  scope: "read-only" | "full" | "instances";
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
}

export interface OrgMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "viewer";
  joinedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  billingEmail: string;
  members: OrgMember[];
}

// --- Settings API ---

export async function getProfile(): Promise<UserProfile> {
  // NOTE: add tRPC procedure
  return apiFetch<UserProfile>("/settings/profile");
}

export async function updateProfile(
  data: Partial<Pick<UserProfile, "name" | "email">>,
): Promise<UserProfile> {
  // NOTE: add tRPC procedure
  return apiFetch<UserProfile>("/settings/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  // NOTE: add tRPC procedure
  await apiFetch("/settings/profile/password", { method: "POST", body: JSON.stringify(data) });
}

export async function deleteAccount(): Promise<void> {
  // NOTE: add tRPC procedure
  await apiFetch("/settings/profile", { method: "DELETE" });
}

export async function listProviderKeys(): Promise<ProviderKey[]> {
  // NOTE: add tRPC procedure
  return apiFetch<ProviderKey[]>("/settings/providers");
}

export async function testProviderKey(id: string): Promise<{ valid: boolean }> {
  // NOTE: add tRPC procedure
  return apiFetch<{ valid: boolean }>(`/settings/providers/${id}/test`, { method: "POST" });
}

export async function removeProviderKey(id: string, provider: string): Promise<void> {
  try {
    await deleteTenantKey(provider);
  } catch {
    // tenant-key may not exist if it was never stored there -- continue
  }
  await apiFetch(`/settings/providers/${id}`, { method: "DELETE" });
}

export async function saveProviderKey(provider: string, key: string): Promise<ProviderKey> {
  await storeTenantKey(provider, key);
  return apiFetch<ProviderKey>("/settings/providers", {
    method: "POST",
    body: JSON.stringify({ provider, key }),
  });
}

export async function updateProviderModel(id: string, model: string): Promise<void> {
  // NOTE: add tRPC procedure
  await apiFetch(`/settings/providers/${id}/model`, {
    method: "PATCH",
    body: JSON.stringify({ model }),
  });
}

export async function listApiKeys(): Promise<PlatformApiKey[]> {
  // NOTE: add tRPC procedure
  return apiFetch<PlatformApiKey[]>("/settings/api-keys");
}

export async function createApiKey(data: {
  name: string;
  scope: string;
  expiration: string;
}): Promise<{ key: PlatformApiKey; secret: string }> {
  // NOTE: add tRPC procedure
  return apiFetch<{ key: PlatformApiKey; secret: string }>("/settings/api-keys", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function revokeApiKey(id: string): Promise<void> {
  // NOTE: add tRPC procedure
  await apiFetch(`/settings/api-keys/${id}`, { method: "DELETE" });
}

// --- Billing types ---

export interface BillingUsage {
  plan: string;
  planName: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  instancesRunning: number;
  instanceCap: number;
  storageUsedGb: number;
  storageCapGb: number;
  apiCalls: number;
}

export type HostedCapability = "transcription" | "image_gen" | "text_gen" | "embeddings";

export interface HostedCapabilityUsage {
  capability: HostedCapability;
  label: string;
  units: number;
  unitLabel: string;
  cost: number;
}

export interface HostedUsageSummary {
  periodStart: string;
  periodEnd: string;
  capabilities: HostedCapabilityUsage[];
  totalCost: number;
  includedCredit: number;
  amountDue: number;
}

export interface HostedUsageEvent {
  id: string;
  date: string;
  capability: HostedCapability;
  provider: string;
  units: number;
  unitLabel: string;
  cost: number;
}

export interface SpendingLimit {
  alertAt: number | null;
  hardCap: number | null;
}

export interface SpendingLimits {
  global: SpendingLimit;
  perCapability: Record<HostedCapability, SpendingLimit>;
}

export type InferenceMode = "byok" | "hosted";

export interface InvoiceLineItem {
  capability: string;
  units: number;
  unitPrice: number;
  total: number;
}

export interface ProviderCost {
  provider: string;
  estimatedCost: number;
  inputTokens: number;
  outputTokens: number;
}

export interface UsageDataPoint {
  date: string;
  apiCalls: number;
  instances: number;
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: "paid" | "pending" | "failed";
  downloadUrl: string;
  hostedLineItems?: InvoiceLineItem[];
}

export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

export interface BillingInfo {
  email: string;
  paymentMethods: PaymentMethod[];
  invoices: Invoice[];
}

// --- Billing client (typed stub until @wopr-network/sdk ships) ---

interface BillingProcedures {
  currentPlan: { query(input?: Record<never, never>): Promise<{ tier: string }> };
  providerCosts: { query(input?: Record<never, never>): Promise<ProviderCost[]> };
  billingInfo: { query(input?: Record<never, never>): Promise<BillingInfo> };
  updateBillingEmail: { mutate(input: { email: string }): Promise<{ email: string }> };
  removePaymentMethod: { mutate(input: { id: string }): Promise<{ removed: boolean }> };
  portalSession: {
    mutate(input: { tenant?: string; returnUrl: string }): Promise<{ url: string }>;
  };
  creditsBalance: {
    query(input: { tenant?: string }): Promise<{ tenant: string; balance_cents: number }>;
  };
  creditsHistory: {
    query(input: {
      tenant?: string;
      type?: string;
      from?: number;
      to?: number;
      limit?: number;
      offset?: number;
    }): Promise<{
      entries: Array<{
        id: string;
        tenant: string;
        type: string;
        amount_cents: number;
        reason: string;
        admin_user: string;
        reference_ids: string | null;
        created_at: number;
      }>;
      total: number;
    }>;
  };
  creditsCheckout: {
    mutate(input: {
      tenant?: string;
      priceId: string;
      successUrl: string;
      cancelUrl: string;
    }): Promise<{ url: string | null; sessionId: string }>;
  };
  inferenceMode: { query(input?: Record<never, never>): Promise<{ mode: InferenceMode }> };
  updateSpendingLimits: { mutate(input: SpendingLimits): Promise<SpendingLimits> };
  spendingLimits: { query(input?: Record<never, never>): Promise<SpendingLimits> };
  hostedUsageSummary: { query(input?: Record<never, never>): Promise<HostedUsageSummary> };
  hostedUsageEvents: {
    query(input?: { capability?: string; from?: string; to?: string }): Promise<HostedUsageEvent[]>;
  };
}

const billingClient = (trpcVanilla as unknown as { billing: BillingProcedures }).billing;

// --- Billing API (tRPC) ---

export async function getCurrentPlan(): Promise<string> {
  const res = await billingClient.currentPlan.query();
  return res.tier;
}

export async function getBillingUsage(): Promise<BillingUsage> {
  // NOTE(WOP-687): align backend response shape with UI type
  const plan = await getCurrentPlan();
  return {
    plan,
    planName: plan.charAt(0).toUpperCase() + plan.slice(1),
    billingPeriodStart: new Date(Date.now() - 30 * 86400000).toISOString(),
    billingPeriodEnd: new Date().toISOString(),
    instancesRunning: 0,
    instanceCap: 1,
    storageUsedGb: 0,
    storageCapGb: 1,
    apiCalls: 0,
  };
}

export async function getProviderCosts(): Promise<ProviderCost[]> {
  return billingClient.providerCosts.query();
}

export async function getUsageHistory(_days?: number): Promise<UsageDataPoint[]> {
  // NOTE(WOP-687): backend usageHistory returns Stripe reports, not daily data points
  return [];
}

export async function getBillingInfo(): Promise<BillingInfo> {
  return billingClient.billingInfo.query();
}

export async function updateBillingEmail(email: string): Promise<void> {
  await billingClient.updateBillingEmail.mutate({ email });
}

export async function removePaymentMethod(id: string): Promise<void> {
  await billingClient.removePaymentMethod.mutate({ id });
}

export async function createSetupIntent(): Promise<{ clientSecret: string }> {
  return apiFetch<{ clientSecret: string }>("/billing/setup-intent", { method: "POST" });
}

export async function createBillingPortalSession(): Promise<{ url: string }> {
  return billingClient.portalSession.mutate({
    returnUrl: typeof window !== "undefined" ? window.location.href : "",
  });
}

// --- Capability settings types ---

export type CapabilityName = "transcription" | "image-gen" | "text-gen" | "embeddings";
export type CapabilityMode = "hosted" | "byok";

export interface CapabilitySetting {
  capability: CapabilityName;
  mode: CapabilityMode;
  maskedKey: string | null;
  keyStatus: "valid" | "invalid" | "unchecked" | null;
  provider: string | null;
}

// --- Capability settings API ---

// TODO(WOP-813): migrate to trpc.capabilities.* once server has matching procedures
// Server capabilities router has listKeys/storeKey/deleteKey (raw key CRUD by provider),
// but UI needs capability-level settings (mode, maskedKey, keyStatus). Different data model.
export async function listCapabilities(): Promise<CapabilitySetting[]> {
  return apiFetch<CapabilitySetting[]>("/settings/capabilities");
}

export async function updateCapability(
  capability: CapabilityName,
  data: { mode: CapabilityMode; key?: string },
): Promise<CapabilitySetting> {
  return apiFetch<CapabilitySetting>(`/settings/capabilities/${capability}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function testCapabilityKey(
  capability: CapabilityName,
  key?: string,
): Promise<{ valid: boolean }> {
  return apiFetch<{ valid: boolean }>(`/settings/capabilities/${capability}/test`, {
    method: "POST",
    ...(key ? { body: JSON.stringify({ key }) } : {}),
  });
}

// --- Credits types ---

export interface CreditBalance {
  balance: number;
  dailyBurn: number;
  runway: number | null;
}

export type CreditTransactionType =
  | "purchase"
  | "signup_credit"
  | "bot_runtime"
  | "refund"
  | "bonus"
  | "adjustment";

export interface CreditTransaction {
  id: string;
  type: CreditTransactionType;
  description: string;
  amount: number;
  createdAt: string;
}

export interface CreditHistoryResponse {
  transactions: CreditTransaction[];
  nextCursor: string | null;
}

export interface CheckoutResponse {
  checkoutUrl: string;
}

// --- Credits API (tRPC) ---

export async function getCreditBalance(): Promise<CreditBalance> {
  const res = await billingClient.creditsBalance.query({});
  return {
    balance: res.balance_cents / 100,
    dailyBurn: 0, // NOTE(WOP-687): backend doesn't provide dailyBurn yet
    runway: null, // NOTE(WOP-687): backend doesn't provide runway yet
  };
}

function mapTransactionType(backendType: string): CreditTransactionType {
  const map: Record<string, CreditTransactionType> = {
    grant: "purchase",
    refund: "refund",
    correction: "adjustment",
  };
  return map[backendType] ?? "adjustment";
}

export async function getCreditHistory(_cursor?: string): Promise<CreditHistoryResponse> {
  const res = await billingClient.creditsHistory.query({});
  return {
    transactions: res.entries.map((e) => ({
      id: e.id,
      type: mapTransactionType(e.type),
      description: e.reason,
      amount: e.amount_cents / 100,
      createdAt: new Date(e.created_at * 1000).toISOString(),
    })),
    nextCursor: null, // NOTE(WOP-687): implement cursor-based pagination
  };
}

export async function createCreditCheckout(amount: number): Promise<CheckoutResponse> {
  const res = await billingClient.creditsCheckout.mutate({
    priceId: `credit_${amount}`, // NOTE(WOP-687): map amount to real Stripe price IDs
    successUrl: `${typeof window !== "undefined" ? window.location.origin : ""}/billing/credits?checkout=success`,
    cancelUrl: `${typeof window !== "undefined" ? window.location.origin : ""}/billing/credits?checkout=cancel`,
  });
  const url = res.url;
  if (!url) throw new Error("Portal URL unavailable");
  return { checkoutUrl: url };
}

// --- Hosted usage API (tRPC) ---

export async function getInferenceMode(): Promise<InferenceMode> {
  const res = await billingClient.inferenceMode.query();
  return res.mode;
}

export async function getHostedUsageSummary(): Promise<HostedUsageSummary> {
  return billingClient.hostedUsageSummary.query();
}

export async function getHostedUsageEvents(params?: {
  capability?: HostedCapability;
  from?: string;
  to?: string;
}): Promise<HostedUsageEvent[]> {
  return billingClient.hostedUsageEvents.query(params ?? {});
}

export async function getSpendingLimits(): Promise<SpendingLimits> {
  return billingClient.spendingLimits.query();
}

export async function updateSpendingLimits(limits: SpendingLimits): Promise<void> {
  await billingClient.updateSpendingLimits.mutate({ ...limits });
}

// --- Model selection types ---

export interface ModelSelection {
  modelId: string;
  providerId: string;
  mode: "hosted" | "byok";
}

// --- Model selection API ---

export async function getModelSelection(): Promise<ModelSelection> {
  // NOTE: add tRPC procedure
  return apiFetch<ModelSelection>("/settings/model");
}

export async function updateModelSelection(data: ModelSelection): Promise<ModelSelection> {
  // NOTE: add tRPC procedure
  return apiFetch<ModelSelection>("/settings/model", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// --- Tenant key store API (AES-256-GCM encrypted backend) ---

export interface TenantKeyMeta {
  provider: string;
  hasKey: boolean;
  maskedKey: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export async function listTenantKeys(): Promise<TenantKeyMeta[]> {
  return apiFetch<TenantKeyMeta[]>("/tenant-keys");
}

export async function getTenantKey(provider: string): Promise<TenantKeyMeta> {
  return apiFetch<TenantKeyMeta>(`/tenant-keys/${encodeURIComponent(provider)}`);
}

export async function storeTenantKey(provider: string, key: string): Promise<TenantKeyMeta> {
  return apiFetch<TenantKeyMeta>(`/tenant-keys/${encodeURIComponent(provider)}`, {
    method: "PUT",
    body: JSON.stringify({ key }),
  });
}

export async function deleteTenantKey(provider: string): Promise<void> {
  await apiFetch(`/tenant-keys/${encodeURIComponent(provider)}`, { method: "DELETE" });
}

// --- BYOK key validation ---

export interface KeyValidationResult {
  valid: boolean;
  message?: string;
}

export async function validateDeepgramKey(key: string): Promise<KeyValidationResult> {
  try {
    const result = await testCapabilityKey("transcription", key);
    return result.valid
      ? { valid: true }
      : { valid: false, message: "Invalid API key. Please check and try again." };
  } catch {
    return { valid: false, message: "Could not validate key. Please try again." };
  }
}

export async function validateElevenLabsKey(key: string): Promise<KeyValidationResult> {
  try {
    await storeTenantKey("elevenlabs", key);
    return { valid: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("401") || message.includes("403")) {
      return { valid: false, message: "Invalid API key. Please check and try again." };
    }
    return { valid: false, message: "Could not reach ElevenLabs. Please try again later." };
  }
}

// --- Notification preferences types ---

export interface NotificationPreferences {
  billing_low_balance: boolean;
  billing_receipts: boolean;
  billing_auto_topup: boolean;
  agent_channel_disconnect: boolean;
  agent_status_changes: boolean;
  account_role_changes: boolean;
  account_team_invites: boolean;
}

// --- Notification preferences API (tRPC via HTTP) ---

async function trpcFetch<T>(procedure: string, input?: Record<string, unknown>): Promise<T> {
  const { PLATFORM_BASE_URL } = await import("./api-config");
  const params = new URLSearchParams({ input: JSON.stringify(input ?? {}) });
  const res = await fetch(`${PLATFORM_BASE_URL}/trpc/${procedure}?${params}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (res.status === 401) {
    handleUnauthorized();
  }
  if (!res.ok) throw new Error(`tRPC error: ${res.status} ${res.statusText}`);
  const json = (await res.json()) as { result: { data: T } };
  return json.result.data;
}

async function trpcMutate<T>(procedure: string, input: Record<string, unknown>): Promise<T> {
  const { PLATFORM_BASE_URL } = await import("./api-config");
  const res = await fetch(`${PLATFORM_BASE_URL}/trpc/${procedure}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: input }),
  });
  if (res.status === 401) {
    handleUnauthorized();
  }
  if (!res.ok) throw new Error(`tRPC error: ${res.status} ${res.statusText}`);
  const json = (await res.json()) as { result: { data: T } };
  return json.result.data;
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  return trpcFetch<NotificationPreferences>("settings.notificationPreferences");
}

export async function updateNotificationPreferences(
  prefs: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  return trpcMutate<NotificationPreferences>("settings.updateNotificationPreferences", prefs);
}
