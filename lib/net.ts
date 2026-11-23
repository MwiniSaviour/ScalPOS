"use client";

import { useEffect, useState } from "react";

export function useNet(): { online: boolean } {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let off: () => void = () => {};

    void (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (cancelled) return;
        if (Capacitor.isNativePlatform()) {
          const { Network } = await import("@capacitor/network");
          const status = await Network.getStatus();
          if (cancelled) return;
          setOnline(status.connected);
          const handle = await Network.addListener("networkStatusChange", (s) => {
            setOnline(s.connected);
          });
          if (cancelled) {
            void handle.remove();
            return;
          }
          off = () => void handle.remove();
        } else {
          const update = () => setOnline(navigator.onLine);
          update();
          window.addEventListener("online", update);
          window.addEventListener("offline", update);
          off = () => {
            window.removeEventListener("online", update);
            window.removeEventListener("offline", update);
          };
        }
      } catch {
      }
    })();

    return () => {
      cancelled = true;
      off();
    };
  }, []);

  return { online };
}

export function useSyncStatus(): {
  online: boolean;
  syncing: boolean;
  pendingCount: number;
  lastSyncAt: number | null;
  error: string | null;
  paused: boolean;
} {
  const { online } = useNet();
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const mod = await import("./sync/outbox");
        const ops = await mod.peek();
        if (cancelled) return;
        const list = Array.isArray(ops) ? ops : [];
        setPendingCount(list.length);
        // An op that carries a failure message is not "syncing" — it is stuck,
        // and the pill has to say so instead of spinning forever.
        const failed = list.find((op) => op.last_error);
        setError(failed?.last_error ?? null);
      } catch {
      }
    };
    void refresh();
    const id = setInterval(() => void refresh(), 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!online) return;
    let cancelled = false;
    const run = async () => {
      try {
        const mod = await import("./sync/outbox");
        const ops = await mod.peek();
        if (!Array.isArray(ops) || ops.length === 0) {
          if (!cancelled) {
            setPendingCount(0);
            setError(null);
          }
          return;
        }
        setSyncing(true);
        const res = await mod.drain();
        if (cancelled) return;
        setPendingCount(Array.isArray(res.failed) ? res.failed.length : 0);
        setLastSyncAt(Date.now());
        if (Array.isArray(res.failed) && res.failed.length > 0) {
          setError(res.failed[0]?.last_error ?? "sync failed");
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setSyncing(false);
      }
    };
    void run();
    // Ops that failed (a dead session, a rejected row) are retried on a timer
    // instead of waiting for the next app launch.
    const id = setInterval(() => void run(), 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [online]);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const ent = await import("./entitlement");
        const { status, plan } = ent.useEntitlement.getState();
        if (cancelled) return;
        setPaused(!ent.planAllowsEnterprise(status, plan));
      } catch {
      }
    };
    void check();
    const id = setInterval(() => void check(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { online, syncing, pendingCount, lastSyncAt, error, paused };
}
