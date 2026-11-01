"use client"

import { useState, useCallback } from "react"
import { Package, Plus, CheckCircle, AlertCircle, X, PackagePlus, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils"
import { BarcodeScanner } from "@/components/scanner/barcode-scanner"
import { useBarcodeScan } from "@/hooks/use-barcode-scan"
import type { Product, ScanSessionItem } from "@/lib/types"

export default function ReceiveStockPage() {
  const [sessionItems, setSessionItems] = useState<ScanSessionItem[]>([])
  const [foundProduct, setFoundProduct] = useState<Product | null>(null)
  const [notFoundBarcode, setNotFoundBarcode] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createSku, setCreateSku] = useState("")
  const [createPrice, setCreatePrice] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const { scanBarcode, incrementStock } = useBarcodeScan()
  const supabase = createClient()

  const handleScan = useCallback(async (barcode: string) => {
    setMessage(null)
    setNotFoundBarcode(null)
    setShowCreateForm(false)

    const { product } = await scanBarcode(barcode)

    if (product) {
      setFoundProduct(product)
      const item = await incrementStock(product.id, 1)
      if (item) {
        setSessionItems((prev) => [item, ...prev])
        setMessage({ type: "success", text: `+1 ${product.name}` })
      }
    } else {
      setNotFoundBarcode(barcode)
      setFoundProduct(null)
      setMessage({ type: "error", text: `Product not found for barcode: ${barcode}` })
    }
  }, [scanBarcode, incrementStock])

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!createName.trim() || !createSku.trim() || !createPrice) return

    const { data } = await supabase
      .from("products")
      .insert({
        name: createName.trim(),
        sku: createSku.trim(),
        barcode: notFoundBarcode,
        price: parseFloat(createPrice),
        stock: 0,
      })
      .select("*, category:categories(*)")
      .single()

    if (data) {
      setShowCreateForm(false)
      setCreateName("")
      setCreateSku("")
      setCreatePrice("")
      setNotFoundBarcode(null)

      const item = await incrementStock(data.id, 1)
      if (item) {
        setSessionItems((prev) => [item, ...prev])
      }
      setFoundProduct(data as unknown as Product)
      setMessage({ type: "success", text: `Created and added +1 ${data.name}` })
    }
  }

  const totalAdded = sessionItems.reduce((sum, item) => sum + item.quantity_added, 0)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/scan"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-sidebar-hover hover:text-foreground transition-all"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Receive Stock</h1>
          <p className="mt-1 text-sm text-muted">Scan products to add inventory</p>
        </div>
      </div>

      <BarcodeScanner onScan={handleScan} />

      {message && (
        <div
          className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-success-bg text-success"
              : "bg-danger-bg text-danger"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          <span className="flex-1">{message.text}</span>
          <button onClick={() => setMessage(null)} className="shrink-0 opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {notFoundBarcode && !showCreateForm && (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <AlertCircle size={32} className="mx-auto mb-3 text-warning" />
          <h3 className="font-medium text-foreground">Product Not Found</h3>
          <p className="mt-1 text-sm text-muted">
            No product with barcode: <code className="rounded bg-sidebar-hover px-2 py-0.5 text-xs">{notFoundBarcode}</code>
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary mt-4"
          >
            <PackagePlus size={16} />
            Create Product
          </button>
        </div>
      )}

      {showCreateForm && notFoundBarcode && (
        <form
          onSubmit={handleCreateProduct}
          className="rounded-xl border border-border bg-card p-6 space-y-4"
        >
          <h3 className="font-bold text-foreground">New Product</h3>
          <p className="text-xs text-muted">
            Barcode: <code className="rounded bg-sidebar-hover px-2 py-0.5">{notFoundBarcode}</code>
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Product Name</label>
              <input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label">SKU</label>
              <input
                value={createSku}
                onChange={(e) => setCreateSku(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label">Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={createPrice}
                onChange={(e) => setCreatePrice(e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create & Add Stock
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-bold text-foreground">Session Log</h2>
          <span className="text-sm text-muted">
            {sessionItems.length} items · +{totalAdded} stock
          </span>
        </div>

        {sessionItems.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <PackagePlus size={40} className="text-muted opacity-30" />
            <p className="text-sm font-medium text-muted">No scans yet</p>
            <p className="text-xs text-muted">Scan a product to start receiving stock</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sessionItems.map((item, i) => (
              <div key={`${item.product_id}-${i}`} className="flex items-center gap-3 px-6 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success-bg">
                  <Plus size={14} className="text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.product_name}
                  </p>
                  <p className="text-xs text-muted">
                    Stock: {item.previous_stock} → {item.new_stock}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted">
                  +{item.quantity_added}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
