import { trpcVanilla } from "./trpc";

// ---- Types ----

export interface SuppressionEvent {
  id: string;
  referrerTenantId: string;
  referredTenantId: string;
  verdict: string;
  signals: string[];
  signalDetails: Record<string, string>;
  phase: string;
  createdAt: string;
}

export interface VelocityReferrer {
  referrerTenantId: string;
  payoutCount30d: number;
  payoutTotal30dCents: number;
}

export interface FingerprintCluster {
  stripeFingerprint: string;
  tenantIds: string[];
}

// ---- Typed admin client stub ----

interface AffiliateAdminProcedures {
  affiliateSuppressions: {
    query(input: { limit: number; offset: number }): Promise<{
      events: SuppressionEvent[];
      total: number;
    }>;
  };
  affiliateVelocity: {
    query(input: { capReferrals: number; capCredits: number }): Promise<VelocityReferrer[]>;
  };
  affiliateFingerprintClusters: {
    query(): Promise<FingerprintCluster[]>;
  };
  affiliateBlockFingerprint: {
    mutate(input: { fingerprint: string }): Promise<{ success: boolean }>;
  };
}

const adminClient = (trpcVanilla as unknown as { admin: AffiliateAdminProcedures }).admin;

// ---- API calls ----

export async function getAffiliateSuppressions(
  limit = 50,
  offset = 0,
): Promise<{ events: SuppressionEvent[]; total: number }> {
  return adminClient.affiliateSuppressions.query({ limit, offset });
}

export async function getAffiliateVelocity(
  capReferrals = 20,
  capCredits = 20000,
): Promise<VelocityReferrer[]> {
  return adminClient.affiliateVelocity.query({ capReferrals, capCredits });
}

export async function getAffiliateFingerprintClusters(): Promise<FingerprintCluster[]> {
  return adminClient.affiliateFingerprintClusters.query();
}

export async function blockAffiliateFingerprint(
  fingerprint: string,
): Promise<{ success: boolean }> {
  return adminClient.affiliateBlockFingerprint.mutate({ fingerprint });
}
