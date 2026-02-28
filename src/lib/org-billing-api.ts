import { trpcVanilla } from "./trpc";

// ---- Typed org billing client stub ----
// Same pattern as org-api.ts — cast via unknown to bridge the placeholder AppRouter gap.

interface OrgBillingProcedures {
  orgBillingBalance: {
    query(input: { orgId: string }): Promise<{
      orgId: string;
      balanceCents: number;
      dailyBurnCents: number;
      runwayDays: number | null;
    }>;
  };
  orgMemberUsage: {
    query(input: { orgId: string }): Promise<{
      orgId: string;
      periodStart: string;
      members: Array<{
        memberId: string;
        name: string;
        email: string;
        creditsConsumedCents: number;
        lastActiveAt: string | null;
      }>;
    }>;
  };
  orgBillingInfo: {
    query(input: { orgId: string }): Promise<{
      paymentMethods: Array<{
        id: string;
        brand: string;
        last4: string;
        expiryMonth: number;
        expiryYear: number;
        isDefault: boolean;
      }>;
      invoices: Array<{
        id: string;
        date: string;
        amount: number;
        status: string;
        downloadUrl: string;
      }>;
    }>;
  };
  orgTopupCheckout: {
    mutate(input: {
      orgId: string;
      priceId: string;
      successUrl: string;
      cancelUrl: string;
    }): Promise<{ url: string; sessionId: string }>;
  };
}

const orgClient = (trpcVanilla as unknown as { org: OrgBillingProcedures }).org;

// ---- Exported types ----

export interface OrgCreditBalance {
  balance: number;
  dailyBurn: number;
  runway: number | null;
}

export interface OrgMemberUsageRow {
  memberId: string;
  name: string;
  email: string;
  creditsConsumed: number;
  lastActiveAt: string | null;
}

// ---- API calls ----

export async function getOrgCreditBalance(orgId: string): Promise<OrgCreditBalance> {
  const res = await orgClient.orgBillingBalance.query({ orgId });
  return {
    balance: (res?.balanceCents ?? 0) / 100,
    dailyBurn: (res?.dailyBurnCents ?? 0) / 100,
    runway: res?.runwayDays ?? null,
  };
}

export async function getOrgMemberUsage(orgId: string): Promise<{
  orgId: string;
  periodStart: string;
  members: OrgMemberUsageRow[];
}> {
  const res = await orgClient.orgMemberUsage.query({ orgId });
  const members = Array.isArray(res?.members) ? res.members : [];
  return {
    orgId: res?.orgId ?? orgId,
    periodStart: res?.periodStart ?? "",
    members: members.map((m) => ({
      memberId: m.memberId ?? "",
      name: m.name ?? "",
      email: m.email ?? "",
      creditsConsumed: (m.creditsConsumedCents ?? 0) / 100,
      lastActiveAt: m.lastActiveAt ?? null,
    })),
  };
}

export async function getOrgBillingInfo(orgId: string) {
  const res = await orgClient.orgBillingInfo.query({ orgId });
  return {
    paymentMethods: Array.isArray(res?.paymentMethods) ? res.paymentMethods : [],
    invoices: Array.isArray(res?.invoices) ? res.invoices : [],
  };
}

export async function createOrgTopupCheckout(
  orgId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
) {
  return orgClient.orgTopupCheckout.mutate({ orgId, priceId, successUrl, cancelUrl });
}
