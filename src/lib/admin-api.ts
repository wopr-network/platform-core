import { PLATFORM_BASE_URL } from "./api-config";

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${PLATFORM_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Admin API error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

// ---- Types ----

export interface AdminUserSummary {
  id: string;
  email: string;
  name: string | null;
  tenant_id: string;
  status: string;
  role: string;
  credit_balance_cents: number;
  agent_count: number;
  last_seen: number | null;
  created_at: number;
}

export interface TenantDetailResponse {
  user: AdminUserSummary | null;
  credits: {
    balance_cents: number;
    recent_transactions: { entries: CreditAdjustment[]; total: number };
  };
  status: {
    tenantId: string;
    status: string;
    statusReason?: string | null;
    statusChangedAt?: number | null;
    statusChangedBy?: string | null;
    graceDeadline?: string | null;
    dataDeleteAfter?: string | null;
  };
  usage: {
    summaries: UsageSummary[];
    total: { totalCost: number; totalCharge: number; eventCount: number };
  };
}

export interface CreditAdjustment {
  id: string;
  tenant: string;
  type: "grant" | "refund" | "correction";
  amount_cents: number;
  reason: string;
  admin_user: string;
  reference_ids: string | null;
  created_at: number;
}

export interface UsageSummary {
  tenant: string;
  capability: string;
  provider: string;
  event_count: number;
  total_cost: number;
  total_charge: number;
  total_duration: number;
  window_start: number;
  window_end: number;
}

export interface AdminNote {
  id: string;
  tenant_id: string;
  admin_user: string;
  content: string;
  created_at: number;
}

export interface BotInstance {
  id: string;
  tenantId: string;
  name: string;
  nodeId: string | null;
  billingState: string;
  suspendedAt: string | null;
  destroyAfter: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---- API calls ----
// These call tRPC procedures via the HTTP adapter mounted at /trpc.
// Queries use GET with ?input=JSON; mutations use POST with JSON body.

export async function getTenantDetail(tenantId: string): Promise<TenantDetailResponse> {
  const params = new URLSearchParams({ input: JSON.stringify({ tenantId }) });
  return adminFetch<{ result: { data: TenantDetailResponse } }>(
    `/trpc/admin.tenantDetail?${params}`,
  ).then((r) => r.result.data);
}

export async function getTenantAgents(tenantId: string): Promise<BotInstance[]> {
  const params = new URLSearchParams({ input: JSON.stringify({ tenantId }) });
  return adminFetch<{ result: { data: { agents: BotInstance[] } } }>(
    `/trpc/admin.tenantAgents?${params}`,
  ).then((r) => r.result.data.agents);
}

export async function getTenantNotes(tenantId: string): Promise<AdminNote[]> {
  const params = new URLSearchParams({ input: JSON.stringify({ tenantId }) });
  return adminFetch<{ result: { data: { notes: AdminNote[] } } }>(
    `/trpc/admin.tenantNotes?${params}`,
  ).then((r) => r.result.data.notes);
}

export async function addTenantNote(tenantId: string, content: string): Promise<AdminNote> {
  return adminFetch<{ result: { data: AdminNote } }>("/trpc/admin.tenantNoteAdd", {
    method: "POST",
    body: JSON.stringify({ tenantId, content }),
  }).then((r) => r.result.data);
}

export async function suspendTenant(tenantId: string, reason: string): Promise<void> {
  await adminFetch("/trpc/admin.suspendTenant", {
    method: "POST",
    body: JSON.stringify({ tenantId, reason }),
  });
}

export async function reactivateTenant(tenantId: string): Promise<void> {
  await adminFetch("/trpc/admin.reactivateTenant", {
    method: "POST",
    body: JSON.stringify({ tenantId }),
  });
}

export async function grantCredits(
  tenantId: string,
  amount_cents: number,
  reason: string,
): Promise<void> {
  await adminFetch("/trpc/admin.creditsGrant", {
    method: "POST",
    body: JSON.stringify({ tenantId, amount_cents, reason }),
  });
}

export async function refundCredits(
  tenantId: string,
  amount_cents: number,
  reason: string,
): Promise<void> {
  await adminFetch("/trpc/admin.creditsRefund", {
    method: "POST",
    body: JSON.stringify({ tenantId, amount_cents, reason }),
  });
}

export async function changeRole(userId: string, tenantId: string, role: string): Promise<void> {
  await adminFetch("/trpc/admin.tenantChangeRole", {
    method: "POST",
    body: JSON.stringify({ userId, tenantId, role }),
  });
}

export async function banTenant(
  tenantId: string,
  reason: string,
  tosReference: string,
  confirmName: string,
): Promise<void> {
  await adminFetch("/trpc/admin.banTenant", {
    method: "POST",
    body: JSON.stringify({ tenantId, reason, tosReference, confirmName }),
  });
}

export async function getTransactionsCsv(tenantId: string): Promise<string> {
  const params = new URLSearchParams({ input: JSON.stringify({ tenantId }) });
  return adminFetch<{ result: { data: { csv: string } } }>(
    `/trpc/admin.creditsTransactionsExport?${params}`,
  ).then((r) => r.result.data.csv);
}

export async function getTransactions(
  tenantId: string,
  filters?: {
    type?: string;
    from?: number;
    to?: number;
    limit?: number;
    offset?: number;
  },
): Promise<{ entries: CreditAdjustment[]; total: number }> {
  const params = new URLSearchParams({
    input: JSON.stringify({ tenantId, ...filters }),
  });
  return adminFetch<{ result: { data: { entries: CreditAdjustment[]; total: number } } }>(
    `/trpc/admin.creditsTransactions?${params}`,
  ).then((r) => r.result.data);
}

export async function getTenantUsageByCapability(
  tenantId: string,
  days = 30,
): Promise<UsageSummary[]> {
  const params = new URLSearchParams({ input: JSON.stringify({ tenantId, days }) });
  return adminFetch<{ result: { data: { usage: UsageSummary[] } } }>(
    `/trpc/admin.tenantUsageByCapability?${params}`,
  ).then((r) => r.result.data.usage);
}

export async function getUsersList(params?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ users: AdminUserSummary[]; total: number }> {
  const input = new URLSearchParams({ input: JSON.stringify(params ?? {}) });
  return adminFetch<{ result: { data: { users: AdminUserSummary[]; total: number } } }>(
    `/trpc/admin.usersList?${input}`,
  ).then((r) => r.result.data);
}
