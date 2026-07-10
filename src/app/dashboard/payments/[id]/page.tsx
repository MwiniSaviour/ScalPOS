"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, Printer } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { PAYMENT_METHODS } from "@/lib/constants"
import type { Sale, SaleItem, Customer, Profile } from "@/lib/types"

export default function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [sale, setSale] = useState<Sale | null>(null)
  const [items, setItems] = useState<SaleItem[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [employee, setEmployee] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: s } = await supabase
        .from("sales")
        .select("*")
        .eq("id", id)
        .single()
      if (!s) { setLoading(false); return }

      setSale(s)

      const { data: i } = await supabase
        .from("sale_items")
        .select("*")
        .eq("sale_id", id)
      if (i) setItems(i)

      if (s.customer_id) {
        const { data: c } = await supabase.from("customers").select("*").eq("id", s.customer_id).single()
        if (c) setCustomer(c)
      }
      if (s.employee_id) {
        const { data: e } = await supabase.from("profiles").select("*").eq("id", s.employee_id).single()
        if (e) setEmployee(e)
      }

      setLoading(false)
    }
    load()
  }, [id, supabase])

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted">Loading...</div>
  }

  if (!sale) {
    return <div className="py-20 text-center text-muted">Payment record not found</div>
  }

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
            <p className="text-sm text-muted">{formatDateTime(sale.created_at)}</p>
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
                <p className="text-sm text-muted">{customer.email}</p>
                <p className="text-sm text-muted">{customer.phone}</p>
              </>
            ) : (
              <p className="text-sm text-muted">Walk-in customer</p>
            )}
          </div>
          <div className="space-y-2 text-right">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">Details</h3>
            <p className="font-medium text-foreground">
              Payment: <span className="badge-info">{PAYMENT_METHODS.find(p => p.value === sale.payment_method)?.label}</span>
            </p>
            <p className="text-sm text-muted">
              Processed by: {employee?.name || "N/A"}
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
