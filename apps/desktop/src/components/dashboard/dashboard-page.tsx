"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, ChevronRight, Package, Users, Wallet } from "lucide-react"
import Link from "next/link"
import { cn, formatCedi } from "@/lib/utils"
import { dueOf, isOnCredit } from "@/lib/orders-ui"
import { useRealtime } from "@/lib/api/realtime"
import { StatCard } from "./stat-card"
import { RevenueChart } from "./revenue-chart"
import { TopProducts } from "./top-products"
import { RecentSales } from "./recent-sales"
import { fetchSales, fetchProducts, fetchCustomers } from "@/lib/api/data"
import type { Sale, Product, Customer, RevenuePoint, TopProduct } from "@/lib/types"

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

function dateKey(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${m}-${day}`
}

export function DashboardPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      const [s, p, c] = await Promise.all([
        fetchSales(),
        fetchProducts(),
        fetchCustomers(),
      ])
      setSales(s)
      setProducts(p)
      setCustomers(c)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => void load(), 0)
    return () => clearTimeout(t)
  }, [load])

  useRealtime(load)

  const now = new Date()
  const todayStart = startOfDay(now)
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const todayRevenue = sales.reduce(
    (sum, s) => (new Date(s.created_at) >= todayStart ? sum + s.total : sum),
    0
  )
  const yesterdayRevenue = sales.reduce(
    (sum, s) =>
      new Date(s.created_at) >= yesterdayStart && new Date(s.created_at) < todayStart
        ? sum + s.total
        : sum,
    0
  )
  let revenueChange: string | undefined
  let revenueChangeDetail: string | undefined
  let revenueChangeType: "up" | "down" = "up"
  if (yesterdayRevenue > 0) {
    const pct = Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
    revenueChangeType = pct >= 0 ? "up" : "down"
    revenueChange = `${Math.abs(pct)}%`
    revenueChangeDetail = `vs ${formatCedi(yesterdayRevenue)} yesterday`
  } else if (todayRevenue > 0) {
    revenueChange = "First sales today"
  }

  const newProducts = products.filter(
    (p) => p.created_at && new Date(p.created_at) >= monthStart
  ).length
  const newCustomers = customers.filter(
    (c) => c.created_at && new Date(c.created_at) >= monthStart
  ).length
  const lowStockCount = products.filter((p) => p.stock <= p.low_stock_at).length
  const creditOrders = sales.filter(isOnCredit)
  const customersOnCredit = creditOrders.length
  const creditTotal = creditOrders.reduce((a, s) => a + dueOf(s), 0)

  const totalsByKey = new Map<string, number>()
  for (const s of sales) {
    const k = dateKey(new Date(s.created_at))
    totalsByKey.set(k, (totalsByKey.get(k) ?? 0) + s.total)
  }
  const series: RevenuePoint[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(todayStart)
    d.setDate(d.getDate() - i)
    series.push({
      date: `${MONTHS[d.getMonth()]} ${d.getDate()}`,
      amount: totalsByKey.get(dateKey(d)) ?? 0,
    })
  }

  const productMap = new Map<string, TopProduct>()
  for (const s of sales) {
    if (new Date(s.created_at) < monthStart) continue
    for (const item of s.items ?? []) {
      if (!item.product_name) continue
      const existing = productMap.get(item.product_name)
      if (existing) {
        existing.total_quantity += item.quantity
        existing.total_revenue += item.subtotal
      } else {
        productMap.set(item.product_name, {
          id: item.product_name,
          name: item.product_name,
          image: null,
          total_quantity: item.quantity,
          total_revenue: item.subtotal,
        })
      }
    }
  }
  const topProducts = [...productMap.values()]
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, 5)

  if (loading) {
    return <div className="p-6 text-sm text-muted">Loading dashboard…</div>
  }
  if (error) {
    return (
      <div className="p-6 text-sm text-red-600">
        Failed to load dashboard data. Check your connection and refresh.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Revenue"
          value={formatCedi(todayRevenue)}
          change={revenueChange}
          changeDetail={revenueChangeDetail}
          changeType={revenueChangeType}
        />
        <StatCard
          title="Total Products"
          value={String(products.length)}
          change={`${newProducts} new this month`}
          changeType="up"
          icon={Package}
          iconBg="bg-primary-light"
        />
        <StatCard
          title="Total Customers"
          value={String(customers.length)}
          change={`${newCustomers} new this month`}
          changeType="up"
          icon={Users}
          iconBg="bg-primary-light"
        />
        <div className="glass-panel flex flex-col p-5">
          <p className="text-sm font-medium text-muted">Needs attention</p>
          {lowStockCount === 0 && customersOnCredit === 0 ? (
            <p className="mt-3 text-sm font-semibold text-success">All clear</p>
          ) : (
            <div className="mt-3 space-y-2">
              <Link
                href="/dashboard/products?stock=low"
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                  lowStockCount > 0
                    ? "border-danger/20 bg-danger-bg hover:bg-danger-bg/70"
                    : "border-border bg-sidebar-hover hover:bg-border/40",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    lowStockCount > 0 ? "bg-danger/15 text-danger" : "bg-muted-bg text-muted",
                  )}
                >
                  <AlertTriangle size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">
                    {lowStockCount} low stock
                  </span>
                  <span className="block text-[11px] text-muted">
                    {lowStockCount > 0 ? "Items need restocking" : "Stock levels healthy"}
                  </span>
                </span>
                <ChevronRight size={14} className="shrink-0 text-muted" />
              </Link>
              <Link
                href="/dashboard/orders?filter=unpaid"
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                  customersOnCredit > 0
                    ? "border-warning/25 bg-warning-bg hover:bg-warning-bg/70"
                    : "border-border bg-sidebar-hover hover:bg-border/40",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    customersOnCredit > 0 ? "bg-warning/15 text-warning" : "bg-muted-bg text-muted",
                  )}
                >
                  <Wallet size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">
                    {customersOnCredit} on credit
                  </span>
                  <span className="block text-[11px] text-muted">
                    {customersOnCredit > 0
                      ? `${formatCedi(creditTotal)} outstanding`
                      : "No outstanding balances"}
                  </span>
                </span>
                <ChevronRight size={14} className="shrink-0 text-muted" />
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <RevenueChart data={series} />
        </div>
        <div className="lg:col-span-3">
          <TopProducts data={topProducts} />
        </div>
      </div>

      <RecentSales sales={sales} />
    </div>
  )
}
