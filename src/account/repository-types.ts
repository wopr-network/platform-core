// ---------------------------------------------------------------------------
// Shared domain types for account repository layer
// ---------------------------------------------------------------------------

export type DeletionStatus = "pending" | "completed" | "cancelled";
export type ExportStatus = "pending" | "processing" | "completed" | "failed";

export interface DeletionRequestRow {
  id: string;
  tenantId: string;
  requestedBy: string;
  status: DeletionStatus;
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

export interface ExportRequestRow {
  id: string;
  tenantId: string;
  requestedBy: string;
  status: ExportStatus;
  format: string;
  downloadUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertExportRequest {
  id: string;
  tenantId: string;
  requestedBy: string;
  format?: string;
}
