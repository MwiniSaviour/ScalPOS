"use client"

import { useEffect, useState } from "react"
import { useNet } from "@pos/net"
import { readConnection } from "@pos/api/bootstrap"
import { CONNECTION_CHANGE_EVENT } from "@/lib/auth/org"
import { armSync, disarmSync, drainOutbox, pullAll } from "@pos/sync/engine"
import { planAllowsEnterprise, useEntitlement } from "@pos/entitlement"

export function SyncBridge({ signedIn }: { signedIn: boolean }) {
  const { online } = useNet()
  const refresh = useEntitlement((s) => s.refresh)
  const [conn, setConn] = useState(() => readConnection())

  useEffect(() => {
    const update = () => setConn(readConnection())
    window.addEventListener(CONNECTION_CHANGE_EVENT, update)
    window.addEventListener("storage", update)
    return () => {
      window.removeEventListener(CONNECTION_CHANGE_EVENT, update)
      window.removeEventListener("storage", update)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
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
  }, [signedIn, online, refresh, conn])

  return null
}
