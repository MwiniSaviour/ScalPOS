"use client"

import { useEffect, useRef } from "react"
import { getSupabase } from "@/lib/supabase/client"
import { getOrgId } from "@/lib/auth/org"

const TABLES = [
  "products",
  "categories",
  "customers",
  "orders",
  "order_items",
  "stock_moves",
  "settings",
] as const

/**
 * One realtime channel per mounted component, filtered to the signed-in org.
 * Any remote change (mobile or another desktop) triggers a debounced refetch,
 * so data on screen tracks the shop live without manual refresh.
 */
export function useRealtime(onChange: () => void, enabled = true) {
  const cb = useRef(onChange)
  useEffect(() => {
    cb.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!enabled) return
    const org = getOrgId()
    if (!org) return
    let client
    try {
      client = getSupabase()
    } catch {
      return
    }
    const channel = client.channel(`scalpos-desktop-${Math.random().toString(36).slice(2, 9)}`)
    let timer: ReturnType<typeof setTimeout> | null = null
    for (const table of TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `org_id=eq.${org}` },
        () => {
          if (timer) clearTimeout(timer)
          timer = setTimeout(() => cb.current(), 300)
        },
      )
    }
    channel.subscribe()
    return () => {
      if (timer) clearTimeout(timer)
      void client.removeChannel(channel)
    }
  }, [enabled])
}
