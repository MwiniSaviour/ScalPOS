"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import type { Product, PurchaseOrder, PurchaseOrderLine, Supplier } from "@/lib/types"

interface LineDraft {
  key: string
  productId: string
  packName: string
  qty: string
  unitCost: string
}

export interface PurchaseOrderDraft {
  supplier_id: string | null
  lines: PurchaseOrderLine[]
}

interface PurchaseOrderFormProps {
  order?: PurchaseOrder | null
  products: Product[]
  suppliers: Supplier[]
  onSave: (draft: PurchaseOrderDraft) => Promise<void>
  onClose: () => void
}

let lineCounter = 0

function newLine(): LineDraft {
  lineCounter += 1
  return { key: `line-${lineCounter}`, productId: "", packName: "", qty: "1", unitCost: "" }
}

function toDraft(order: PurchaseOrder | null | undefined): LineDraft[] {
  if (!order || order.lines.length === 0) return [newLine()]
  return order.lines.map((line) => {
    lineCounter += 1
    return {
      key: `line-${lineCounter}`,
      productId: line.productId,
      packName: line.packName ?? "",
      qty: String(line.qty),
      unitCost: String(line.unitCost),
    }
  })
}

export function PurchaseOrderForm({
  order,
  products,
  suppliers,
  onSave,
  onClose,
}: PurchaseOrderFormProps) {
  const [supplierId, setSupplierId] = useState(order?.supplier_id ?? "")
  const [lines, setLines] = useState<LineDraft[]>(toDraft(order))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  }

  function pickProduct(key: string, productId: string) {
    const product = products.find((p) => p.id === productId)
    updateLine(key, {
      productId,
      unitCost: product && product.cost_price ? String(product.cost_price) : "",
    })
  }

  function addLine() {
    setLines((prev) => [...prev, newLine()])
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((line) => line.key !== key)))
  }

  const parsed = lines.map((line) => {
    const qty = Math.max(0, Math.round(Number(line.qty) || 0))
    const unitCost = Math.max(0, Number(line.unitCost) || 0)
    return { ...line, qty, unitCost }
  })
  const total = parsed.reduce((sum, line) => sum + line.qty * line.unitCost, 0)
  const usable = parsed.filter((line) => line.productId && line.qty > 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (usable.length === 0) {
      setError("Add at least one line with a product and a quantity.")
      return
    }
    setError("")
    setSaving(true)
    try {
      await onSave({
        supplier_id: supplierId || null,
        lines: usable.map((line) => ({
          productId: line.productId,
          packName: line.packName.trim() || null,
          qty: line.qty,
          unitCost: line.unitCost,
        })),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this purchase order.")
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">
            {order ? "Edit Purchase Order" : "New Purchase Order"}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1">
            <X size={18} />
          </button>
        </div>

        {error && (
          <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Supplier</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="input-field"
            >
              <option value="">No supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="label mb-0">Lines</label>
              <button type="button" onClick={addLine} className="btn-secondary text-xs">
                <Plus size={13} />
                Add line
              </button>
            </div>

            <div className="space-y-2">
              {lines.map((line) => {
                const product = products.find((p) => p.id === line.productId)
                const packs = product?.packs ?? []
                return (
                  <div
                    key={line.key}
                    className="grid grid-cols-12 items-end gap-2 rounded-lg border border-border p-3"
                  >
                    <div className="col-span-12 sm:col-span-4">
                      <label className="label text-xs">Product</label>
                      <select
                        value={line.productId}
                        onChange={(e) => pickProduct(line.key, e.target.value)}
                        className="input-field"
                      >
                        <option value="">Choose a product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                            {p.sku ? ` · ${p.sku}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-6 sm:col-span-3">
                      <label className="label text-xs">Pack</label>
                      <input
                        value={line.packName}
                        onChange={(e) => updateLine(line.key, { packName: e.target.value })}
                        placeholder="Optional"
                        list={packs.length > 0 ? `packs-${line.key}` : undefined}
                        className="input-field"
                      />
                      {packs.length > 0 && (
                        <datalist id={`packs-${line.key}`}>
                          {packs.map((pack) => (
                            <option key={pack.name} value={pack.name} />
                          ))}
                        </datalist>
                      )}
                      {packs.length > 0 && (
                        <p className="mt-1 text-[11px] text-muted">
                          Packs: {packs.map((pack) => pack.name).join(", ")}
                        </p>
                      )}
                    </div>

                    <div className="col-span-6 sm:col-span-2">
                      <label className="label text-xs">Qty</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={line.qty}
                        onChange={(e) => updateLine(line.key, { qty: e.target.value })}
                        className="input-field"
                      />
                    </div>

                    <div className="col-span-6 sm:col-span-2">
                      <label className="label text-xs">Unit cost</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitCost}
                        onChange={(e) => updateLine(line.key, { unitCost: e.target.value })}
                        placeholder="0.00"
                        className="input-field"
                      />
                    </div>

                    <div className="col-span-12 flex justify-end sm:col-span-1">
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        className="btn-ghost p-1.5 text-danger hover:text-danger"
                        title="Remove line"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="mt-2 text-[11px] text-muted">
              Quantities are in base units — a pack name is only a label on the line.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-sidebar-hover px-4 py-3">
            <span className="text-sm font-medium text-text-secondary">Total</span>
            <span className="text-lg font-bold tabular-nums text-foreground">
              {formatCurrency(total)}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving..." : order ? "Update" : "Create draft"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
