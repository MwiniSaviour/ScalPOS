"use client"

import { useEffect, useState } from "react"
import { DollarSign, Package, Users, AlertTriangle } from "lucide-react"
import { StatCard } from "./stat-card"
import { RevenueChart } from "./revenue-chart"
import { TopProducts } from "./top-products"
import { RecentSales } from "./recent-sales"
import { fetchSales, fetchProducts, fetchCustomers } from "@/lib/api/data"
import { formatCurrency } from "@/lib/utils"
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

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [s, p, c] = await Promise.all([
          fetchSales(),
          fetchProducts(),
          fetchCustomers(),
        ])
        if (cancelled) return
        setSales(s)
        setProducts(p)
        setCustomers(c)
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

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
  let revenueChangeType: "up" | "down" = "up"
  if (yesterdayRevenue > 0) {
    const pct = Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
    revenueChangeType = pct >= 0 ? "up" : "down"
    revenueChange = `${Math.abs(pct)}% from yesterday`
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
          value={formatCurrency(todayRevenue)}
          change={revenueChange}
          changeType={revenueChangeType}
          icon={DollarSign}
          iconBg="bg-success-bg"
        />
        <StatCard
          title="Total Products"
          value={String(products.length)}
          change={`${newProducts} new this month`}
          changeType="up"
          icon={Package}
          iconBg="bg-info-bg"
        />
        <StatCard
          title="Total Customers"
          value={String(customers.length)}
          change={`${newCustomers} new this month`}
          changeType="up"
          icon={Users}
          iconBg="bg-primary-light"
        />
        <StatCard
          title="Low Stock Alerts"
          value={String(lowStockCount)}
          icon={AlertTriangle}
          iconBg="bg-danger-bg"
        />
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
