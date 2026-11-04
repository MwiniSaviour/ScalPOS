"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, ArrowRight, AlertCircle } from "lucide-react"
import Link from "next/link"
import { fetchSales } from "@/lib/api/data"
import { formatCurrency, formatDateTime, cn } from "@/lib/utils"
import type { Sale, PaymentMethod } from "@/lib/types"

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  momo: "Mobile Money",
  card: "Card",
  credit: "Credit",
}

const METHOD_BADGES: Record<PaymentMethod, string> = {
  cash: "bg-success-bg text-success",
  momo: "bg-warning-bg text-warning",
  card: "bg-info-bg text-info",
  credit: "bg-danger-bg text-danger",
}

const STATUS_BADGES: Record<string, string> = {
  paid: "bg-success-bg text-success",
  pending: "bg-warning-bg text-warning",
  refunded: "bg-danger-bg text-danger",
}

export default function PaymentsPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [methodFilter, setMethodFilter] = useState("")

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      const data = await fetchSales()
      setSales(data)
    } catch {
      setError("Failed to load payments. Check your connection.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = sales.filter((s) => {
    const term = search.toLowerCase()
    const customerName = (s.customer?.name ?? "").toLowerCase()
    const matchSearch =
      !term ||
      s.invoice_no.toLowerCase().includes(term) ||
      customerName.includes(term)
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
          {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => (
            <option key={m} value={m}>{METHOD_LABELS[m]}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-danger/20 bg-danger-bg px-4 py-3 text-sm text-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={load} className="ml-auto btn-ghost text-sm">Retry</button>
        </div>
      )}

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
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-muted">Loading...</td>
              </tr>
            ) : !error && filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-muted">No payment records found</td>
              </tr>
            ) : (
              filtered.map((sale) => (
                <tr key={sale.id} className="hover:bg-sidebar-hover transition-colors">
                  <td className="table-cell font-mono text-xs font-medium text-foreground">
                    {sale.invoice_no}
                  </td>
                  <td className="table-cell">{formatDateTime(sale.sale_date)}</td>
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
                        METHOD_BADGES[sale.payment_method] ?? "bg-muted-bg text-muted"
                      )}
                    >
                      {METHOD_LABELS[sale.payment_method] ?? sale.payment_method}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                        STATUS_BADGES[sale.payment_status] ?? "bg-muted-bg text-muted"
                      )}
                    >
                      {sale.payment_status}
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
