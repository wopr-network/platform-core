import { and, eq } from "drizzle-orm";
import type { PlatformDb } from "../db/index.js";
import { accountDeletionRequests } from "../db/schema/index.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DeletionRequestRow {
  id: string;
  tenantId: string;
  requestedBy: string;
  status: string;
  deleteAfter: string;
  reason: string | null;
  cancelReason: string | null;
  completedAt: string | null;
  deletionSummary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InsertDeletionRequest {
  id: string;
  tenantId: string;
  requestedBy: string;
  deleteAfter: string;
  reason?: string;
}

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IDeletionRepository {
  insert(data: InsertDeletionRequest): Promise<void>;
  getById(id: string): Promise<DeletionRequestRow | null>;
  listByTenant(tenantId: string): Promise<DeletionRequestRow[]>;
  cancel(id: string, cancelReason: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export class DrizzleDeletionRepository implements IDeletionRepository {
  constructor(private readonly db: PlatformDb) {}

  async insert(data: InsertDeletionRequest): Promise<void> {
    await this.db.insert(accountDeletionRequests).values({
      id: data.id,
      tenantId: data.tenantId,
      requestedBy: data.requestedBy,
      deleteAfter: data.deleteAfter,
      reason: data.reason ?? null,
    });
  }

  async getById(id: string): Promise<DeletionRequestRow | null> {
    const rows = await this.db.select().from(accountDeletionRequests).where(eq(accountDeletionRequests.id, id));
    const row = rows[0];
    return row ? toRow(row) : null;
  }

  async listByTenant(tenantId: string): Promise<DeletionRequestRow[]> {
    const rows = await this.db
      .select()
      .from(accountDeletionRequests)
      .where(eq(accountDeletionRequests.tenantId, tenantId));
    return rows.map(toRow);
  }

  async cancel(id: string, cancelReason: string): Promise<boolean> {
    const result = await this.db
      .update(accountDeletionRequests)
      .set({
        status: "cancelled",
        cancelReason,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(accountDeletionRequests.id, id), eq(accountDeletionRequests.status, "pending")))
      .returning({ id: accountDeletionRequests.id });
    return result.length > 0;
  }
}

// ---------------------------------------------------------------------------
// Row mapper
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
