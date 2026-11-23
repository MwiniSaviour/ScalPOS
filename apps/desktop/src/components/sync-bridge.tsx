"use client"

import { useEffect } from "react"
import { useNet } from "@pos/net"
import { readConnection } from "@pos/api/bootstrap"
import { armSync, disarmSync, drainOutbox, pullAll } from "@pos/sync/engine"
import { planAllowsEnterprise, useEntitlement } from "@pos/entitlement"

export function SyncBridge({ signedIn }: { signedIn: boolean }) {
  const { online } = useNet()
  const status = useEntitlement((s) => s.status)
  const plan = useEntitlement((s) => s.plan)
  const refresh = useEntitlement((s) => s.refresh)

  useEffect(() => {
    if (!signedIn || !online || !planAllowsEnterprise(status, plan)) {
      void disarmSync()
      return
    }
    const conn = readConnection()
    if (!conn?.org_id) return
    let cancelled = false
    void (async () => {
      await armSync(conn)
      if (cancelled) return
      await refresh(true)
      await Promise.all([drainOutbox(), pullAll(conn)])
    })().catch((e) => console.warn("desktop sync boot", e))
    return () => { cancelled = true }
  }, [signedIn, online, status, plan, refresh])

  return null
}
