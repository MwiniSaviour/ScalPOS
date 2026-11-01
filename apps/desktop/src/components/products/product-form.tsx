"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useCategories } from "@/hooks/use-products"
import type { Product, Category } from "@/lib/types"

interface ProductFormProps {
  product?: Product | null
  onSave: (product: Partial<Product>) => Promise<void>
  onClose: () => void
}

export function ProductForm({ product, onSave, onClose }: ProductFormProps) {
  const [name, setName] = useState(product?.name || "")
  const [sku, setSku] = useState(product?.sku || "")
  const [barcode, setBarcode] = useState(product?.barcode || "")
  const [price, setPrice] = useState(product?.price?.toString() || "")
  const [costPrice, setCostPrice] = useState(product?.cost_price?.toString() || "")
  const [stock, setStock] = useState(product?.stock?.toString() || "0")
  const [categoryId, setCategoryId] = useState(product?.category_id || "")
  const [description, setDescription] = useState(product?.description || "")
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("categories").select("*").order("name")
      if (data) setCategories(data)
    }
    load()
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      name,
      sku,
      barcode: barcode || null,
      price: parseFloat(price),
      cost_price: costPrice ? parseFloat(costPrice) : null,
      stock: parseInt(stock) || 0,
      category_id: categoryId || null,
      description: description || null,
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">
            {product ? "Edit Product" : "New Product"}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Product Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label">SKU</label>
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label">Barcode</label>
              <input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label">Cost Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Stock</label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="input-field"
              >
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field min-h-[80px] resize-none"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving..." : product ? "Update Product" : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
