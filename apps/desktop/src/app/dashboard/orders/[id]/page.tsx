"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, Printer, AlertCircle, Banknote } from "lucide-react"
import Link from "next/link"
import { fetchSale, fetchSettings, recordOrderPayment, fetchRestaurantTables } from "@/lib/api/data"
import { formatCurrency, formatDateTime, cn } from "@/lib/utils"
import type { Sale, PaymentMethod, ShopSettings } from "@/lib/types"
import { PAY_STATUS_BADGES, ORDER_STATUS_LABELS, paidOf, dueOf } from "@/lib/orders-ui"
import { OrderReceipt } from "@/components/orders/receipt"
import { useRealtime } from "@/lib/api/realtime"

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  momo: "Mobile Money",
  card: "Card",
  credit: "Credit",
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [sale, setSale] = useState<Sale | null>(null)
  const [settings, setSettings] = useState<ShopSettings | null>(null)
  const [tables, setTables] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [payOpen, setPayOpen] = useState(false)
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash")
  const [payAmount, setPayAmount] = useState("")
  const [payError, setPayError] = useState("")
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      setError("")
      const data = await fetchSale(id)
      setSale(data)
    } catch {
      setError("Failed to load the order. Check your connection.")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    const t = setTimeout(() => void load(), 0)
    return () => clearTimeout(t)
  }, [load])

  useRealtime(load, Boolean(id))

  useEffect(() => {
    fetchSettings().then(setSettings).catch(() => {})
    fetchRestaurantTables()
      .then((ts) => setTables(Object.fromEntries(ts.map((t) => [t.id, t.name]))))
      .catch(() => {})
  }, [])

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
    return <div className="py-20 text-center text-muted">Order not found</div>
  }

  const customer = sale.customer ?? null
  const items = sale.items ?? []
  const paid = paidOf(sale)
  const due = dueOf(sale)
  const refunded = sale.status === "refunded"

  async function submitPayment() {
    if (!sale) return
    const amount = Number(payAmount)
    setPayError("")
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayError("Enter a payment amount greater than zero.")
      return
    }
    if (amount > due + 0.005) {
      setPayError("The payment is larger than the outstanding balance.")
      return
    }
    setSaving(true)
    try {
      const updated = await recordOrderPayment(sale.id, { method: payMethod, amount })
      setSale(updated)
      setPayOpen(false)
      setPayAmount("")
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Could not record the payment.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <OrderReceipt sale={sale} settings={settings} tableName={sale.table_id ? tables[sale.table_id] ?? null : null} className="hidden print:block" />
      <div className="print:hidden">
      <Link
        href="/dashboard/orders"
        className="mb-4 flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Orders
      </Link>

      <div className="glass-panel p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{sale.invoice_no}</h1>
            <p className="text-sm text-muted">{formatDateTime(sale.sale_date)}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                PAY_STATUS_BADGES[sale.pay_status] ?? "bg-muted-bg text-muted"
              )}
            >
              {ORDER_STATUS_LABELS[sale.pay_status] ?? sale.pay_status}
            </span>
            <button onClick={() => window.print()} className="btn-secondary">
              <Printer size={16} />
              Print Receipt
            </button>
          </div>
        </div>

        {/* money summary */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs font-medium text-muted">Total</p>
            <p className="mt-1 text-xl font-bold text-foreground">{formatCurrency(sale.total)}</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs font-medium text-muted">Paid so far</p>
            <p className="mt-1 text-xl font-bold text-success">{formatCurrency(paid)}</p>
            <p className="mt-0.5 text-xs text-muted">
              {sale.payments.length === 0
                ? "No payments yet"
                : sale.payments.map((p) => p.method).join(", ")}
            </p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs font-medium text-muted">Balance</p>
            <p
              className={cn(
                "mt-1 text-xl font-bold",
                due > 0 && !refunded ? "text-danger" : "text-foreground"
              )}
            >
              {refunded ? "—" : formatCurrency(due)}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {refunded ? "Order refunded" : due > 0 ? "Credit on account" : "Fully settled"}
            </p>
          </div>
        </div>

        {!refunded && due > 0 && (
          payOpen ? (
            <div className="mb-6 rounded-xl border border-border p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Record payment</h3>
              {payError && <p className="mb-3 text-sm text-danger">{payError}</p>}
              <div className="flex flex-wrap items-end gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">Method</span>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                    className="input-field w-auto"
                  >
                    {(["cash", "momo", "card"] as PaymentMethod[]).map((m) => (
                      <option key={m} value={m}>{METHOD_LABELS[m]}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted">Amount (GH₵)</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder={due.toFixed(2)}
                    className="input-field w-40"
                  />
                </label>
                <button
                  onClick={() => void submitPayment()}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? "Saving..." : "Record"}
                </button>
                <button onClick={() => setPayOpen(false)} className="btn-ghost">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-danger/20 bg-danger-bg p-4">
              <Banknote size={18} className="text-danger" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  Credit sale — {formatCurrency(due)} outstanding
                </p>
                {customer?.name ? (
                  <p className="text-xs text-muted">Customer on record: {customer.name}</p>
                ) : (
                  <p className="text-xs text-muted">Walk-in customer with credit</p>
                )}
              </div>
              <button onClick={() => setPayOpen(true)} className="btn-primary">
                Record payment
              </button>
            </div>
          )
        )}

        <div className="grid gap-6 sm:grid-cols-2 mb-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">Customer</h3>
            {customer ? (
              <>
                <Link href={`/dashboard/customers/${customer.id}`} className="block font-medium text-foreground hover:text-primary">
                  {customer.name}
                </Link>
                {customer.phone && <p className="text-sm text-muted">{customer.phone}</p>}
                {customer.address && <p className="text-sm text-muted">{customer.address}</p>}
              </>
            ) : (
              <p className="text-sm text-muted">Walk-in customer</p>
            )}
          </div>
          <div className="space-y-2 sm:text-right">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">Order status</h3>
            <p className="font-medium text-foreground capitalize">{sale.status}</p>
          </div>
        </div>

        {sale.payments.length > 0 && (
          <div className="mb-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3 text-left">Payment history</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {sale.payments.map((p, i) => (
                  <tr key={i} className="hover:bg-sidebar-hover">
                    <td className="table-cell">
                      {METHOD_LABELS[p.method] ?? p.method}
                      <span className="ml-2 text-xs text-muted">#{i + 1}</span>
                    </td>
                    <td className="table-cell text-right font-medium">{formatCurrency(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
    </>
  )
}
