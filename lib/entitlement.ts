"use client";

import { create } from "zustand";
import { readConnection } from "@/lib/api/bootstrap";
import { getSubscription, type SubscriptionState } from "@/lib/api/billing";
import { hasOnboarded } from "@/lib/first-run";
import { ensureTrialStart, readTrialStart, TRIAL_MS } from "@/lib/trial";

const CACHE_KEY = "nova-pos-entitlement-v1";
const ONBOARD_KEY = "nova-pos-onboarded";
const REFRESH_MS = 10 * 60 * 1000;

export type AccessStatus = "unknown" | "trialing" | "active" | "locked";

type CachedSubscription = {
  status: SubscriptionState["status"];
  plan: SubscriptionState["plan"];
  expiresAt: number | null;
  fetchedAt: number;
  orgId: string | null;
};

type EntitlementState = {
  ready: boolean;
  status: AccessStatus;
  expiresAt: number | null;
  checkedAt: number;
  refreshing: boolean;
  syncLocal: (now?: number) => void;
  refresh: (force?: boolean) => Promise<void>;
};

function readCache(): CachedSubscription | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedSubscription> | null;
    if (!parsed || typeof parsed.status !== "string") return null;
    return {
      status: parsed.status as SubscriptionState["status"],
      plan: (parsed.plan as SubscriptionState["plan"]) ?? null,
      expiresAt: typeof parsed.expiresAt === "number" ? parsed.expiresAt : null,
      fetchedAt: typeof parsed.fetchedAt === "number" ? parsed.fetchedAt : 0,
      orgId: typeof parsed.orgId === "string" ? parsed.orgId : null,
    };
  } catch {
    return null;
  }
}

function writeCache(state: CachedSubscription): void {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
}

function bootstrapTrial(): void {
  if (typeof window === "undefined") return;
  try {
    const onboarded = window.localStorage.getItem(ONBOARD_KEY) === "1";
    if (onboarded && !readTrialStart()) ensureTrialStart();
  } catch {
    /* storage unavailable */
  }
}

function evaluate(
  cached: CachedSubscription | null,
  now: number,
  currentOrgId: string | null,
): { status: AccessStatus; expiresAt: number | null } {
  // no shop yet: setup must always be reachable (fresh install, wiped data)
  if (!hasOnboarded()) {
    return { status: "trialing", expiresAt: null };
  }
  // a cache written for another shop says nothing about this one
  if (cached && cached.orgId && currentOrgId && cached.orgId !== currentOrgId) {
    cached = null;
  }
  if (cached) {
    const exp = cached.expiresAt;
    if (cached.status === "active" && (exp === null || exp > now)) {
      return { status: "active", expiresAt: exp };
    }
    if (cached.status === "trialing" && exp !== null && exp > now) {
      return { status: "trialing", expiresAt: exp };
    }
    // The server said there is no live plan — that outranks a fresh local
    // trial, otherwise disconnecting would reset access.
    if (cached.status === "none" || cached.status === "expired") {
      return { status: "locked", expiresAt: null };
    }
    if (cached.status === "active" || cached.status === "trialing") {
      return { status: "locked", expiresAt: exp };
    }
    // pending: payment not confirmed yet — fall through to the device trial
  }

  const start = readTrialStart();
  const trialEnd = start ? start + TRIAL_MS : null;
  if (trialEnd !== null && trialEnd > now) {
    return { status: "trialing", expiresAt: trialEnd };
  }
  return { status: "locked", expiresAt: trialEnd };
}

function initialState(): Pick<EntitlementState, "ready" | "status" | "expiresAt" | "checkedAt"> {
  if (typeof window === "undefined") {
    return { ready: false, status: "unknown", expiresAt: null, checkedAt: 0 };
  }
  bootstrapTrial();
  const cached = readCache();
  const next = evaluate(cached, Date.now(), readConnection()?.org_id ?? null);
  return {
    ready: true,
    status: next.status,
    expiresAt: next.expiresAt,
    checkedAt: cached?.fetchedAt ?? 0,
  };
}

export const useEntitlement = create<EntitlementState>((set, get) => ({
  ...initialState(),
  refreshing: false,

  syncLocal: (now = Date.now()) => {
    bootstrapTrial();
    const cached = readCache();
    const next = evaluate(cached, now, readConnection()?.org_id ?? null);
    set({
      ready: true,
      status: next.status,
      expiresAt: next.expiresAt,
      checkedAt: cached?.fetchedAt ?? get().checkedAt,
    });
  },

  refresh: async (force = false) => {
    if (get().refreshing) return;
    const conn = readConnection();
    if (!conn) {
      get().syncLocal();
      return;
    }
    const cached = readCache();
    const fresh =
      cached && cached.orgId === conn.org_id && Date.now() - cached.fetchedAt < REFRESH_MS;
    if (!force && fresh) {
      get().syncLocal();
      return;
    }

    set({ refreshing: true });
    try {
      const s = await getSubscription(conn);
      recordSubscriptionState(s, conn.org_id);
    } catch {
      // offline or server hiccup — cached state keeps enforcing its expiry
    } finally {
      set({ refreshing: false });
      get().syncLocal();
    }
  },
}));

/** Persist a server answer and re-evaluate immediately (used after checkout). */
export function recordSubscriptionState(s: SubscriptionState, orgId?: string | null): void {
  writeCache({
    status: s.status,
    plan: s.plan,
    expiresAt: s.expires_at ? new Date(s.expires_at).getTime() : null,
    fetchedAt: Date.now(),
    orgId: orgId ?? readConnection()?.org_id ?? null,
  });
  useEntitlement.getState().syncLocal();
}
