import { trpcVanilla } from "./trpc";

// ---- Types (mirror backend domain types until @wopr-network/sdk is published) ----

export interface DailyCostAggregate {
  day: string; // YYYY-MM-DD
  totalCostUsd: number;
  sessionCount: number;
}

export interface PageCostAggregate {
  page: string;
  totalCostUsd: number;
  callCount: number;
  avgCostUsd: number;
}

export interface CacheStats {
  hitRate: number;
  cachedTokens: number;
  cacheWriteTokens: number;
  uncachedTokens: number;
}

export interface SessionCostSummary {
  totalCostUsd: number;
  totalSessions: number;
  avgCostPerSession: number;
}

// ---- Typed admin inference client stub ----

interface InferenceAdminProcedures {
  dailyCost: { query(input: { since: number }): Promise<DailyCostAggregate[]> };
  pageCost: { query(input: { since: number }): Promise<PageCostAggregate[]> };
  cacheHitRate: { query(input: { since: number }): Promise<CacheStats> };
  sessionCost: { query(input: { since: number }): Promise<SessionCostSummary> };
}

const inferenceClient = trpcVanilla.admin.inference as unknown as InferenceAdminProcedures;

// ---- API calls ----

export async function getDailyCost(since: number): Promise<DailyCostAggregate[]> {
  return inferenceClient.dailyCost.query({ since });
}

export async function getPageCost(since: number): Promise<PageCostAggregate[]> {
  return inferenceClient.pageCost.query({ since });
}

export async function getCacheStats(since: number): Promise<CacheStats> {
  return inferenceClient.cacheHitRate.query({ since });
}

export async function getSessionCost(since: number): Promise<SessionCostSummary> {
  return inferenceClient.sessionCost.query({ since });
}
