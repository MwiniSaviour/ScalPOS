import { useEffect, useSyncExternalStore } from "react"
import { getSubscription, type SubscriptionState } from "@/lib/api/billing"

const CACHE_KEY = "desk-pos-entitlement-v1"
const TTL = 5 * 60_000

export type EntitlementSnapshot = SubscriptionState & {
  orgId: string | null
  fetchedAt: number
  loading: boolean
  error: string | null
}

export type EntitlementKind =
  | "enterprise"
  | "trial"
  | "standard"
  | "pending"
  | "none"
  | "unknown"

type CacheEntry = {
  org_id: string
  plan: SubscriptionState["plan"]
  status: SubscriptionState["status"]
  fetched_at: number
}

const base: EntitlementSnapshot = {
  orgId: null,
  plan: null,
  status: "none",
  renewal: "manual",
  expires_at: null,
  fetchedAt: 0,
  loading: false,
  error: null,
}

const SERVER_SNAPSHOT: EntitlementSnapshot = base

let snapshot: EntitlementSnapshot = base
let busyOrg: string | null = null
const listeners = new Set<() => void>()

function notify() {
  for (const fn of listeners) fn()
}

function setSnapshot(next: EntitlementSnapshot) {
  snapshot = next
  notify()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnap(): EntitlementSnapshot {
  return snapshot
}

function readCache(orgId: string): CacheEntry | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CacheEntry[] | null
    if (!Array.isArray(parsed)) return null
    return parsed.find((e) => e?.org_id === orgId && typeof e.fetched_at === "number") ?? null
  } catch {
    return null
  }
}

function writeCache(orgId: string, plan: SubscriptionState["plan"], status: SubscriptionState["status"]) {
  if (typeof window === "undefined") return
  try {
    const raw = JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? "[]") as CacheEntry[]
    const next = (Array.isArray(raw) ? raw : [])
      .filter((e) => e?.org_id !== orgId)
      .concat({ org_id: orgId, plan, status, fetched_at: Date.now() })
      .slice(-20)
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(next))
  } catch {
    return
  }
}

function cachedSnapshot(orgId: string, entry: CacheEntry): EntitlementSnapshot {
  return {
    orgId,
    plan: entry.plan,
    status: entry.status,
    renewal: "manual",
    expires_at: null,
    fetchedAt: entry.fetched_at,
    loading: false,
    error: null,
  }
}

export async function refreshEntitlement(orgId: string, force = false): Promise<void> {
  if (!orgId) return
  if (!force && snapshot.orgId === orgId && !snapshot.loading) {
    if (snapshot.fetchedAt && Date.now() - snapshot.fetchedAt < TTL) return
  }
  if (busyOrg === orgId) return
  const cached = force ? null : readCache(orgId)
  if (!force && cached && Date.now() - cached.fetched_at < TTL) {
    setSnapshot(cachedSnapshot(orgId, cached))
    return
  }
  busyOrg = orgId
  setSnapshot({
    orgId,
    plan: cached?.plan ?? null,
    status: cached?.status ?? "none",
    renewal: "manual",
    expires_at: null,
    fetchedAt: cached?.fetched_at ?? 0,
    loading: true,
    error: null,
  })
  try {
    const sub = await getSubscription()
    writeCache(orgId, sub.plan, sub.status)
    setSnapshot({ orgId, ...sub, fetchedAt: Date.now(), loading: false, error: null })
  } catch (e) {
    setSnapshot({
      orgId,
      plan: cached?.plan ?? null,
      status: cached?.status ?? "none",
      renewal: "manual",
      expires_at: null,
      fetchedAt: cached?.fetched_at ?? 0,
      loading: false,
      error: e instanceof Error ? e.message : "Could not check your subscription.",
    })
  } finally {
    if (busyOrg === orgId) busyOrg = null
  }
}

export function entitlementKind(s: EntitlementSnapshot): EntitlementKind {
  if (s.fetchedAt > 0) {
    if (s.status === "trialing") return "trial"
    if (s.status === "active") {
      if (s.plan === "enterprise") return "enterprise"
      if (s.plan === "standard") return "standard"
      return "none"
    }
    if (s.status === "pending") return "pending"
    return "none"
  }
  return "unknown"
}

export function isEnterpriseKind(kind: EntitlementKind): boolean {
  return kind === "enterprise" || kind === "trial"
}

export function useEntitlement(orgId: string | null): EntitlementSnapshot {
  useEffect(() => {
    if (orgId) void refreshEntitlement(orgId)
  }, [orgId])
  return useSyncExternalStore(subscribe, getSnap, () => SERVER_SNAPSHOT)
}
