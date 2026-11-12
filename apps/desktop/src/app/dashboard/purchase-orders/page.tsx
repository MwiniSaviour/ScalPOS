"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { PackageCheck, Pencil, Plus, Search, Send, Trash2 } from "lucide-react"
import {
  deletePurchaseOrder,
  fetchPurchaseOrders,
  fetchSuppliers,
  receivePurchaseOrder,
  upsertPurchaseOrder,
} from "@/lib/api/data"
import { useRealtime } from "@/lib/api/realtime"
import { useProducts } from "@/hooks/use-products"
import { formatCurrency, formatDate, cn } from "@/lib/utils"
import type { Product, PurchaseOrder, Supplier } from "@/lib/types"
import { PurchaseOrderForm, type PurchaseOrderDraft } from "./purchase-order-form"

const STATUS_LABELS: Record<PurchaseOrder["status"], string> = {
  draft: "Draft",
  sent: "Sent",
  received: "Received",
}

const STATUS_PILLS: Record<PurchaseOrder["status"], string> = {
  draft: "bg-sidebar-hover text-muted",
  sent: "bg-info-bg text-info",
  received: "bg-success-bg text-success",
}

const FILTERS: { value: "all" | PurchaseOrder["status"]; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "received", label: "Received" },
]

export default function PurchaseOrdersPage() {
  const { products } = useProducts()
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | PurchaseOrder["status"]>("all")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<PurchaseOrder | null>(null)
  const [receiving, setReceiving] = useState<PurchaseOrder | null>(null)
  const [receiveError, setReceiveError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const [orderRows, supplierRows] = await Promise.all([
        fetchPurchaseOrders(),
        fetchSuppliers(),
      ])
      setOrders(orderRows)
      setSuppliers(supplierRows)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load purchase orders")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => void load(), 0)
    return () => clearTimeout(t)
  }, [load])

  useRealtime(load)

  const productById = useMemo(() => {
    const map = new Map<string, Product>()
    for (const product of products) map.set(product.id, product)
    return map
  }, [products])

  const supplierById = useMemo(() => {
    const map = new Map<string, Supplier>()
    for (const supplier of suppliers) map.set(supplier.id, supplier)
    return map
  }, [suppliers])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) return false
      if (!q) return true
      const supplier = order.supplier_id ? supplierById.get(order.supplier_id)?.name ?? "" : ""
      const lines = order.lines
        .map((line) => productById.get(line.productId)?.name ?? "")
        .join(" ")
      return `${supplier} ${lines}`.toLowerCase().includes(q)
    })
  }, [orders, search, statusFilter, supplierById, productById])

  async function handleSave(draft: PurchaseOrderDraft) {
    await upsertPurchaseOrder(editing ? editing.id : null, {
      supplier_id: draft.supplier_id,
      lines: draft.lines,
    })
    setShowForm(false)
    setEditing(null)
    await load()
  }

  async function handleMarkSent(order: PurchaseOrder) {
    setActionError(null)
    setBusy(true)
    try {
      await upsertPurchaseOrder(order.id, { status: "sent" })
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not send this purchase order.")
    } finally {
      setBusy(false)
    }
  }

  async function handleReceive() {
    if (!receiving) return
    setActionError(null)
    setReceiveError(null)
    setBusy(true)
    try {
      await receivePurchaseOrder(receiving.id)
      setReceiving(null)
      await load()
    } catch (err) {
      setReceiveError(
        err instanceof Error ? err.message : "Could not receive this purchase order."
      )
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(order: PurchaseOrder) {
    if (!confirm("Delete this purchase order?")) return
    setActionError(null)
    setBusy(true)
    try {
      await deletePurchaseOrder(order.id)
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not delete this purchase order.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchase Orders</h1>
          <p className="page-subtitle">{orders.length} purchase orders</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="btn-primary"
        >
          <Plus size={18} />
          New Purchase Order
        </button>
      </div>

      {actionError && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{actionError}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            placeholder="Search purchase orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <div className="flex rounded-lg border border-border p-0.5">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                statusFilter === filter.value
                  ? "bg-primary text-white"
                  : "text-muted hover:text-foreground"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Lines</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted">
                  Loading...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-danger">
                  {error}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted">
                  No purchase orders found
                </td>
              </tr>
            ) : (
              filtered.map((order) => {
                const supplier = order.supplier_id ? supplierById.get(order.supplier_id) : undefined
                const lineNames = order.lines
                  .map((line) => {
                    const product = productById.get(line.productId)
                    const name = product?.name ?? "Unknown product"
                    return line.packName ? `${name} (${line.packName})` : name
                  })
                  .join(", ")
                return (
                  <tr key={order.id} className="hover:bg-sidebar-hover transition-colors">
                    <td className="table-cell font-medium text-foreground">
                      {supplier?.name || "—"}
                    </td>
                    <td className="table-cell">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          STATUS_PILLS[order.status]
                        )}
                      >
                        {STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td className="table-cell">
                      <p className="text-text-secondary">
                        {order.lines.length} line{order.lines.length === 1 ? "" : "s"}
                      </p>
                      {lineNames && (
                        <p className="mt-0.5 max-w-xs truncate text-xs text-muted">{lineNames}</p>
                      )}
                    </td>
                    <td className="table-cell text-right font-semibold tabular-nums text-foreground">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="table-cell">
                      {formatDate(order.created_at)}
                      {order.received_at && (
                        <p className="mt-0.5 text-xs text-muted">
                          Received {formatDate(order.received_at)}
                        </p>
                      )}
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex justify-end gap-1">
                        {order.status === "draft" && (
                          <>
                            <button
                              onClick={() => { setEditing(order); setShowForm(true) }}
                              className="btn-ghost p-1.5"
                              title="Edit purchase order"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => void handleMarkSent(order)}
                              disabled={busy}
                              className="btn-ghost p-1.5"
                              title="Mark as sent"
                            >
                              <Send size={16} />
                            </button>
                          </>
                        )}
                        {order.status === "sent" && (
                          <button
                            onClick={() => { setReceiveError(null); setReceiving(order) }}
                            disabled={busy}
                            className="btn-ghost p-1.5"
                            title="Receive into stock"
                          >
                            <PackageCheck size={16} />
                          </button>
                        )}
                        {order.status !== "received" && (
                          <button
                            onClick={() => void handleDelete(order)}
                            disabled={busy}
                            className="btn-ghost p-1.5 text-danger hover:text-danger"
                            title="Delete purchase order"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <PurchaseOrderForm
          order={editing}
          products={products}
          suppliers={suppliers}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      {receiving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Receive purchase order</h2>
              <button onClick={() => setReceiving(null)} className="btn-ghost p-1">
                <Plus size={18} className="rotate-45" />
              </button>
            </div>

            <p className="mb-3 text-sm text-text-secondary">
              {receiving.supplier_id
                ? supplierById.get(receiving.supplier_id)?.name || "No supplier"
                : "No supplier"}
              {" · "}
              {receiving.lines.length} line{receiving.lines.length === 1 ? "" : "s"}
            </p>

            {receiveError && (
              <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {receiveError}
              </p>
            )}

            <div className="mb-3 max-h-56 overflow-y-auto rounded-lg border border-border">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="px-3 py-2 text-left">Product</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {receiving.lines.map((line, index) => {
                    const product = productById.get(line.productId)
                    return (
                      <tr key={`${line.productId}-${index}`}>
                        <td className="table-cell">
                          {product?.name ?? "Unknown product"}
                          {line.packName && (
                            <span className="ml-1 text-xs text-muted">{line.packName}</span>
                          )}
                        </td>
                        <td className="table-cell text-right">{line.qty}</td>
                        <td className="table-cell text-right">{formatCurrency(line.unitCost)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="mb-4 flex items-center justify-between rounded-lg bg-sidebar-hover px-4 py-3">
              <span className="text-sm font-medium text-text-secondary">Total</span>
              <span className="text-lg font-bold tabular-nums text-foreground">
                {formatCurrency(receiving.total)}
              </span>
            </div>

            <p className="mb-4 text-xs text-muted">
              Receiving adds the ordered quantities to stock and records them as a purchase.
            </p>

            <div className="flex justify-end gap-3">
              <button onClick={() => setReceiving(null)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={() => void handleReceive()} disabled={busy} className="btn-primary">
                {busy ? "Receiving..." : "Receive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
