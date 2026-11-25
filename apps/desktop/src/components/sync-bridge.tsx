"use client"

import { useEffect } from "react"
import { useNet } from "@pos/net"
import { readConnection } from "@pos/api/bootstrap"
import { armSync, disarmSync, drainOutbox, pullAll } from "@pos/sync/engine"
import { planAllowsEnterprise, useEntitlement } from "@pos/entitlement"

export function SyncBridge({ signedIn }: { signedIn: boolean }) {
  const { online } = useNet()
  const refresh = useEntitlement((s) => s.refresh)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const conn = readConnection()
      if (!conn?.org_id || !online) {
        await disarmSync()
        return
      }
      // Refresh before gating: a brand-new device has no plan cache yet.
      if (signedIn) await refresh(true)
      if (cancelled) return
      const current = useEntitlement.getState()
      if (!planAllowsEnterprise(current.status, current.plan)) {
        await disarmSync()
        return
      }
      await armSync(conn)
      if (cancelled) return
      await Promise.all([drainOutbox(), pullAll(conn)])
      if (!window.localStorage.getItem("nova-pos-onboarded")) {
        window.localStorage.setItem("nova-pos-onboarded", "1")
      }
    })().catch((e) => console.warn("desktop sync boot", e))
    return () => { cancelled = true }
  }, [signedIn, online, refresh])

  return null
}
