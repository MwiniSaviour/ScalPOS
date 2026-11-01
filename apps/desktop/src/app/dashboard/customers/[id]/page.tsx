"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, Mail, Phone, MapPin } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { Customer, Sale } from "@/lib/types"

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: c } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single()
      if (c) setCustomer(c)

      const { data: s } = await supabase
        .from("sales")
        .select("*, items:sale_items(*)")
        .eq("customer_id", id)
        .order("created_at", { ascending: false })
      if (s) setSales(s as unknown as Sale[])

      setLoading(false)
    }
    load()
  }, [id, supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted">
        Loading...
      </div>
    )
  }

  if (!customer) {
    return <div className="py-20 text-center text-muted">Customer not found</div>
  }

  return (
    <div>
      <Link
        href="/dashboard/customers"
        className="mb-4 flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Customers
      </Link>

      <div className="glass-panel p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-light text-2xl font-bold text-primary">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{customer.name}</h1>
            <div className="mt-2 space-y-1 text-sm text-muted">
              {customer.email && (
                <p className="flex items-center gap-2">
                  <Mail size={15} />
                  {customer.email}
                </p>
              )}
              {customer.phone && (
                <p className="flex items-center gap-2">
                  <Phone size={15} />
                  {customer.phone}
                </p>
              )}
              {customer.address && (
                <p className="flex items-center gap-2">
                  <MapPin size={15} />
                  {customer.address}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-foreground">
              {formatCurrency(customer.total_purchases)}
            </p>
            <p className="text-xs text-muted">Total purchases</p>
          </div>
        </div>
      </div>

      <h2 className="mb-4 text-lg font-semibold text-foreground">
        Purchase History ({sales.length})
      </h2>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Payment</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted">
                  No purchases yet
                </td>
              </tr>
            ) : (
              sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-sidebar-hover transition-colors">
                  <td className="table-cell font-medium text-foreground">
                    {sale.invoice_no}
                  </td>
                  <td className="table-cell">{formatDate(sale.sale_date)}</td>
                  <td className="table-cell">{sale.items?.length || 0} items</td>
                  <td className="table-cell font-medium text-foreground">
                    {formatCurrency(sale.total)}
                  </td>
                  <td className="table-cell">
                    <span className="badge-info">{sale.payment_method}</span>
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
