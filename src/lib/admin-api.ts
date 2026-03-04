import { trpcVanilla } from "./trpc";

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

export async function getTenantDetail(tenantId: string): Promise<TenantDetailResponse> {
  return trpcVanilla.admin.tenantDetail.query({ tenantId });
}

export async function getTenantAgents(tenantId: string): Promise<BotInstance[]> {
  const result = await trpcVanilla.admin.tenantAgents.query({ tenantId });
  return result.agents;
}

export async function getTenantNotes(tenantId: string): Promise<AdminNote[]> {
  // Backend procedure is notesList, not tenantNotes
  const result = await trpcVanilla.admin.notesList.query({ tenantId });
  return result.notes;
}

export async function addTenantNote(tenantId: string, content: string): Promise<AdminNote> {
  // Backend procedure is notesCreate, not tenantNoteAdd
  return trpcVanilla.admin.notesCreate.mutate({ tenantId, content });
}

export async function suspendTenant(tenantId: string, reason: string): Promise<void> {
  await trpcVanilla.admin.suspendTenant.mutate({ tenantId, reason });
}

export async function reactivateTenant(tenantId: string): Promise<void> {
  await trpcVanilla.admin.reactivateTenant.mutate({ tenantId });
}

export async function grantCredits(
  tenantId: string,
  amount_cents: number,
  reason: string,
): Promise<void> {
  await trpcVanilla.admin.creditsGrant.mutate({ tenantId, amount_cents, reason });
}

export async function refundCredits(
  tenantId: string,
  amount_cents: number,
  reason: string,
): Promise<void> {
  await trpcVanilla.admin.creditsRefund.mutate({ tenantId, amount_cents, reason });
}

export async function changeRole(userId: string, tenantId: string, role: string): Promise<void> {
  await trpcVanilla.admin.tenantChangeRole.mutate({ userId, tenantId, role });
}

export async function banTenant(
  tenantId: string,
  reason: string,
  tosReference: string,
  confirmName: string,
): Promise<void> {
  await trpcVanilla.admin.banTenant.mutate({ tenantId, reason, tosReference, confirmName });
}

export async function getTransactionsCsv(tenantId: string): Promise<string> {
  const result = await trpcVanilla.admin.creditsTransactionsExport.query({ tenantId });
  return result.csv;
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
  return trpcVanilla.admin.creditsTransactions.query({ tenantId, ...filters });
}

export async function getTenantUsageByCapability(
  tenantId: string,
  days = 30,
): Promise<UsageSummary[]> {
  const result = await trpcVanilla.admin.tenantUsageByCapability.query({ tenantId, days });
  return result.usage;
}

export async function getUsersList(params?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ users: AdminUserSummary[]; total: number }> {
  return trpcVanilla.admin.usersList.query(params ?? {});
}

export async function bulkGrantCredits(
  tenantIds: string[],
  amountCents: number,
  reason: string,
): Promise<void> {
  await trpcVanilla.admin.bulkGrant.mutate({ tenantIds, amountCents, reason });
}

export async function bulkSuspendTenants(tenantIds: string[], reason: string): Promise<void> {
  await trpcVanilla.admin.bulkSuspend.mutate({ tenantIds, reason });
}

export async function bulkReactivateTenants(tenantIds: string[]): Promise<void> {
  await trpcVanilla.admin.bulkReactivate.mutate({ tenantIds });
}
