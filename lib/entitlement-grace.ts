/** Last known-good access survives a network outage for a bounded window. */
export const OFFLINE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export type CachedEntitlement = {
  status: string;
  expiresAt: number | null;
  fetchedAt: number;
};

export function insideOfflineGrace(cached: CachedEntitlement, now: number): boolean {
  if (cached.status !== "active" && cached.status !== "trialing") return false;
  const allowedUntil =
    cached.expiresAt !== null
      ? cached.expiresAt + OFFLINE_GRACE_MS
      : cached.fetchedAt + OFFLINE_GRACE_MS;
  return now < allowedUntil;
}
