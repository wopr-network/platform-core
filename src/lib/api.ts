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

export async function testCapabilityKey(capability: CapabilityName): Promise<{ valid: boolean }> {
  return apiFetch<{ valid: boolean }>(`/settings/capabilities/${capability}/test`, {
    method: "POST",
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
