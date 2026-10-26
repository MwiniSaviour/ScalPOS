import { getSupabase } from "@/lib/api/supabase";
import { readConnection } from "@/lib/api/bootstrap";
import { enqueue } from "./outbox";
import type { Op, Row } from "./types";

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `op_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

export class SyncClient {
  private sb = getSupabase(readConnection()?.access_token);

  get available(): boolean {
    return this.sb !== null;
  }

  async upsert(table: string, row: Row): Promise<{ op_id: string }> {
    const op_id = (typeof row?.op_id === "string" && row.op_id) || uuid();
    const op: Op = {
      op_id,
      table,
      kind: "upsert",
      row: { ...row, op_id },
      created_at: Date.now(),
    };
    await enqueue(op);
    return { op_id };
  }

  async softDelete(table: string, id: string): Promise<{ op_id: string }> {
    const op_id = uuid();
    const op: Op = {
      op_id,
      table,
      kind: "delete",
      id,
      created_at: Date.now(),
    };
    await enqueue(op);
    return { op_id };
  }

  async pull(table: string, since: string): Promise<Row[]> {
    if (!this.sb) return [];
    const { data, error } = await this.sb.from(table).select("*").gt("updated_at", since);
    if (error) throw new Error(error.message);
    return (data ?? []) as Row[];
  }

  async push(op: Op): Promise<void> {
    if (!this.sb) throw new Error("supabase not configured");
    if (op.kind === "delete") {
      const { error } = await this.sb
        .from(op.table)
        .update({ deleted_at: new Date().toISOString(), op_id: op.op_id })
        .eq("id", op.id ?? "");
      if (error) throw new Error(error.message);
      return;
    }
    const { error } = await this.sb
      .from(op.table)
      .upsert({ ...(op.row ?? {}), op_id: op.op_id }, { onConflict: "op_id" });
    if (error) throw new Error(error.message);
  }

  async applyOp(op: Op): Promise<void> {
    return this.push(op);
  }
}
