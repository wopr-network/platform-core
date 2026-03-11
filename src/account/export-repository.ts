import { and, eq, sql } from "drizzle-orm";
import type { PlatformDb } from "../db/index.js";
import { accountExportRequests } from "../db/schema/index.js";
import type { ExportRequestRow, InsertExportRequest } from "./repository-types.js";

export type { ExportRequestRow, InsertExportRequest };

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IExportRepository {
  insert(data: InsertExportRequest): Promise<void>;
  getById(id: string): Promise<ExportRequestRow | null>;
  listByTenant(tenantId: string): Promise<ExportRequestRow[]>;
  markProcessing(id: string): Promise<boolean>;
  markCompleted(id: string, downloadUrl: string): Promise<boolean>;
  markFailed(id: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export class DrizzleExportRepository implements IExportRepository {
  constructor(private readonly db: PlatformDb) {}

  async insert(data: InsertExportRequest): Promise<void> {
    await this.db.insert(accountExportRequests).values({
      id: data.id,
      tenantId: data.tenantId,
      requestedBy: data.requestedBy,
      format: data.format ?? "json",
    });
  }

  async getById(id: string): Promise<ExportRequestRow | null> {
    const rows = await this.db.select().from(accountExportRequests).where(eq(accountExportRequests.id, id));
    const row = rows[0];
    return row ? toRow(row) : null;
  }

  async listByTenant(tenantId: string): Promise<ExportRequestRow[]> {
    const rows = await this.db.select().from(accountExportRequests).where(eq(accountExportRequests.tenantId, tenantId));
    return rows.map(toRow);
  }

  async markProcessing(id: string): Promise<boolean> {
    const result = await this.db
      .update(accountExportRequests)
      .set({
        status: "processing",
        updatedAt: sql`now()`,
      })
      .where(and(eq(accountExportRequests.id, id), eq(accountExportRequests.status, "pending")))
      .returning({ id: accountExportRequests.id });
    return result.length > 0;
  }

  async markCompleted(id: string, downloadUrl: string): Promise<boolean> {
    const result = await this.db
      .update(accountExportRequests)
      .set({
        status: "completed",
        downloadUrl,
        updatedAt: sql`now()`,
      })
      .where(and(eq(accountExportRequests.id, id), eq(accountExportRequests.status, "processing")))
      .returning({ id: accountExportRequests.id });
    return result.length > 0;
  }

  async markFailed(id: string): Promise<boolean> {
    const result = await this.db
      .update(accountExportRequests)
      .set({
        status: "failed",
        updatedAt: sql`now()`,
      })
      .where(and(eq(accountExportRequests.id, id), eq(accountExportRequests.status, "processing")))
      .returning({ id: accountExportRequests.id });
    return result.length > 0;
  }
}

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

function toRow(row: typeof accountExportRequests.$inferSelect): ExportRequestRow {
  return {
    id: row.id,
    tenantId: row.tenantId,
    requestedBy: row.requestedBy,
    status: row.status as ExportRequestRow["status"],
    format: row.format,
    downloadUrl: row.downloadUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
