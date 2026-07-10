"use client"

import { useState, useEffect, useMemo } from "react"
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
import { Download, ShoppingCart, Package } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import type { Sale, SaleItem, Customer } from "@/lib/types"

const COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"]

export default function AnalyticsPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [items, setItems] = useState<SaleItem[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<"7" | "30" | "90">("7")
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const days = parseInt(period)
      const since = new Date()
      since.setDate(since.getDate() - days)

      const [sRes, cRes] = await Promise.all([
        supabase
          .from("sales")
          .select("*")
          .gte("created_at", since.toISOString())
          .order("created_at"),
        supabase
          .from("customers")
          .select("*"),
      ])

      const s = sRes.data
      if (s) {
        setSales(s)
        const { data: i } = await supabase
          .from("sale_items")
          .select("*")
          .in("sale_id", s.map((sale) => sale.id))
        if (i) setItems(i)
      }
      if (cRes.data) setCustomers(cRes.data)
      setLoading(false)
    }
    load()
  }, [supabase, period])

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
    return customers
      .filter((c) => c.total_purchases > 0)
      .sort((a, b) => b.total_purchases - a.total_purchases)
      .slice(0, 4)
      .map((c) => ({
        name: c.name,
        spent: c.total_purchases,
        id: c.id,
      }))
  }, [customers])

  const recentSales = useMemo(() => {
    return [...sales]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
  }, [sales])

  const paymentMethodData = useMemo(() => {
    const grouped: Record<string, number> = {}
    sales.forEach((sale) => {
      const method = sale.payment_method
      grouped[method] = (grouped[method] || 0) + sale.total
    })
    return Object.entries(grouped).map(([name, value]) => ({ name, value }))
  }, [sales])

  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0)
  const totalSales = sales.length
  const avgSale = totalSales > 0 ? totalRevenue / totalSales : 0

  function exportCSV() {
    const headers = "Invoice No,Date,Customer,Payment Method,Total\n"
    const rows = sales
      .map(
        (s) =>
          `${s.invoice_no},${s.sale_date},${s.customer_id || ""},${s.payment_method},${s.total}`
      )
      .join("\n")
    const blob = new Blob([headers + rows], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `sales-report-${period}d.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics & Reporting</h1>
          <p className="page-subtitle">Sales performance and insights</p>
        </div>
        <div className="flex gap-3">
          <div className="flex gap-1 rounded-lg border border-border p-0.5">
            {(["7", "30", "90"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                  period === p
                    ? "bg-primary text-white"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {p}d
              </button>
            ))}
          </div>
          <button onClick={exportCSV} className="btn-secondary">
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="stat-card">
          <p className="text-sm font-medium text-muted">Total Revenue</p>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {formatCurrency(totalRevenue)}
          </p>
          <p className="mt-1 text-xs text-muted">In the last {period} days</p>
        </div>
        <div className="stat-card">
          <p className="text-sm font-medium text-muted">Total Sales</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{totalSales}</p>
          <p className="mt-1 text-xs text-muted">Transactions</p>
        </div>
        <div className="stat-card">
          <p className="text-sm font-medium text-muted">Average Sale</p>
          <p className="mt-2 text-3xl font-bold text-foreground">
            {formatCurrency(avgSale)}
          </p>
          <p className="mt-1 text-xs text-muted">Per transaction</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted">Loading...</div>
      ) : (
        <>
          {/* Revenue chart */}
          <div className="glass-panel p-6">
            <h3 className="mb-4 text-lg font-bold text-foreground">Revenue Trend</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
                  <Line type="monotone" dataKey="amount" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Payment methods */}
            <div className="glass-panel p-6">
              <h3 className="mb-4 text-lg font-bold text-foreground">Payment Methods</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }: any) =>
                        `${name} (${((percent || 0) * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                    >
                      {paymentMethodData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Products bar chart */}
            <div className="glass-panel p-6">
              <h3 className="mb-4 text-lg font-bold text-foreground">Top Products Chart</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94a3b8" }} tickFormatter={(v) => `$${v}`} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#475569" }} width={90} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
                    <Bar dataKey="revenue" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={20} />
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
                  topCustomers.map((customer, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-border p-4 transition-all hover:border-primary/30"
                    >
                      <div>
                        <p className="font-semibold text-foreground">{customer.name}</p>
                        <p className="text-sm text-muted">4 orders</p>
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
