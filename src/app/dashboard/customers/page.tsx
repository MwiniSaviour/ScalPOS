"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, Download, Eye, Edit, Trash2, Package } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDate, cn } from "@/lib/utils"
import type { Customer, Sale } from "@/lib/types"

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [salesCounts, setSalesCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false })
    if (data) {
      setCustomers(data)
      const counts: Record<string, number> = {}
      for (const c of data) {
        const { count } = await supabase
          .from("sales")
          .select("*", { count: "exact", head: true })
          .eq("customer_id", c.id)
        counts[c.id] = count || 0
      }
      setSalesCounts(counts)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetch() }, [fetch])

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
  )

  // Stats
  const totalCustomers = customers.length
  const activeCustomers = customers.filter((c) => c.total_purchases > 0).length
  const totalRevenue = customers.reduce((sum, c) => sum + (c.total_purchases || 0), 0)
  const avgOrderValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0

  // New this month
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const newThisMonth = customers.filter((c) => new Date(c.created_at) >= startOfMonth).length

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this customer?")) return
    await supabase.from("customers").delete().eq("id", id)
    fetch()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Management</h1>
          <p className="page-subtitle">{totalCustomers} registered customers</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary">
            <Download size={16} />
            Export
          </button>
          <button className="btn-primary">
            <Plus size={16} />
            Create Customer
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted">Total Customers</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{totalCustomers}</p>
            <p className="mt-1 text-xs text-muted">No new customers</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-hover">
            <Package size={20} className="text-muted" />
          </div>
        </div>
        <div className="stat-card flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted">Active Customers</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{activeCustomers}</p>
            <p className="mt-1 text-xs text-muted">{totalCustomers > 0 ? Math.round((activeCustomers / totalCustomers) * 100) : 0}% active rate</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-hover">
            <Package size={20} className="text-muted" />
          </div>
        </div>
        <div className="stat-card flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted">New This Month</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{newThisMonth}</p>
            <p className="mt-1 text-xs text-muted">0% growth</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-hover">
            <Package size={20} className="text-muted" />
          </div>
        </div>
        <div className="stat-card flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted">Avg. Order Value</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{formatCurrency(avgOrderValue)}</p>
            <p className="mt-1 text-xs text-muted">Per order</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-hover">
            <Package size={20} className="text-muted" />
          </div>
        </div>
      </div>

      {/* Customer Directory */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="text-lg font-bold text-foreground">Customer Directory</h2>
        </div>

        {/* Search */}
        <div className="border-b border-border p-4">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9"
            />
          </div>
        </div>

        {/* Customer List */}
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted">
              <p className="text-lg font-medium">No customers found</p>
              <p className="text-sm">Try adjusting your search</p>
            </div>
          ) : (
            filtered.map((customer) => (
              <div
                key={customer.id}
                className="flex items-center gap-4 rounded-xl border border-border p-4 transition-all hover:border-primary/30 hover:shadow-sm"
              >
                {/* Avatar */}
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sidebar-hover text-lg font-bold text-muted">
                  {getInitials(customer.name)}
                </div>

                {/* Customer Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{customer.name}</h3>
                    <span className="inline-flex items-center rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success">
                      Active
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted">
                    {customer.email && (
                      <span className="flex items-center gap-1.5">
                        <Package size={13} />
                        {customer.email}
                      </span>
                    )}
                    {customer.phone && (
                      <span className="flex items-center gap-1.5">
                        <Package size={13} />
                        {customer.phone}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-sm text-muted">
                    <span>{salesCounts[customer.id] || 0} orders</span>
                    <span>{formatCurrency(customer.total_purchases)} spent</span>
                    <span>Joined {formatDate(customer.created_at)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Link
                    href={`/dashboard/customers/${customer.id}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-sidebar-hover hover:text-foreground transition-all"
                    title="View"
                  >
                    <Eye size={18} />
                  </Link>
                  <button
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-sidebar-hover hover:text-foreground transition-all"
                    title="Edit"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(customer.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-danger-bg hover:text-danger transition-all"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
