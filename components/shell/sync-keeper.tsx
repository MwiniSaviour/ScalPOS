"use client";

import { useEffect } from "react";
import { readConnection } from "@/lib/api/bootstrap";
import { armSync, disarmSync, drainOutbox } from "@/lib/sync/engine";
import { planAllowsEnterprise, useEntitlement } from "@/lib/entitlement";

/**
 * Arms the cloud sync engine whenever a saved connection exists and the user
 * is signed in. Runs once per mount; re-arms after sign-in flips.
 */
export function SyncKeeper({ signedIn }: { signedIn: boolean }) {
  const status = useEntitlement((s) => s.status);
  const plan = useEntitlement((s) => s.plan);
  const refresh = useEntitlement((s) => s.refresh);

  useEffect(() => {
    if (!signedIn) {
      void disarmSync();
      return;
    }
    let cancelled = false;
    void (async () => {
      await refresh();
      if (cancelled) return;
      if (!planAllowsEnterprise(status, plan)) {
        await disarmSync();
        return;
      }
      const conn = readConnection();
      if (!conn?.org_id) return;
      try {
        await armSync(conn);
        await drainOutbox();
      } catch (e) {
        console.warn("sync: boot arm", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, status, plan, refresh]);
  return null;
}
