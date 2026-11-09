"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import { Download, ShoppingCart, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { fetchSales } from "@/lib/api/data"
import { dueOf } from "@/lib/orders-ui"
import { useRealtime } from "@/lib/api/realtime"
import { formatCedi, formatCurrency, formatDateTime } from "@/lib/utils"
import type { Sale } from "@/lib/types"
import { cn } from "@/lib/utils"

const COLORS = ["#047857", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"]

type Period = "today" | "yesterday" | "7d" | "30d" | "90d" | "all" | "custom"

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom..." },
]

const DAY = 86_400_000

function startOfToday(now: number): number {
  const d = new Date(now)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function parseDay(value: string): number {
  const [y, m, d] = value.split("-").map((n) => Number.parseInt(n, 10))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return NaN
  return new Date(y, m - 1, d).getTime()
}

function periodWindow(period: Period, from: string, to: string, now: number): { from: number | null; to: number | null } {
  if (period === "all" || !(now > 0)) return { from: null, to: null }
  const todayStart = startOfToday(now)
  if (period === "custom") {
    const f = from ? parseDay(from) : NaN
    const t = to ? parseDay(to) : NaN
    return {
      from: Number.isFinite(f) ? f : null,
      to: Number.isFinite(t) ? t + DAY : null,
    }
  }
  switch (period) {
    case "yesterday":
      return { from: todayStart - DAY, to: todayStart }
    case "7d":
      return { from: todayStart - 6 * DAY, to: todayStart + DAY }
    case "30d":
      return { from: todayStart - 29 * DAY, to: todayStart + DAY }
    case "90d":
      return { from: todayStart - 89 * DAY, to: todayStart + DAY }
    default:
      return { from: todayStart, to: todayStart + DAY }
  }
}

function prevWindow(
  period: Period,
  from: string,
  to: string,
  now: number,
  win: { from: number | null; to: number | null },
) {
  if (period === "all" || !(now > 0)) return null
  if (period === "custom") {
    if (win.from === null) return null
    if (win.to === null) {
      const f = from ? parseDay(from) : NaN
      if (!Number.isFinite(f)) return null
      const span = startOfToday(now) - f
      return { from: f - span, to: f }
    }
    const span = (win.to ?? 0) - win.from
    return { from: win.from - span, to: win.from }
  }
  if (win.from === null || win.to === null) return null
  const span = win.to - win.from
  return { from: win.from - span, to: win.from }
}

function inBounds(t: number, b: { from: number | null; to: number | null }): boolean {
  if (b.from !== null && t < b.from) return false
  if (b.to !== null && t >= b.to) return false
  return true
}

function periodLabel(period: Period, from: string, to: string): string {
  if (period === "custom") {
    const f = from ? parseDay(from) : NaN
    const t = to ? parseDay(to) : NaN
    const parts: string[] = []
    if (Number.isFinite(f)) parts.push(new Date(f).toLocaleDateString("en-GB", { day: "numeric", month: "short" }))
    if (Number.isFinite(t)) parts.push(new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" }))
    if (parts.length === 0) return "All time"
    return parts.join(" – ")
  }
  return PERIODS.find((p) => p.value === period)?.label ?? "All time"
}

function pctText(current: number, prev: number): { pct: number | null; up: boolean } {
  if (prev <= 0) return { pct: current > 0 ? 100 : null, up: true }
  const pct = Math.round(((current - prev) / prev) * 100)
  return { pct, up: pct >= 0 }
}

export default function AnalyticsPage() {
  const [allSales, setAllSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [period, setPeriod] = useState<Period>("7d")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [now, setNow] = useState(0)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const s = await fetchSales()
      setAllSales(s)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => void load(), 0)
    return () => clearTimeout(t)
  }, [load])

  useRealtime(load)

  useEffect(() => {
    const t0 = setTimeout(() => setNow(Date.now()), 0)
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => {
      clearTimeout(t0)
      clearInterval(t)
    }
  }, [])

  const win = useMemo(() => periodWindow(period, from, to, now), [period, from, to, now])
  const prevWin = useMemo(() => prevWindow(period, from, to, now, win), [period, from, to, now, win])

  const sales = useMemo(
    () => allSales.filter((s) => inBounds(new Date(s.created_at).getTime(), win) && s.status !== "refunded"),
    [allSales, win],
  )
  const prevSales = useMemo(
    () =>
      prevWin
        ? allSales.filter((s) => inBounds(new Date(s.created_at).getTime(), prevWin) && s.status !== "refunded")
        : [],
    [allSales, prevWin],
  )
  const items = useMemo(() => sales.flatMap((sale) => sale.items ?? []), [sales])

  const revenueData = useMemo(() => {
    const grouped: Record<string, number> = {}
    sales.forEach((sale) => {
      const date = sale.sale_date
      grouped[date] = (grouped[date] || 0) + sale.total
    })
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date: date.slice(5), amount }))
  }, [sales])

  const topProducts = useMemo(() => {
    const grouped: Record<string, { name: string; quantity: number; revenue: number }> = {}
    items.forEach((item) => {
      const pid = item.product_id || item.product_name
      if (!grouped[pid]) {
        grouped[pid] = { name: item.product_name, quantity: 0, revenue: 0 }
      }
      grouped[pid].quantity += item.quantity
      grouped[pid].revenue += item.subtotal
    })
    return Object.values(grouped)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
  }, [items])

  const topCustomers = useMemo(() => {
    const grouped: Record<string, { name: string; spent: number; orders: number }> = {}
    sales.forEach((s) => {
      const id = s.customer_id ?? "walk-in"
      const name = s.customer?.name ?? "Walk-in"
      if (!grouped[id]) grouped[id] = { name, spent: 0, orders: 0 }
      grouped[id].spent += s.total
      grouped[id].orders += 1
    })
    return Object.entries(grouped)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 4)
  }, [sales])

  const revenueMix = useMemo(() => {
    const sums: Record<string, number> = { cash: 0, momo: 0, card: 0, credit: 0 }
    for (const s of sales) {
      for (const p of s.payments) {
        if (p.method in sums) sums[p.method] += p.amount
      }
      const due = dueOf(s)
      if (due > 0) sums.credit += due
    }
    return ["cash", "momo", "card", "credit"].map((m) => ({
      name: m === "momo" ? "MoMo" : m.charAt(0).toUpperCase() + m.slice(1),
      method: m,
      value: Math.round(sums[m] * 100) / 100,
    })).filter((r) => r.value > 0)
  }, [sales])

  const recentSales = useMemo(() => {
    return [...sales]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
  }, [sales])

  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0)
  const prevRevenue = prevSales.reduce((sum, s) => sum + s.total, 0)
  const delta = pctText(totalRevenue, prevRevenue)
  const totalSales = sales.length
  const avgSale = totalSales > 0 ? totalRevenue / totalSales : 0

  function exportCSV() {
    const headers = "Invoice No,Date,Customer,Payment Method,Status,Total\n"
    const rows = sales
      .map(
        (s) =>
          `${s.invoice_no},${s.sale_date},${s.customer?.name ?? "Walk-in"},${s.payment_method},${s.status},${s.total}`
      )
      .join("\n")
    const blob = new Blob([headers + rows], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `scalpos-report-${periodLabel(period, from, to).replace(/\s/g, "-").toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics &amp; Reporting</h1>
          <p className="page-subtitle">Sales performance and insights</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                  period === p.value
                    ? "bg-primary text-white"
                    : "bg-sidebar-hover text-muted hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button onClick={exportCSV} className="btn-secondary">
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {period === "custom" && (
        <div className="flex items-end gap-2">
          <label className="text-xs text-muted">
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="input-field mt-1 block w-auto"
            />
          </label>
          <label className="text-xs text-muted">
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="input-field mt-1 block w-auto"
            />
          </label>
        </div>
      )}

      {loadError ? (
        <div className="rounded-xl border border-danger/20 bg-danger-bg px-4 py-3 text-sm text-danger">
          Failed to load reports. Check your connection.
          <button onClick={load} className="ml-3 btn-ghost text-sm">Retry</button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-20 text-muted">Loading...</div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="stat-card min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-muted">Total Revenue</p>
                  <p className="mt-2 text-xl leading-snug font-bold text-foreground tabular-nums sm:text-2xl xl:text-3xl">
                    {formatCedi(totalRevenue)}
                  </p>
                  {delta.pct !== null && prevRevenue > 0 ? (
                    <p className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs font-medium">
                      {delta.up ? (
                        <ArrowUpRight size={14} className="shrink-0 text-success" />
                      ) : (
                        <ArrowDownRight size={14} className="shrink-0 text-danger" />
                      )}
                      <span className={delta.up ? "text-success" : "text-danger"}>
                        {Math.abs(delta.pct)}%
                      </span>
                      <span className="text-muted">
                        vs {formatCedi(prevRevenue)} before
                      </span>
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted">{periodLabel(period, from, to)}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="stat-card min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-muted">Total Sales</p>
                  <p className="mt-2 text-2xl xl:text-3xl font-bold text-foreground">{totalSales}</p>
                  <p className="mt-1 text-xs text-muted">Transactions · {periodLabel(period, from, to)}</p>
                </div>
              </div>
            </div>
            <div className="stat-card min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-muted">Average Sale</p>
                  <p className="mt-2 text-xl leading-snug font-bold text-foreground tabular-nums sm:text-2xl xl:text-3xl">
                    {formatCedi(avgSale)}
                  </p>
                  <p className="mt-1 text-xs text-muted">Per transaction</p>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue chart */}
          <div className="glass-panel p-6">
            <h3 className="mb-4 text-lg font-bold text-foreground">Revenue Trend</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} tickFormatter={(v) => `GH₵${v}`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
                  <Line type="monotone" dataKey="amount" stroke="#047857" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Payment mix */}
            <div className="glass-panel p-6">
              <h3 className="mb-4 text-lg font-bold text-foreground">Payment Methods</h3>
              {revenueMix.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted">No payments in this period</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenueMix}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                          label={({ name, percent }: { name?: string; percent?: number }) =>
                            `${name} (${((percent || 0) * 100).toFixed(0)}%)`
                          }
                        labelLine={false}
                      >
                        {revenueMix.map((entry, i) => (
                          <Cell key={entry.method} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <p className="mt-2 text-xs text-muted">
                Credit is the amount customers still owe from this period&apos;s orders.
              </p>
            </div>

            {/* Top Products bar chart */}
            <div className="glass-panel p-6">
              <h3 className="mb-4 text-lg font-bold text-foreground">Top Products Chart</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} tickFormatter={(v) => `GH₵${v}`} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#475569" }} width={90} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
                    <Bar dataKey="revenue" fill="#047857" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top Selling Products */}
            <div className="glass-panel">
              <div className="border-b border-border p-5">
                <h3 className="text-lg font-bold text-foreground">Top Selling Products</h3>
              </div>
              <div className="p-4 space-y-3">
                {topProducts.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted">No sales data</p>
                ) : (
                  topProducts.map((product, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-border p-4 transition-all hover:border-primary/30"
                    >
                      <div>
                        <p className="font-semibold text-foreground">{product.name}</p>
                        <p className="text-sm text-muted">{product.quantity} units sold</p>
                      </div>
                      <span className="font-bold text-primary">{formatCurrency(product.revenue)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Customers */}
            <div className="glass-panel">
              <div className="border-b border-border p-5">
                <h3 className="text-lg font-bold text-foreground">Top Customers</h3>
              </div>
              <div className="p-4 space-y-3">
                {topCustomers.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted">No customer data</p>
                ) : (
                  topCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className="flex items-center justify-between rounded-lg border border-border p-4 transition-all hover:border-primary/30"
                    >
                      <div>
                        <p className="font-semibold text-foreground">{customer.name}</p>
                        <p className="text-sm text-muted">{customer.orders} order{customer.orders === 1 ? "" : "s"}</p>
                      </div>
                      <span className="font-bold text-primary">{formatCurrency(customer.spent)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass-panel">
            <div className="border-b border-border p-5">
              <h3 className="text-lg font-bold text-foreground">Recent Activity</h3>
            </div>
            <div className="p-4 space-y-3">
              {recentSales.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">No recent activity</p>
              ) : (
                recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between rounded-lg border border-border p-4 transition-all hover:border-primary/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success-bg">
                        <ShoppingCart size={18} className="text-success" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          New order <span className="font-semibold">{sale.invoice_no}</span>
                        </p>
                        <p className="text-sm text-muted">
                          {formatDateTime(sale.created_at)}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-foreground">{formatCurrency(sale.total)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
