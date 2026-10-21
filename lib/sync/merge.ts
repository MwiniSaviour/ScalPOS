export function mergeRecords<T extends Record<string, unknown>>(
  local: T,
  remote: T,
  base?: T,
): T {
  const out: Record<string, unknown> = { ...(remote ?? {}) };
  const keys = new Set<string>([
    ...Object.keys(local ?? {}),
    ...Object.keys(remote ?? {}),
  ]);
  for (const k of keys) {
    const inLocal = local != null && Object.prototype.hasOwnProperty.call(local, k);
    const inRemote = remote != null && Object.prototype.hasOwnProperty.call(remote, k);
    if (inLocal && !inRemote) {
      out[k] = (local as Record<string, unknown>)[k];
      continue;
    }
    if (!inLocal && inRemote) {
      out[k] = (remote as Record<string, unknown>)[k];
      continue;
    }
    const l = (local as Record<string, unknown>)?.[k];
    const r = (remote as Record<string, unknown>)?.[k];
    if (l === r) {
      out[k] = r;
      continue;
    }
    const hasBase = base != null && Object.prototype.hasOwnProperty.call(base, k);
    const b = hasBase ? (base as Record<string, unknown>)?.[k] : undefined;
    const lChanged = !hasBase || l !== b;
    const rChanged = !hasBase || r !== b;
    if (lChanged && !rChanged) out[k] = l;
    else out[k] = r;
  }
  return out as T;
}

export const merge = mergeRecords;
export const mergeFields = mergeRecords;
export const fieldLevelMerge = mergeRecords;
export const fieldMerge = mergeRecords;
export default mergeRecords;
