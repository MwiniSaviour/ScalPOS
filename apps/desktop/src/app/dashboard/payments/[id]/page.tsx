"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, Printer, AlertCircle } from "lucide-react"
import Link from "next/link"
import { fetchSale } from "@/lib/api/data"
import { formatCurrency, formatDateTime, cn } from "@/lib/utils"
import type { Sale, PaymentMethod } from "@/lib/types"

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  momo: "Mobile Money",
  card: "Card",
  credit: "Credit",
}

const STATUS_BADGES: Record<string, string> = {
  paid: "bg-success-bg text-success",
  pending: "bg-warning-bg text-warning",
  refunded: "bg-danger-bg text-danger",
}

export default function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [sale, setSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      setError("")
      const data = await fetchSale(id)
      setSale(data)
    } catch {
      setError("Failed to load payment record. Check your connection.")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted">Loading...</div>
  }

  if (error) {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto mb-4 flex max-w-sm items-center gap-3 rounded-xl border border-danger/20 bg-danger-bg px-4 py-3 text-sm text-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
        <button onClick={load} className="btn-secondary">Retry</button>
      </div>
    )
  }

  if (!sale) {
    return <div className="py-20 text-center text-muted">Payment record not found</div>
  }

  const customer = sale.customer ?? null
  const items = sale.items ?? []

  return (
    <div>
      <Link
        href="/dashboard/payments"
        className="mb-4 flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Payments
      </Link>

      <div className="glass-panel p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {sale.invoice_no}
            </h1>
            <p className="text-sm text-muted">{formatDateTime(sale.sale_date)}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="btn-secondary">
              <Printer size={16} />
              Print Receipt
            </button>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 mb-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">Customer</h3>
            {customer ? (
              <>
                <p className="font-medium text-foreground">{customer.name}</p>
                {customer.phone && <p className="text-sm text-muted">{customer.phone}</p>}
                {customer.address && <p className="text-sm text-muted">{customer.address}</p>}
              </>
            ) : (
              <p className="text-sm text-muted">Walk-in customer</p>
            )}
          </div>
          <div className="space-y-2 sm:text-right">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">Details</h3>
            <p className="font-medium text-foreground">
              Payment:{" "}
              <span className="badge-info">{METHOD_LABELS[sale.payment_method] ?? sale.payment_method}</span>
            </p>
            <p className="text-sm text-muted">
              Status:{" "}
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                  STATUS_BADGES[sale.payment_status] ?? "bg-muted-bg text-muted"
                )}
              >
                {sale.payment_status}
              </span>
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-sidebar-hover">
                  <td className="table-cell font-medium text-foreground">{item.product_name}</td>
                  <td className="table-cell text-right">{formatCurrency(item.unit_price)}</td>
                  <td className="table-cell text-right">{item.quantity}</td>
                  <td className="table-cell text-right font-medium">{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right text-sm text-muted">Subtotal</td>
                <td className="px-4 py-3 text-right text-sm text-foreground">{formatCurrency(sale.subtotal)}</td>
              </tr>
              {sale.tax > 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right text-sm text-muted">Tax</td>
                  <td className="px-4 py-3 text-right text-sm text-muted">{formatCurrency(sale.tax)}</td>
                </tr>
              )}
              {sale.discount > 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right text-sm text-muted">Discount</td>
                  <td className="px-4 py-3 text-right text-sm text-danger">-{formatCurrency(sale.discount)}</td>
                </tr>
              )}
              <tr className="border-t border-border">
                <td colSpan={3} className="px-4 py-3 text-right font-bold text-foreground">Total</td>
                <td className="px-4 py-3 text-right text-lg font-bold text-primary">{formatCurrency(sale.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
