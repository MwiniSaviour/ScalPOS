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

// Realtime rejects a channel with too many postgres_changes subscriptions
// ("Unable to subscribe to changes with given parameters") — it still reports
// SUBSCRIBED, but silently delivers no events. Keep every channel small.
const TABLES_PER_CHANNEL = 6

/**
 * One set of realtime channels per mounted component, filtered to the signed-in
 * org. Any remote change (mobile or another desktop) triggers a debounced
 * refetch, so data on screen tracks the shop live without manual refresh.
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
    let channels: ReturnType<typeof client.channel>[] = []
    let timer: ReturnType<typeof setTimeout> | null = null
    let org = ""

    const subscribe = async () => {
      let next: string
      try {
        next = getOrgId()
      } catch {
        return
      }
      if (next === org && channels.length) return
      for (const ch of channels) void client.removeChannel(ch)
      channels = []
      org = next

      // Ask for the callback-based token rather than the client's one-time
      // manual token, which expires with the Clerk session.
      try {
        await client.realtime.setAuth()
      } catch {}

      for (let i = 0; i < TABLES.length; i += TABLES_PER_CHANNEL) {
        const group = TABLES.slice(i, i + TABLES_PER_CHANNEL)
        const ch = client.channel(`scalpos-desktop-${Math.random().toString(36).slice(2, 9)}`)
        for (const table of group) {
          ch.on(
            "postgres_changes",
            { event: "*", schema: "public", table, filter: `org_id=eq.${org}` },
            () => {
              if (timer) clearTimeout(timer)
              timer = setTimeout(() => cb.current(), 300)
            },
          )
        }
        void ch.subscribe()
        channels.push(ch)
      }
    }

    void subscribe()
    // Switching shops (or entering demo mode) changes the org filter.
    window.addEventListener(ORG_CHANGED_EVENT, subscribe)
    return () => {
      window.removeEventListener(ORG_CHANGED_EVENT, subscribe)
      if (timer) clearTimeout(timer)
      for (const ch of channels) void client.removeChannel(ch)
    }
  }, [enabled])
}
