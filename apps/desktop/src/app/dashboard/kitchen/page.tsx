"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { AlertTriangle, ChefHat } from "lucide-react"
import { fetchSales, setTicketStatus, fetchRestaurantTables } from "@/lib/api/data"
import { cn, formatCurrency } from "@/lib/utils"
import { ticketNumber, orderTypeLabel } from "@/lib/restaurant"
import { hasFeature } from "@/lib/features"
import { useBusinessType } from "@/lib/terms"
import { useRealtime } from "@/lib/api/realtime"
import type { Sale, TicketStatus } from "@/lib/types"

const GROUPS: { status: TicketStatus; label: string; dot: string }[] = [
  { status: "queued", label: "Queued", dot: "bg-muted-foreground" },
  { status: "preparing", label: "Preparing", dot: "bg-warning" },
  { status: "ready", label: "Ready", dot: "bg-primary" },
]

const NEXT: Partial<Record<TicketStatus, TicketStatus>> = {
  queued: "preparing",
  preparing: "ready",
  ready: "served",
}

const NEXT_ACTION: Partial<Record<TicketStatus, string>> = {
  queued: "Start cooking",
  preparing: "Mark ready",
  ready: "Serve",
}

export default function KitchenPage() {
  const businessType = useBusinessType()
  const kitchenOn = hasFeature(businessType, "kitchen")
  const [sales, setSales] = useState<Sale[]>([])
  const [tables, setTables] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [advancing, setAdvancing] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      const [rows, tableRows] = await Promise.all([fetchSales(), fetchRestaurantTables()])
      setSales(rows)
      setTables(Object.fromEntries(tableRows.map((t) => [t.id, t.name])))
    } catch {
      setError("Failed to load tickets. Check your connection and refresh.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => void load(), 0)
    const tick = setInterval(() => void load(), 10_000)
    return () => {
      clearTimeout(t)
      clearInterval(tick)
    }
  }, [load])

  useRealtime(load)

  const tickets = useMemo(
    () =>
      sales
        .filter((s) => s.status !== "refunded" && s.ticket_status && s.ticket_status !== "served")
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [sales],
  )

  async function advance(sale: Sale) {
    const next = sale.ticket_status ? NEXT[sale.ticket_status] : undefined
    if (!next) return
    setAdvancing(sale.id)
    try {
      await setTicketStatus(sale.id, next)
      setSales((prev) => prev.map((s) => (s.id === sale.id ? { ...s, ticket_status: next } : s)))
    } catch {
      setError("Could not update that ticket. Refresh and try again.")
    } finally {
      setAdvancing(null)
    }
  }

  if (!kitchenOn) {
    return (
      <div className="glass-panel p-6 text-center">
        <ChefHat size={18} className="mx-auto mb-2 text-muted" />
        <p className="text-sm text-muted">The kitchen board is only used by food businesses.</p>
      </div>
    )
  }

  if (loading) return <div className="p-6 text-sm text-muted">Loading tickets…</div>

  if (error) {
    return (
      <div className="glass-panel p-6 text-center">
        <AlertTriangle size={18} className="mx-auto mb-2 text-danger" />
        <p className="text-sm text-muted">{error}</p>
        <button onClick={load} className="btn-secondary mt-3 text-xs">Retry</button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">Kitchen</h1>
          <p className="page-subtitle">{tickets.length} open ticket{tickets.length === 1 ? "" : "s"}</p>
        </div>
      </div>

      {tickets.length === 0 ? (
        <div className="glass-panel p-10 text-center">
          <ChefHat size={24} className="mx-auto mb-2 text-muted" />
          <p className="text-sm text-muted">No open tickets. New orders appear here.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {GROUPS.map((group) => {
            const list = tickets.filter((t) => t.ticket_status === group.status)
            return (
              <div key={group.status} className="glass-panel flex flex-col overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                  <span className={cn("h-2 w-2 rounded-full", group.dot)} />
                  <h2 className="text-sm font-semibold text-foreground">{group.label}</h2>
                  <span className="ml-auto text-xs font-semibold text-muted">{list.length}</span>
                </div>
                <div className="flex-1 space-y-3 p-3">
                  {list.length === 0 ? (
                    <p className="px-1 py-4 text-center text-xs text-muted">Nothing here.</p>
                  ) : (
                    list.map((sale) => (
                      <div key={sale.id} className="rounded-xl border border-border bg-card p-3">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-bold text-foreground">
                            #{ticketNumber(sale.invoice_no)}
                          </span>
                          <span className="text-[11px] text-muted">
                            {new Date(sale.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {[
                            orderTypeLabel(sale.order_type) || null,
                            sale.table_id ? tables[sale.table_id] ?? null : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "Counter"}
                        </p>
                        <ul className="mt-2 space-y-1">
                          {(sale.items ?? []).map((i) => (
                            <li key={i.id} className="text-[13px] leading-5">
                              <span className="font-medium text-foreground">
                                {i.quantity}× {i.product_name}
                              </span>
                              {i.variant_name ? (
                                <span className="text-muted"> · {i.variant_name}</span>
                              ) : null}
                              {(i.modifier_names ?? []).length > 0 ? (
                                <span className="block pl-4 text-[11px] text-muted">
                                  + {(i.modifier_names ?? []).join(", ")}
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            {formatCurrency(sale.total)}
                          </span>
                          {NEXT[sale.ticket_status as TicketStatus] ? (
                            <button
                              onClick={() => void advance(sale)}
                              disabled={advancing === sale.id}
                              className="btn-primary px-3 py-1.5 text-xs disabled:opacity-60"
                            >
                              {advancing === sale.id ? "…" : NEXT_ACTION[sale.ticket_status as TicketStatus]}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
