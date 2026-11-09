"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Search, ArrowRight, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { fetchSales } from "@/lib/api/data"
import { formatCurrency, formatDateTime, cn } from "@/lib/utils"
import type { Sale } from "@/lib/types"
import { dueOf, OrderPayBadge, PERIODS, ordersWindow, type Bounds, type Period } from "@/lib/orders-ui"
import { useRealtime } from "@/lib/api/realtime"

type StatusFilter = "all" | "pending" | "completed" | "refunded" | "unpaid"

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "refunded", label: "Refunded" },
  { value: "unpaid", label: "Unpaid" },
]

function statusMatches(s: { status: string; pay_status: string }, f: StatusFilter): boolean {
  if (f === "pending") return s.status === "pending"
  if (f === "completed") return s.status === "completed"
  if (f === "refunded") return s.status === "refunded"
  if (f === "unpaid") return s.pay_status === "unpaid" || s.pay_status === "partial"
  return true
}

export default function OrdersPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [period, setPeriod] = useState<Period>("all")
  const [filter, setFilter] = useState<StatusFilter>("all")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [now, setNow] = useState(0)

  useEffect(() => {
    const t0 = setTimeout(() => setNow(Date.now()), 0)
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => {
      clearTimeout(t0)
      clearInterval(t)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      const f = new URLSearchParams(window.location.search).get("filter")
      if (f === "pending" || f === "completed" || f === "refunded" || f === "unpaid") {
        setFilter(f)
      }
    }, 0)
    return () => clearTimeout(t)
  }, [])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      setSales(await fetchSales())
    } catch {
      setError("Failed to load orders. Check your connection and refresh.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => void load(), 0)
    return () => clearTimeout(t)
  }, [load])

  useRealtime(load)

  const bounds = useMemo<Bounds>(() => ordersWindow(period, from, to, now), [period, from, to, now])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sales.filter((s) => {
      if (!statusMatches(s, filter)) return false
      if (bounds.from !== null || bounds.to !== null) {
        const ts = new Date(s.sale_date).getTime()
        if (bounds.from !== null && ts < bounds.from) return false
        if (bounds.to !== null && ts >= bounds.to) return false
      }
      if (!q) return true
      return (
        s.invoice_no.toLowerCase().includes(q) ||
        (s.customer?.name ?? "").toLowerCase().includes(q)
      )
    })
  }, [sales, search, filter, bounds])

  const totals = useMemo(() => {
    let revenue = 0
    let due = 0
    for (const s of filtered) {
      if (s.status !== "refunded") revenue += s.total
      if (s.status !== "refunded") due += dueOf(s)
    }
    return { revenue, due }
  }, [filtered])

  if (loading) return <div className="p-6 text-sm text-muted">Loading orders…</div>
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
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">Track sales and credit balances</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
              period === p.id ? "bg-primary text-white" : "bg-card border border-border text-muted hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {period === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium text-muted">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input-field w-auto py-1.5 text-sm" />
          <label className="text-xs font-medium text-muted">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input-field w-auto py-1.5 text-sm" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice or customer…"
            className="input-field pl-9"
          />
        </div>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              filter === f.value ? "bg-foreground text-background" : "bg-sidebar-hover text-muted hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <span className="text-muted">
          <span className="font-semibold text-foreground">{filtered.length}</span> orders ·{" "}
          <span className="font-semibold text-foreground">{formatCurrency(totals.revenue)}</span>
        </span>
        {totals.due > 0 ? (
          <span className="font-semibold text-danger">{formatCurrency(totals.due)} on credit</span>
        ) : null}
      </div>

      <div className="glass-panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Items</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">No orders found for this view.</td>
              </tr>
            ) : (
              filtered.map((sale) => {
                const due = dueOf(sale)
                return (
                  <tr key={sale.id} className="border-b border-border last:border-0 hover:bg-sidebar-hover/40">
                    <td className="px-4 py-3 font-semibold text-foreground">{sale.invoice_no}</td>
                    <td className="px-4 py-3 text-muted">{sale.customer?.name ?? "Walk-in"}</td>
                    <td className="px-4 py-3 text-muted">{formatDateTime(sale.sale_date)}</td>
                    <td className="px-4 py-3 text-right text-muted">
                      {(sale.items ?? []).reduce((n, i) => n + i.quantity, 0)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-semibold text-foreground">{formatCurrency(sale.total)}</div>
                      {due > 0 && sale.status !== "refunded" ? (
                        <div className="text-[11px] font-medium text-danger">{formatCurrency(due)} due</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {sale.status === "refunded" ? (
                        <span className="inline-flex rounded-full bg-muted-bg px-2.5 py-0.5 text-xs font-medium text-muted">
                          Refunded
                        </span>
                      ) : (
                        <OrderPayBadge sale={sale} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/dashboard/orders/${sale.id}`} className="btn-ghost p-1.5">
                        <ArrowRight size={16} />
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
