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
} {
  const { online } = useNet();
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const mod = await import("@/lib/sync/outbox");
        const ops = await mod.peek();
        if (!cancelled) setPendingCount(Array.isArray(ops) ? ops.length : 0);
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
        const mod = await import("@/lib/sync/outbox");
        const ops = await mod.peek();
        if (!Array.isArray(ops) || ops.length === 0) return;
        setSyncing(true);
        setError(null);
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
    return () => {
      cancelled = true;
    };
  }, [online]);

  return { online, syncing, pendingCount, lastSyncAt, error };
}
