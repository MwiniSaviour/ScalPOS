"use client"

import { useCallback, useEffect, useState } from "react"
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowUpDown,
  Edit,
  Package,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react"
import { fetchStockMoves, adjustStock } from "@/lib/api/data"
import { useImageSrc } from "@/lib/api/image"
import { formatCurrency, formatDateTime, cn } from "@/lib/utils"
import type { Product, StockMove, StockMoveReason } from "@/lib/types"

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
}

export function ProductDetail({ product, onClose, onEdit, onDelete }: ProductDetailProps) {
  const [moves, setMoves] = useState<StockMove[] | null>(null)
  const [stock, setStock] = useState(product.stock)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustMode, setAdjustMode] = useState<"add" | "remove">("add")
  const [adjustQty, setAdjustQty] = useState("")
  const [adjustReason, setAdjustReason] = useState<StockMoveReason | null>(null)
  const [adjustNote, setAdjustNote] = useState("")
  const [savingAdjust, setSavingAdjust] = useState(false)

  const loadMoves = useCallback(
    () =>
      fetchStockMoves(product.id).then((next) => {
        setMoves(next)
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

  const adjustQtyN = Math.max(0, Math.floor(parseInt(adjustQty) || 0))
  const adjustDelta = adjustMode === "add" ? adjustQtyN : -adjustQtyN
  const newStock = Math.max(0, stock + adjustDelta)

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

  const profit = product.price - (product.cost_price ?? 0)
  const marginPct = product.price > 0 ? (profit / product.price) * 100 : 0
  const isLow = stock > 0 && stock <= product.low_stock_at
  const isOut = stock <= 0

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
                  {stock}
                  <span className="ml-1.5 text-sm font-semibold text-muted">{product.unit}</span>
                </p>
                <p className="mt-1 text-xs text-muted">
                  Alert at {product.low_stock_at} {product.unit}
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
            <button onClick={() => { setAdjustMode("add"); setAdjustQty(""); setAdjustReason(null); setAdjustNote(""); setAdjustOpen(true) }} className="btn-primary mt-3 w-full">
              <ArrowUpDown size={16} />
              Adjust stock
            </button>
          </div>

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
    </div>
  )
}

function formatDateShort(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}
