export type OpKind = "upsert" | "delete";

export interface Op {
  op_id: string;
  table: string;
  kind: OpKind;
  row?: Record<string, unknown> | null;
  id?: string | null;
  org_id?: string | null;
  created_at: number;
  attempts?: number;
  last_error?: string | null;
}

export type Resolution = "local" | "remote" | "merge";

export interface Conflict {
  table: string;
  id: string;
  local: Record<string, unknown>;
  remote: Record<string, unknown>;
  detected_at: number;
}

export interface SyncStatus {
  online: boolean;
  syncing: boolean;
  pendingCount: number;
  lastSyncAt: number | null;
  error: string | null;
}

export type Row = Record<string, unknown>;
