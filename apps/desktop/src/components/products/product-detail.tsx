"use client"

import { useCallback, useEffect, useState } from "react"
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowUpDown,
  Edit,
  Layers,
  Package,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react"
import {
  createProductBatch,
  deleteProductBatch,
  fetchProductBatches,
  fetchStockMoves,
  adjustStock,
  updateProductBatch,
} from "@/lib/api/data"
import { useImageSrc } from "@/lib/api/image"
import { hasFeature } from "@/lib/features"
import { useBusinessType } from "@/lib/terms"
import { formatCurrency, formatDateTime, cn } from "@/lib/utils"
import type { Product, ProductBatch, StockMove, StockMoveReason } from "@/lib/types"

const MOVE_LABELS: Record<StockMoveReason, string> = {
  purchase: "Purchase",
  sale: "Sale",
  adjust: "Correction",
  damage: "Damaged",
  return: "Customer return",
  count: "Stock count",
  opening: "Opening stock",
}

const ADJUST_REASONS = [
  { value: "purchase", label: "Purchase" },
  { value: "return", label: "Customer return" },
  { value: "damage", label: "Damaged" },
  { value: "count", label: "Stock count" },
  { value: "adjust", label: "Correction" },
] as const

function ProductDetailImage({ image, name }: { image: string | null; name: string }) {
  const src = useImageSrc(image)
  return src ? (
    <img src={src} alt={name} className="h-full w-full object-cover" />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-sidebar-hover">
      <Package size={40} className="text-muted" />
    </div>
  )
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

interface ProductDetailProps {
  product: Product
  onClose: () => void
  onEdit: (product: Product) => void
  onDelete: (id: string) => void
  onBatchesChanged?: () => void
}

export function ProductDetail({ product, onClose, onEdit, onDelete, onBatchesChanged }: ProductDetailProps) {
  const [moves, setMoves] = useState<StockMove[] | null>(null)
  const [stock, setStock] = useState(product.stock)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustMode, setAdjustMode] = useState<"add" | "remove">("add")
  const [adjustQty, setAdjustQty] = useState("")
  const [adjustReason, setAdjustReason] = useState<StockMoveReason | null>(null)
  const [adjustNote, setAdjustNote] = useState("")
  const [savingAdjust, setSavingAdjust] = useState(false)

  const businessType = useBusinessType()
  const isPharmacy = hasFeature(businessType, "batches")
  const [batches, setBatches] = useState<ProductBatch[] | null>(null)
  const [batchFormOpen, setBatchFormOpen] = useState(false)
  const [editingBatch, setEditingBatch] = useState<ProductBatch | null>(null)
  const [batchNo, setBatchNo] = useState("")
  const [batchExpiry, setBatchExpiry] = useState("")
  const [batchQty, setBatchQty] = useState("")
  const [batchCost, setBatchCost] = useState("")
  const [batchError, setBatchError] = useState("")
  const [savingBatch, setSavingBatch] = useState(false)
  const [adjustingBatch, setAdjustingBatch] = useState<ProductBatch | null>(null)
  const [batchAdjustMode, setBatchAdjustMode] = useState<"add" | "remove">("add")
  const [batchAdjustQty, setBatchAdjustQty] = useState("")

  const loadMoves = useCallback(
    () =>
      fetchStockMoves(product.id).then((next) => {
        setMoves(next)
      }),
    [product.id],
  )

  const loadBatches = useCallback(
    () =>
      fetchProductBatches(product.id).then((next) => {
        setBatches(next)
      }),
    [product.id],
  )

  useEffect(() => {
    let alive = true
    fetchStockMoves(product.id)
      .then((next) => {
        if (alive) setMoves(next)
      })
      .catch(() => {
        if (alive) setMoves([])
      })
    return () => {
      alive = false
    }
  }, [product.id])

  useEffect(() => {
    if (!isPharmacy) return
    let alive = true
    fetchProductBatches(product.id)
      .then((next) => {
        if (alive) setBatches(next)
      })
      .catch(() => {
        if (alive) setBatches([])
      })
    return () => {
      alive = false
    }
  }, [product.id, isPharmacy])

  const adjustQtyN = Math.max(0, Math.floor(parseInt(adjustQty) || 0))
  const adjustDelta = adjustMode === "add" ? adjustQtyN : -adjustQtyN
  const newStock = Math.max(0, stock + adjustDelta)

  const batchAdjustQtyN = Math.max(0, Math.floor(parseInt(batchAdjustQty) || 0))
  const batchAdjustDelta = batchAdjustMode === "add" ? batchAdjustQtyN : -batchAdjustQtyN
  const newBatchQty = Math.max(0, (adjustingBatch?.qty ?? 0) + batchAdjustDelta)

  async function handleAdjust() {
    if (!adjustReason || adjustQtyN <= 0) return
    setSavingAdjust(true)
    try {
      await adjustStock(product.id, adjustDelta, adjustReason, adjustNote.trim() || undefined)
      setStock(newStock)
      setAdjustOpen(false)
      setAdjustQty("")
      setAdjustReason(null)
      setAdjustNote("")
      await loadMoves()
    } finally {
      setSavingAdjust(false)
    }
  }

  function openAddBatch() {
    setEditingBatch(null)
    setBatchNo("")
    setBatchExpiry("")
    setBatchQty("")
    setBatchCost(product.cost_price ? String(product.cost_price) : "")
    setBatchError("")
    setBatchFormOpen(true)
  }

  function openEditBatch(batch: ProductBatch) {
    setEditingBatch(batch)
    setBatchNo(batch.batch_no)
    setBatchExpiry(batch.expiry ?? "")
    setBatchQty(String(batch.qty))
    setBatchCost(batch.cost ? String(batch.cost) : "")
    setBatchError("")
    setBatchFormOpen(true)
  }

  async function handleSaveBatch() {
    const qty = parseFloat(batchQty)
    if (!batchNo.trim()) {
      setBatchError("Enter the batch number.")
      return
    }
    if (!Number.isFinite(qty) || qty < 0) {
      setBatchError("Enter a valid quantity, 0 or more.")
      return
    }
    const cost = parseFloat(batchCost)
    setBatchError("")
    setSavingBatch(true)
    try {
      const input = {
        batch_no: batchNo.trim(),
        expiry: batchExpiry || null,
        qty,
        cost: Number.isFinite(cost) && cost > 0 ? cost : 0,
      }
      if (editingBatch) {
        await updateProductBatch(editingBatch.id, input)
      } else {
        await createProductBatch(product.id, input)
      }
      setBatchFormOpen(false)
      await loadBatches()
      onBatchesChanged?.()
    } catch (e) {
      setBatchError(e instanceof Error ? e.message : "Could not save this batch.")
    } finally {
      setSavingBatch(false)
    }
  }

  async function handleDeleteBatch(batch: ProductBatch) {
    if (!confirm(`Delete batch ${batch.batch_no || ""}?`)) return
    setBatchError("")
    try {
      await deleteProductBatch(batch.id)
      await loadBatches()
      onBatchesChanged?.()
    } catch (e) {
      setBatchError(e instanceof Error ? e.message : "Could not delete this batch.")
    }
  }

  function openAdjustBatch(batch: ProductBatch) {
    setAdjustingBatch(batch)
    setBatchAdjustMode("add")
    setBatchAdjustQty("")
    setBatchError("")
  }

  async function handleAdjustBatch() {
    if (!adjustingBatch || batchAdjustQtyN <= 0) return
    setSavingBatch(true)
    try {
      await updateProductBatch(adjustingBatch.id, { qty: newBatchQty })
      setAdjustingBatch(null)
      setBatchAdjustQty("")
      await loadBatches()
      onBatchesChanged?.()
    } catch (e) {
      setBatchError(e instanceof Error ? e.message : "Could not adjust this batch.")
    } finally {
      setSavingBatch(false)
    }
  }

  const profit = product.price - (product.cost_price ?? 0)
  const marginPct = product.price > 0 ? (profit / product.price) * 100 : 0
  // a batched product takes its stock from its batches — the raw count would
  // drift away from them
  const batchTotal = batches?.reduce((sum, b) => sum + b.qty, 0) ?? 0
  const onHand = isPharmacy ? batchTotal : stock
  const isLow = onHand > 0 && onHand <= product.low_stock_at
  const isOut = onHand <= 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
        {/* Media */}
        <div className="relative aspect-[3/1] w-full overflow-hidden rounded-t-xl">
          <ProductDetailImage image={product.image} name={product.name} />
          <button onClick={onClose} className="btn-ghost absolute right-3 top-3 rounded-full bg-black/30 p-1 text-white hover:bg-black/50">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Identity */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-foreground">{product.name}</h2>
                <p className="mt-0.5 text-sm text-muted">
                  {product.category?.name || "Uncategorized"} · {product.unit}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => onEdit(product)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-sidebar-hover hover:text-foreground"
                  title="Edit product"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => onDelete(product.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-danger-bg hover:text-danger"
                  title="Delete product"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Attributes, matching the mobile app */}
          <div className="grid grid-cols-2 gap-x-6 rounded-xl bg-sidebar-hover/50 px-4 py-2">
            <DataRow label="SKU" value={product.sku || "—"} />
            <DataRow label="Barcode" value={product.barcode || "—"} />
            <DataRow label="Category" value={product.category?.name || "—"} />
            <DataRow label="Unit" value={product.unit} />
            <DataRow label="Created" value={formatDateShort(product.created_at)} />
            <DataRow label="Updated" value={formatDateTime(product.updated_at ?? product.created_at)} />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-3 gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted">Cost</p>
              <p className="mt-0.5 truncate text-base font-semibold text-text-secondary">
                {formatCurrency(product.cost_price ?? 0)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted">Selling</p>
              <p className="mt-0.5 truncate text-base font-bold text-foreground">{formatCurrency(product.price)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted">Margin</p>
              <p
                className={cn(
                  "mt-0.5 truncate text-base font-bold",
                  profit > 0 ? "text-success" : profit < 0 ? "text-danger" : "text-muted",
                )}
              >
                {formatCurrency(profit)}
              </p>
              <p
                className={cn(
                  "text-xs font-semibold",
                  profit > 0 ? "text-success" : profit < 0 ? "text-danger" : "text-muted",
                )}
              >
                {marginPct > 0 ? "+" : ""}
                {marginPct.toFixed(0)}%
              </p>
            </div>
          </div>

          {/* On hand */}
          <div className="rounded-xl border border-border bg-sidebar-hover/30 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted">On hand</p>
                <p className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">
                  {onHand}
                  <span className="ml-1.5 text-sm font-semibold text-muted">{product.unit}</span>
                </p>
                <p className="mt-1 text-xs text-muted">
                  {isPharmacy
                    ? `${batches?.length ?? 0} batch${(batches?.length ?? 0) === 1 ? "" : "es"} · Alert at ${product.low_stock_at} ${product.unit}`
                    : `Alert at ${product.low_stock_at} ${product.unit}`}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {product.active ? (
                  <span className="badge-success">Active</span>
                ) : (
                  <span className="badge-danger">Inactive</span>
                )}
                {(isLow || isOut) && (
                  <span className={cn("flex items-center gap-1 text-xs font-medium", isOut ? "text-danger" : "text-warning")}>
                    <TriangleAlert size={13} />
                    {isOut ? "Out of stock" : "Running low"}
                  </span>
                )}
              </div>
            </div>
            {!isPharmacy && (
              <button onClick={() => { setAdjustMode("add"); setAdjustQty(""); setAdjustReason(null); setAdjustNote(""); setAdjustOpen(true) }} className="btn-primary mt-3 w-full">
                <ArrowUpDown size={16} />
                Adjust stock
              </button>
            )}
          </div>

          {/* Batches */}
          {isPharmacy && (
            <div className="rounded-xl border border-border">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Layers size={15} />
                    Batches
                  </h3>
                  <p className="mt-0.5 text-xs text-muted">
                    {batches
                      ? `${batches.length} batch${batches.length === 1 ? "" : "es"}`
                      : "Loading..."}
                  </p>
                </div>
                <button onClick={openAddBatch} className="btn-secondary text-xs">
                  <Plus size={13} />
                  Add batch
                </button>
              </div>
              {batchError && (
                <p className="mx-4 mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{batchError}</p>
              )}
              {batches === null ? (
                <p className="px-4 py-8 text-center text-sm text-muted">Loading...</p>
              ) : batches.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted">No batches yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="table-header">
                        <th className="px-4 py-3 text-left">Batch</th>
                        <th className="px-4 py-3 text-left">Expiry</th>
                        <th className="px-4 py-3 text-right">Qty</th>
                        <th className="px-4 py-3 text-right">Cost</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map((batch) => {
                        const days = batch.expiry ? daysToExpiry(batch.expiry) : null
                        const risky = days !== null && days <= 90
                        return (
                          <tr key={batch.id} className="hover:bg-sidebar-hover">
                            <td className="table-cell font-medium text-foreground">
                              {batch.batch_no || "—"}
                            </td>
                            <td className={cn("table-cell", risky && "text-danger")}>
                              {batch.expiry ? expiryLabel(batch.expiry, days) : "—"}
                            </td>
                            <td className="table-cell text-right">{batch.qty}</td>
                            <td className="table-cell text-right">{formatCurrency(batch.cost)}</td>
                            <td className="table-cell">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openAdjustBatch(batch)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-sidebar-hover hover:text-foreground"
                                  title="Adjust batch"
                                >
                                  <ArrowUpDown size={16} />
                                </button>
                                <button
                                  onClick={() => openEditBatch(batch)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-sidebar-hover hover:text-foreground"
                                  title="Edit batch"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  onClick={() => void handleDeleteBatch(batch)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-danger-bg hover:text-danger"
                                  title="Delete batch"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Stock moves */}
          <div className="rounded-xl border border-border">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">Stock moves</h3>
              <p className="mt-0.5 text-xs text-muted">
                {moves ? `${moves.length} record${moves.length === 1 ? "" : "s"}` : "Loading..."}
              </p>
            </div>
            <div className="max-h-64 divide-y divide-border overflow-y-auto">
              {moves?.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-muted">No stock movement yet</p>
              )}
              {moves?.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                      m.qty > 0 ? "bg-success-bg text-success" : m.qty < 0 ? "bg-danger-bg text-danger" : "bg-sidebar-hover text-muted",
                    )}
                  >
                    {m.qty > 0 ? <ArrowUpFromLine size={16} /> : <ArrowDownToLine size={16} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{MOVE_LABELS[m.reason] ?? m.reason}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">{m.ref || "—"}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={cn("text-sm font-bold tabular-nums", m.qty > 0 ? "text-success" : m.qty < 0 ? "text-danger" : "text-muted")}>
                      {m.qty > 0 ? "+" : ""}
                      {m.qty}
                    </p>
                    <p className="text-xs text-muted">{formatDateShort(m.occurred_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Adjust stock sheet */}
      {adjustOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Adjust stock</h3>
              <button onClick={() => setAdjustOpen(false)} className="btn-ghost p-1">
                <X size={18} />
              </button>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => setAdjustMode("add")}
                className={cn(
                  "btn-secondary",
                  adjustMode === "add" && "border-primary bg-primary-light text-primary"
                )}
              >
                <ArrowUpFromLine size={16} />
                Add stock
              </button>
              <button
                onClick={() => setAdjustMode("remove")}
                className={cn(
                  "btn-secondary",
                  adjustMode === "remove" && "border-primary bg-primary-light text-primary"
                )}
              >
                <ArrowDownToLine size={16} />
                Remove stock
              </button>
            </div>

            <div className="mb-3 rounded-lg bg-sidebar-hover px-4 py-3 text-center">
              <p className="text-2xl font-extrabold tabular-nums text-foreground">
                {adjustQty || "0"}
                <span className="ml-1.5 text-xs font-semibold text-muted">{product.unit}</span>
              </p>
              {adjustQtyN > 0 && (
                <p className="mt-0.5 text-xs font-semibold text-success">→ {newStock} in stock</p>
              )}
            </div>

            <input
              type="number"
              min="1"
              placeholder="Quantity"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              className="input-field mb-3"
            />

            <div className="mb-3 flex flex-wrap gap-1.5">
              {ADJUST_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setAdjustReason(r.value)}
                  className={cn(
                    "rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-all",
                    adjustReason === r.value
                      ? "border-primary bg-primary text-white"
                      : "bg-card text-text-secondary hover:border-primary/40"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <input
              placeholder="Note (optional) — e.g. damaged by water"
              value={adjustNote}
              onChange={(e) => setAdjustNote(e.target.value)}
              className="input-field mb-4"
            />

            <div className="flex justify-end gap-3">
              <button onClick={() => setAdjustOpen(false)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleAdjust}
                disabled={!adjustReason || adjustQtyN <= 0 || savingAdjust}
                className="btn-primary"
              >
                {savingAdjust ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / edit batch sheet */}
      {batchFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">
                {editingBatch ? "Edit batch" : "Add batch"}
              </h3>
              <button onClick={() => setBatchFormOpen(false)} className="btn-ghost p-1">
                <X size={18} />
              </button>
            </div>

            {batchError && (
              <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{batchError}</p>
            )}

            <div className="mb-3">
              <label className="label">Batch number</label>
              <input
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
                placeholder="e.g. B-2411"
                className="input-field"
              />
            </div>

            <div className="mb-3">
              <label className="label">Expiry date</label>
              <input
                type="date"
                value={batchExpiry}
                onChange={(e) => setBatchExpiry(e.target.value)}
                className="input-field"
              />
              <p className="mt-1 text-[11px] text-muted">Leave empty if this product does not expire.</p>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label className="label">Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={batchQty}
                  onChange={(e) => setBatchQty(e.target.value)}
                  placeholder="0"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Cost (GH₵)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={batchCost}
                  onChange={(e) => setBatchCost(e.target.value)}
                  placeholder="0.00"
                  className="input-field"
                />
              </div>
            </div>

            <p className="mb-4 text-[11px] text-muted">
              Stock on hand is the sum of every batch of this product.
            </p>

            <div className="flex justify-end gap-3">
              <button onClick={() => setBatchFormOpen(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleSaveBatch} disabled={savingBatch} className="btn-primary">
                {savingBatch ? "Saving..." : editingBatch ? "Save changes" : "Add batch"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust batch sheet */}
      {adjustingBatch && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Adjust batch</h3>
              <button onClick={() => setAdjustingBatch(null)} className="btn-ghost p-1">
                <X size={18} />
              </button>
            </div>

            <p className="mb-3 text-sm text-muted">
              Batch {adjustingBatch.batch_no || "—"} · {adjustingBatch.qty} {product.unit} on hand
            </p>

            {batchError && (
              <p className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{batchError}</p>
            )}

            <div className="mb-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => setBatchAdjustMode("add")}
                className={cn(
                  "btn-secondary",
                  batchAdjustMode === "add" && "border-primary bg-primary-light text-primary"
                )}
              >
                <ArrowUpFromLine size={16} />
                Add
              </button>
              <button
                onClick={() => setBatchAdjustMode("remove")}
                className={cn(
                  "btn-secondary",
                  batchAdjustMode === "remove" && "border-primary bg-primary-light text-primary"
                )}
              >
                <ArrowDownToLine size={16} />
                Remove
              </button>
            </div>

            <div className="mb-3 rounded-lg bg-sidebar-hover px-4 py-3 text-center">
              <p className="text-2xl font-extrabold tabular-nums text-foreground">
                {batchAdjustQty || "0"}
                <span className="ml-1.5 text-xs font-semibold text-muted">{product.unit}</span>
              </p>
              {batchAdjustQtyN > 0 && (
                <p className="mt-0.5 text-xs font-semibold text-success">→ {newBatchQty} in this batch</p>
              )}
            </div>

            <input
              type="number"
              min="1"
              placeholder="Quantity"
              value={batchAdjustQty}
              onChange={(e) => setBatchAdjustQty(e.target.value)}
              className="input-field mb-4"
            />

            <div className="flex justify-end gap-3">
              <button onClick={() => setAdjustingBatch(null)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleAdjustBatch}
                disabled={batchAdjustQtyN <= 0 || savingBatch}
                className="btn-primary"
              >
                {savingBatch ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatDateShort(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

/** Days from today until an expiry date; negative when already expired. */
function daysToExpiry(expiry: string): number | null {
  const time = Date.parse(`${expiry}T00:00:00Z`)
  if (!Number.isFinite(time)) return null
  const now = new Date()
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.round((time - today) / 86400000)
}

function expiryLabel(expiry: string, days: number | null): string {
  const date = expiryDate(expiry)
  if (days === null) return date
  if (days < 0) return `Expired ${date}`
  if (days <= 90) return `${date} · ${days}d`
  return date
}

/** "2027-03-12" → "12 Mar 2027" (parsed as UTC so the day never shifts) */
function expiryDate(expiry: string): string {
  const d = new Date(`${expiry}T00:00:00Z`)
  if (isNaN(d.getTime())) return expiry
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
}
