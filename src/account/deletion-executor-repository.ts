import { and, eq, lte, sql } from "drizzle-orm";
import type { PlatformDb } from "../db/index.js";
import { accountDeletionRequests } from "../db/schema/index.js";
import { toRow } from "./deletion-repository.js";
import type { DeletionRequestRow } from "./repository-types.js";

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
        completedAt: sql`now()`,
        deletionSummary,
        updatedAt: sql`now()`,
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
