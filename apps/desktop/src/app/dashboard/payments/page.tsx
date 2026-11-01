"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, ArrowRight } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDateTime, cn } from "@/lib/utils"
import { PAYMENT_METHODS } from "@/lib/constants"
import type { Sale } from "@/lib/types"

export default function PaymentsPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [methodFilter, setMethodFilter] = useState("")
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("sales")
      .select("*, customer:customers(*)")
      .order("created_at", { ascending: false })
    if (data) setSales(data as unknown as Sale[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetch() }, [fetch])

  const filtered = sales.filter((s) => {
    const matchSearch =
      s.invoice_no.toLowerCase().includes(search.toLowerCase()) ||
      s.customer?.name.toLowerCase().includes(search.toLowerCase())
    const matchMethod = !methodFilter || s.payment_method === methodFilter
    return matchSearch && matchMethod
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Payment Records</h1>
          <p className="page-subtitle">{sales.length} total transactions</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            placeholder="Search by invoice or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="input-field w-auto min-w-[140px]"
        >
          <option value="">All methods</option>
          {PAYMENT_METHODS.map((pm) => (
            <option key={pm.value} value={pm.value}>{pm.label}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Subtotal</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted">Loading...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted">No payment records found</td>
              </tr>
            ) : (
              filtered.map((sale) => (
                <tr key={sale.id} className="hover:bg-sidebar-hover transition-colors">
                  <td className="table-cell font-mono text-xs font-medium text-foreground">
                    {sale.invoice_no}
                  </td>
                  <td className="table-cell">{formatDateTime(sale.created_at)}</td>
                  <td className="table-cell">{sale.customer?.name || "Walk-in"}</td>
                  <td className="table-cell">{formatCurrency(sale.subtotal)}</td>
                  <td className="table-cell">
                    {sale.discount > 0 ? (
                      <span className="text-danger">{formatCurrency(sale.discount)}</span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="table-cell font-semibold text-foreground">
                    {formatCurrency(sale.total)}
                  </td>
                  <td className="table-cell">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        sale.payment_method === "cash" && "bg-success-bg text-success",
                        sale.payment_method === "card" && "bg-info-bg text-info",
                        sale.payment_method === "transfer" && "bg-warning-bg text-warning"
                      )}
                    >
                      {PAYMENT_METHODS.find((p) => p.value === sale.payment_method)?.label}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <Link
                      href={`/dashboard/payments/${sale.id}`}
                      className="btn-ghost p-1.5"
                    >
                      <ArrowRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
