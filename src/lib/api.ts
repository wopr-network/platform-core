import { API_BASE_URL } from "./api-config";

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

export interface InstanceTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  defaultPlugins: string[];
}

// --- API client ---

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// --- Instance API ---

export async function listInstances(): Promise<Instance[]> {
  return apiFetch<Instance[]>("/fleet/bots");
}

export async function getInstance(id: string): Promise<InstanceDetail> {
  return apiFetch<InstanceDetail>(`/fleet/bots/${id}`);
}

export async function createInstance(data: {
  name: string;
  template: string;
  provider: string;
  channels: string[];
  plugins: string[];
}): Promise<Instance> {
  return apiFetch<Instance>("/fleet/bots", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function controlInstance(
  id: string,
  action: "start" | "stop" | "restart" | "destroy",
): Promise<void> {
  await apiFetch(`/fleet/bots/${id}/${action}`, { method: "POST" });
}

export async function listTemplates(): Promise<InstanceTemplate[]> {
  return apiFetch<InstanceTemplate[]>("/templates");
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
  return apiFetch<InstanceHealth>(`/fleet/bots/${id}/health`);
}

export async function getInstanceLogs(
  id: string,
  params?: { level?: LogLevel; source?: string; search?: string },
): Promise<LogEntry[]> {
  const qs = new URLSearchParams();
  if (params?.level) qs.set("level", params.level);
  if (params?.source) qs.set("source", params.source);
  if (params?.search) qs.set("search", params.search);
  const query = qs.toString();
  return apiFetch<LogEntry[]>(`/fleet/bots/${id}/logs${query ? `?${query}` : ""}`);
}

export async function getInstanceMetrics(id: string): Promise<InstanceMetrics> {
  return apiFetch<InstanceMetrics>(`/fleet/bots/${id}/metrics`);
}

export async function getFleetHealth(): Promise<FleetInstance[]> {
  return apiFetch<FleetInstance[]>("/fleet/bots/health");
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
  return apiFetch<UserProfile>("/settings/profile");
}

export async function updateProfile(
  data: Partial<Pick<UserProfile, "name" | "email">>,
): Promise<UserProfile> {
  return apiFetch<UserProfile>("/settings/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await apiFetch("/settings/profile/password", { method: "POST", body: JSON.stringify(data) });
}

export async function deleteAccount(): Promise<void> {
  await apiFetch("/settings/profile", { method: "DELETE" });
}

export async function listProviderKeys(): Promise<ProviderKey[]> {
  return apiFetch<ProviderKey[]>("/settings/providers");
}

export async function testProviderKey(id: string): Promise<{ valid: boolean }> {
  return apiFetch<{ valid: boolean }>(`/settings/providers/${id}/test`, { method: "POST" });
}

export async function removeProviderKey(id: string): Promise<void> {
  await apiFetch(`/settings/providers/${id}`, { method: "DELETE" });
}

export async function saveProviderKey(provider: string, key: string): Promise<ProviderKey> {
  return apiFetch<ProviderKey>("/settings/providers", {
    method: "POST",
    body: JSON.stringify({ provider, key }),
  });
}

export async function updateProviderModel(id: string, model: string): Promise<void> {
  await apiFetch(`/settings/providers/${id}/model`, {
    method: "PATCH",
    body: JSON.stringify({ model }),
  });
}

export async function listApiKeys(): Promise<PlatformApiKey[]> {
  return apiFetch<PlatformApiKey[]>("/settings/api-keys");
}

export async function createApiKey(data: {
  name: string;
  scope: string;
  expiration: string;
}): Promise<{ key: PlatformApiKey; secret: string }> {
  return apiFetch<{ key: PlatformApiKey; secret: string }>("/settings/api-keys", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function revokeApiKey(id: string): Promise<void> {
  await apiFetch(`/settings/api-keys/${id}`, { method: "DELETE" });
}

export async function connectOauthProvider(provider: string): Promise<void> {
  await apiFetch(`/settings/profile/oauth/${provider}/connect`, { method: "POST" });
}

export async function disconnectOauthProvider(provider: string): Promise<void> {
  await apiFetch(`/settings/profile/oauth/${provider}/disconnect`, { method: "POST" });
}

export async function getOrganization(): Promise<Organization> {
  return apiFetch<Organization>("/settings/org");
}

export async function updateOrganization(
  data: Partial<Pick<Organization, "name" | "billingEmail">>,
): Promise<Organization> {
  return apiFetch<Organization>("/settings/org", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function inviteMember(email: string, role: string): Promise<OrgMember> {
  return apiFetch<OrgMember>("/settings/org/members", {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
}

export async function removeMember(id: string): Promise<void> {
  await apiFetch(`/settings/org/members/${id}`, { method: "DELETE" });
}

export async function transferOwnership(memberId: string): Promise<void> {
  await apiFetch("/settings/org/transfer", {
    method: "POST",
    body: JSON.stringify({ memberId }),
  });
}

// --- Billing types ---

export type PlanTier = "free" | "pro" | "team" | "enterprise";

export interface PlanFeatures {
  instanceCap: number | null;
  channels: string;
  plugins: string;
  support: string;
  extras: string[];
}

export interface Plan {
  id: string;
  tier: PlanTier;
  name: string;
  price: number | null;
  priceLabel: string;
  features: PlanFeatures;
  recommended?: boolean;
}

export interface BillingUsage {
  plan: PlanTier;
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

// --- Billing API ---

export async function getPlans(): Promise<Plan[]> {
  return apiFetch<Plan[]>("/billing/plans");
}

export async function getCurrentPlan(): Promise<PlanTier> {
  const res = await apiFetch<{ tier: PlanTier }>("/billing/current-plan");
  return res.tier;
}

export async function changePlan(tier: PlanTier): Promise<void> {
  await apiFetch("/billing/change-plan", {
    method: "POST",
    body: JSON.stringify({ tier }),
  });
}

export async function getBillingUsage(): Promise<BillingUsage> {
  return apiFetch<BillingUsage>("/billing/usage");
}

export async function getProviderCosts(): Promise<ProviderCost[]> {
  return apiFetch<ProviderCost[]>("/billing/provider-costs");
}

export async function getUsageHistory(days?: number): Promise<UsageDataPoint[]> {
  const qs = days ? `?days=${days}` : "";
  return apiFetch<UsageDataPoint[]>(`/billing/usage-history${qs}`);
}

export async function getBillingInfo(): Promise<BillingInfo> {
  return apiFetch<BillingInfo>("/billing/info");
}

export async function updateBillingEmail(email: string): Promise<void> {
  await apiFetch("/billing/email", {
    method: "PATCH",
    body: JSON.stringify({ email }),
  });
}

export async function removePaymentMethod(id: string): Promise<void> {
  await apiFetch(`/billing/payment-methods/${id}`, { method: "DELETE" });
}

export async function createSetupIntent(): Promise<{ clientSecret: string }> {
  return apiFetch<{ clientSecret: string }>("/billing/setup-intent", { method: "POST" });
}

export async function createBillingPortalSession(): Promise<{ url: string }> {
  return apiFetch<{ url: string }>("/billing/portal-session", { method: "POST" });
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

// --- Credits API ---

export async function getCreditBalance(): Promise<CreditBalance> {
  return apiFetch<CreditBalance>("/billing/credits");
}

export async function getCreditHistory(cursor?: string): Promise<CreditHistoryResponse> {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return apiFetch<CreditHistoryResponse>(`/billing/credits/history${qs}`);
}

export async function createCreditCheckout(amount: number): Promise<CheckoutResponse> {
  return apiFetch<CheckoutResponse>("/billing/credits/checkout", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

// --- Hosted usage API ---

export async function getInferenceMode(): Promise<InferenceMode> {
  const res = await apiFetch<{ mode: InferenceMode }>("/billing/inference-mode");
  return res.mode;
}

export async function getHostedUsageSummary(): Promise<HostedUsageSummary> {
  return apiFetch<HostedUsageSummary>("/billing/hosted-usage");
}

export async function getHostedUsageEvents(params?: {
  capability?: HostedCapability;
  from?: string;
  to?: string;
}): Promise<HostedUsageEvent[]> {
  const qs = new URLSearchParams();
  if (params?.capability) qs.set("capability", params.capability);
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  const query = qs.toString();
  return apiFetch<HostedUsageEvent[]>(`/billing/hosted-usage/events${query ? `?${query}` : ""}`);
}

export async function getSpendingLimits(): Promise<SpendingLimits> {
  return apiFetch<SpendingLimits>("/billing/spending-limits");
}

export async function updateSpendingLimits(limits: SpendingLimits): Promise<void> {
  await apiFetch("/billing/spending-limits", {
    method: "PUT",
    body: JSON.stringify(limits),
  });
}

// --- Model selection types ---

export interface ModelSelection {
  modelId: string;
  providerId: string;
  mode: "hosted" | "byok";
}

// --- Model selection API ---

export async function getModelSelection(): Promise<ModelSelection> {
  return apiFetch<ModelSelection>("/settings/model");
}

export async function updateModelSelection(data: ModelSelection): Promise<ModelSelection> {
  return apiFetch<ModelSelection>("/settings/model", {
    method: "PUT",
    body: JSON.stringify(data),
  });
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
    const res = await fetch("https://api.elevenlabs.io/v1/user", {
      method: "GET",
      headers: { "xi-api-key": key },
    });
    if (res.ok) {
      return { valid: true };
    }
    if (res.status === 401 || res.status === 403) {
      return { valid: false, message: "Invalid API key. Please check and try again." };
    }
    return { valid: false, message: `Unexpected response (${res.status}). Please try again.` };
  } catch {
    return { valid: false, message: "Could not reach ElevenLabs. Check your connection." };
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
