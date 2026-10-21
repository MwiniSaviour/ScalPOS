import type { Resolution } from "./types";

function toMs(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Date.parse(v);
    return Number.isNaN(n) ? 0 : n;
  }
  if (v instanceof Date) return v.getTime();
  return 0;
}

function opIdOf(row: unknown): string {
  if (row && typeof row === "object") {
    const r = row as Record<string, unknown>;
    return String(r.op_id ?? r.opId ?? "");
  }
  return "";
}

export function resolve(
  local: Record<string, unknown>,
  remote: Record<string, unknown>,
): Resolution {
  const lu = toMs(local?.updated_at ?? local?.updatedAt);
  const ru = toMs(remote?.updated_at ?? remote?.updatedAt);
  if (ru > lu) return "remote";
  if (lu > ru) return "local";
  const lo = opIdOf(local);
  const ro = opIdOf(remote);
  if (ro > lo) return "remote";
  if (lo > ro) return "local";
  return "merge";
}

export default resolve;
