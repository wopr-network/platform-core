import { and, eq, lte } from "drizzle-orm";
import type { PlatformDb } from "../db/index.js";
import { accountDeletionRequests } from "../db/schema/index.js";
import type { DeletionRequestRow } from "./deletion-repository.js";

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IDeletionExecutorRepository {
  /** Find all pending requests whose deleteAfter is <= now. */
  findRipe(now: string): Promise<DeletionRequestRow[]>;
  /** Mark a request as completed with a deletion summary. */
  markCompleted(id: string, deletionSummary: string): Promise<boolean>;
  /** Find the active (pending) deletion request for a tenant, if any. */
  findPendingByTenant(tenantId: string): Promise<DeletionRequestRow | null>;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export class DrizzleDeletionExecutorRepository implements IDeletionExecutorRepository {
  constructor(private readonly db: PlatformDb) {}

  async findRipe(now: string): Promise<DeletionRequestRow[]> {
    const rows = await this.db
      .select()
      .from(accountDeletionRequests)
      .where(and(eq(accountDeletionRequests.status, "pending"), lte(accountDeletionRequests.deleteAfter, now)));
    return rows.map(toRow);
  }

  async markCompleted(id: string, deletionSummary: string): Promise<boolean> {
    const result = await this.db
      .update(accountDeletionRequests)
      .set({
        status: "completed",
        completedAt: new Date().toISOString(),
        deletionSummary,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(accountDeletionRequests.id, id), eq(accountDeletionRequests.status, "pending")))
      .returning({ id: accountDeletionRequests.id });
    return result.length > 0;
  }

  async findPendingByTenant(tenantId: string): Promise<DeletionRequestRow | null> {
    const rows = await this.db
      .select()
      .from(accountDeletionRequests)
      .where(and(eq(accountDeletionRequests.tenantId, tenantId), eq(accountDeletionRequests.status, "pending")))
      .limit(1);
    const row = rows[0];
    return row ? toRow(row) : null;
  }
}

// ---------------------------------------------------------------------------
// Row mapper (reuses DeletionRequestRow type from deletion-repository)
// ---------------------------------------------------------------------------

function toRow(row: typeof accountDeletionRequests.$inferSelect): DeletionRequestRow {
  return {
    id: row.id,
    tenantId: row.tenantId,
    requestedBy: row.requestedBy,
    status: row.status,
    deleteAfter: row.deleteAfter,
    reason: row.reason,
    cancelReason: row.cancelReason,
    completedAt: row.completedAt,
    deletionSummary: row.deletionSummary,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
