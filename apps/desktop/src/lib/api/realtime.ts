"use client"

import { useEffect, useRef } from "react"
import { getSupabase } from "@/lib/supabase/client"
import { getOrgId, ORG_CHANGED_EVENT } from "@/lib/auth/org"

const TABLES = [
  "products",
  "categories",
  "customers",
  "orders",
  "order_items",
  "stock_moves",
  "settings",
  "product_batches",
  "purchase_orders",
  "staff",
  "suppliers",
  "recipes",
  "restaurant_tables",
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
    let client
    try {
      client = getSupabase()
    } catch {
      return
    }
    let channel: ReturnType<typeof client.channel> | null = null
    let timer: ReturnType<typeof setTimeout> | null = null
    let org = ""

    const subscribe = () => {
      let next: string
      try {
        next = getOrgId()
      } catch {
        return
      }
      if (next === org && channel) return
      if (channel) {
        void client.removeChannel(channel)
        channel = null
      }
      org = next
      const ch = client.channel(`scalpos-desktop-${Math.random().toString(36).slice(2, 9)}`)
      for (const table of TABLES) {
        ch.on(
          "postgres_changes",
          { event: "*", schema: "public", table, filter: `org_id=eq.${org}` },
          () => {
            if (timer) clearTimeout(timer)
            timer = setTimeout(() => cb.current(), 300)
          },
        )
      }
      ch.subscribe()
      channel = ch
    }

    subscribe()
    // Switching shops (or entering demo mode) changes the org filter — the
    // old channel would keep listening to the previous shop.
    const onOrgChanged = () => subscribe()
    window.addEventListener(ORG_CHANGED_EVENT, onOrgChanged)
    return () => {
      window.removeEventListener(ORG_CHANGED_EVENT, onOrgChanged)
      if (timer) clearTimeout(timer)
      if (channel) void client.removeChannel(channel)
    }
  }, [enabled])
}
