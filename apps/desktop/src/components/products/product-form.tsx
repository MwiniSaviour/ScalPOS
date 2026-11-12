"use client"

import { useRef, useState } from "react"
import { ImagePlus, Link2, Pill, Plus, Trash2, X } from "lucide-react"
import { useCategories } from "@/hooks/use-products"
import { useImageSrc, uploadProductImage } from "@/lib/api/image"
import { hasFeature } from "@/lib/features"
import { useBusinessType } from "@/lib/terms"
import { cn } from "@/lib/utils"
import type { Product } from "@/lib/types"

interface ProductFormProps {
  product?: Product | null
  orgId?: string
  onSave: (product: Partial<Product>) => Promise<void>
  onClose: () => void
}

type FieldErrors = Partial<Record<"name" | "price" | "cost" | "stock" | "lowStock" | "barcode", string>>

/** A pack row while it is being edited — the factor stays a string until save. */
type PackDraft = { name: string; factor: string }

export function ProductForm({ product, orgId, onSave, onClose }: ProductFormProps) {
  const [name, setName] = useState(product?.name || "")
  const [sku, setSku] = useState(product?.sku || "")
  const [barcode, setBarcode] = useState(product?.barcode || "")
  const [price, setPrice] = useState(product?.price?.toString() || "")
  const [costPrice, setCostPrice] = useState(product?.cost_price?.toString() || "")
  const [stock, setStock] = useState(product?.stock?.toString() || "0")
  const [lowStockAt, setLowStockAt] = useState(product?.low_stock_at?.toString() || "5")
  const [categoryId, setCategoryId] = useState(product?.category_id || "")
  const [description, setDescription] = useState(product?.description || "")
  const [image, setImage] = useState(product?.image || "")
  const [prescriptionOnly, setPrescriptionOnly] = useState(product?.prescription_only ?? false)
  const [controlled, setControlled] = useState(product?.controlled ?? false)
  const [packs, setPacks] = useState<PackDraft[]>(
    (product?.packs ?? []).map((p) => ({ name: p.name, factor: String(p.factor) })),
  )
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkValue, setLinkValue] = useState(
    product?.image && !product.image.startsWith("sb-product-images:") ? product.image : "",
  )
  const [uploading, setUploading] = useState(false)
  const [formError, setFormError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)
  const { categories } = useCategories()
  const businessType = useBusinessType()
  const isPharmacy = hasFeature(businessType, "batches")
  const preview = useImageSrc(image)
  const nameRef = useRef<HTMLInputElement>(null)
  const priceRef = useRef<HTMLInputElement>(null)
  const costRef = useRef<HTMLInputElement>(null)
  const stockRef = useRef<HTMLInputElement>(null)
  const lowStockRef = useRef<HTMLInputElement>(null)
  const barcodeRef = useRef<HTMLInputElement>(null)

  function clearField(key: keyof FieldErrors) {
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
  }

  async function handlePhoto(file: File) {
    if (!orgId) {
      setFormError("Cannot upload images yet — try again after syncing.")
      return
    }
    setFormError("")
    setUploading(true)
    try {
      setImage(await uploadProductImage(file, orgId))
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Image upload failed")
    } finally {
      setUploading(false)
    }
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {}
    if (!name.trim()) errors.name = "Enter the product name."
    if (!price.trim()) {
      errors.price = "Enter a selling price."
    } else if (!Number.isFinite(parseFloat(price)) || parseFloat(price) < 0) {
      errors.price = "Enter a valid amount, e.g. 12.50."
    }
    if (costPrice.trim() && (!Number.isFinite(parseFloat(costPrice)) || parseFloat(costPrice) < 0)) {
      errors.cost = "Enter a valid amount, or leave this blank."
    }
    if (!product) {
      if (stock.trim() && (!Number.isInteger(Number(stock)) || Number(stock) < 0)) {
        errors.stock = "Stock must be a whole number, 0 or more."
      }
    }
    if (lowStockAt.trim() && (!Number.isInteger(Number(lowStockAt)) || Number(lowStockAt) < 0)) {
      errors.lowStock = "Low-stock alert must be a whole number, 0 or more."
    }
    return errors
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")
    const errors = validate()
    setFieldErrors(errors)
    const first = (Object.keys(errors) as (keyof FieldErrors)[]).find((k) => errors[k])
    if (first) {
      const target = {
        name: nameRef,
        price: priceRef,
        cost: costRef,
        stock: stockRef,
        lowStock: lowStockRef,
        barcode: barcodeRef,
      }[first]
      target.current?.focus()
      return
    }
    setSaving(true)
    try {
      const packList = packs
        .map((p) => ({ name: p.name.trim(), factor: Math.round(parseFloat(p.factor) || 0) }))
        .filter((p) => p.name !== "" && p.factor > 0)
      await onSave({
        name: name.trim(),
        sku,
        barcode: barcode.trim() || null,
        price: parseFloat(price),
        cost_price: costPrice.trim() ? parseFloat(costPrice) : null,
        stock: product ? undefined : parseInt(stock) || 0,
        low_stock_at: lowStockAt.trim() ? parseInt(lowStockAt) : 0,
        category_id: categoryId || null,
        description: description || null,
        image: linkValue.trim() || image || null,
        ...(isPharmacy
          ? {
              prescription_only: prescriptionOnly,
              controlled,
              packs: packList.length > 0 ? packList : null,
            }
          : {}),
      })
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save this product.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">
            {product ? "Edit product" : "New product"}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-sidebar-hover/40 p-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sidebar-hover">
              {preview ? (
                <img src={preview} alt="Product" className="h-full w-full object-cover" />
              ) : (
                <ImagePlus size={20} className="text-muted" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">Product photo</p>
              <p className="mt-0.5 text-[11px] text-muted">
                Uploads sync to the cloud, so it appears on the mobile app too.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <label className={cn("btn-secondary text-xs", uploading && "pointer-events-none opacity-60")}>
                  {uploading ? "Uploading…" : "Choose photo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      e.target.value = ""
                      if (f) void handlePhoto(f)
                    }}
                  />
                </label>
                {(image || linkValue.trim()) && (
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() => {
                      setImage("")
                      setLinkValue("")
                    }}
                  >
                    <Trash2 size={13} />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLinkOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground"
          >
            <Link2 size={13} />
            {linkOpen ? "Hide image link" : "Use an image link instead"}
          </button>
          {linkOpen && (
            <div>
              <label className="label">Image link</label>
              <input
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                placeholder="https://…"
                className="input-field"
              />
              <p className="mt-1 text-[11px] text-muted">
                Optional — an uploaded photo is usually easier.
              </p>
            </div>
          )}

          {formError && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{formError}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Name</label>
              <input
                ref={nameRef}
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  clearField("name")
                }}
                placeholder="e.g. Bruno rice 5kg"
                aria-invalid={Boolean(fieldErrors.name)}
                className={cn("input-field", fieldErrors.name && "border-danger")}
              />
              {fieldErrors.name && <p className="mt-1 text-[11px] text-danger">{fieldErrors.name}</p>}
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
            <div>
              <label className="label">Barcode</label>
              <input
                ref={barcodeRef}
                value={barcode}
                onChange={(e) => {
                  setBarcode(e.target.value)
                  clearField("barcode")
                }}
                placeholder="GD1234567"
                aria-invalid={Boolean(fieldErrors.barcode)}
                className={cn("input-field", fieldErrors.barcode && "border-danger")}
              />
              {fieldErrors.barcode && <p className="mt-1 text-[11px] text-danger">{fieldErrors.barcode}</p>}
            </div>
            <div>
              <label className="label">Cost price (GH₵)</label>
              <input
                ref={costRef}
                type="number"
                step="0.01"
                min="0"
                value={costPrice}
                onChange={(e) => {
                  setCostPrice(e.target.value)
                  clearField("cost")
                }}
                placeholder="0.00"
                aria-invalid={Boolean(fieldErrors.cost)}
                className={cn("input-field", fieldErrors.cost && "border-danger")}
              />
              {fieldErrors.cost && <p className="mt-1 text-[11px] text-danger">{fieldErrors.cost}</p>}
            </div>
            <div>
              <label className="label">Selling price (GH₵)</label>
              <input
                ref={priceRef}
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value)
                  clearField("price")
                }}
                placeholder="0.00"
                aria-invalid={Boolean(fieldErrors.price)}
                className={cn("input-field", fieldErrors.price && "border-danger")}
              />
              {fieldErrors.price && <p className="mt-1 text-[11px] text-danger">{fieldErrors.price}</p>}
            </div>
            {!product && (
              <div>
                <label className="label">Stock</label>
                <input
                  ref={stockRef}
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => {
                    setStock(e.target.value)
                    clearField("stock")
                  }}
                  placeholder="0"
                  aria-invalid={Boolean(fieldErrors.stock)}
                  className={cn("input-field", fieldErrors.stock && "border-danger")}
                />
                {fieldErrors.stock && <p className="mt-1 text-[11px] text-danger">{fieldErrors.stock}</p>}
              </div>
            )}
            <div>
              <label className="label">Low-stock alert</label>
              <input
                ref={lowStockRef}
                type="number"
                min="0"
                value={lowStockAt}
                onChange={(e) => {
                  setLowStockAt(e.target.value)
                  clearField("lowStock")
                }}
                placeholder="5"
                aria-invalid={Boolean(fieldErrors.lowStock)}
                className={cn("input-field", fieldErrors.lowStock && "border-danger")}
              />
              {fieldErrors.lowStock && <p className="mt-1 text-[11px] text-danger">{fieldErrors.lowStock}</p>}
              {!fieldErrors.lowStock && (
                <p className="mt-1 text-[11px] text-muted">Warn when stock drops to this level.</p>
              )}
            </div>
            <div>
              <label className="label">SKU (optional)</label>
              <input
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. RICE-5KG"
                className="input-field"
              />
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

          {isPharmacy && (
            <div className="space-y-4 rounded-xl border border-border bg-sidebar-hover/40 p-4">
              <div className="flex items-center gap-2">
                <Pill size={16} className="text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Pharmacy</h3>
              </div>

              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={prescriptionOnly}
                  onChange={(e) => setPrescriptionOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                Prescription only
              </label>
              <p className="-mt-2 pl-6 text-[11px] text-muted">
                Checkout asks for the prescription reference.
              </p>

              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={controlled}
                  onChange={(e) => setControlled(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                Controlled drug
              </label>
              <p className="-mt-2 pl-6 text-[11px] text-muted">
                Sold under a controlled-medicine record.
              </p>

              <div>
                <label className="label">Packs</label>
                <p className="mb-2 text-[11px] text-muted">
                  Sell this item in packs. The base unit is {product?.unit ?? "pcs"} — a
                  pack&rsquo;s factor says how many of them it holds.
                </p>
                {packs.map((pack, index) => (
                  <div key={index} className="mb-2 flex items-center gap-2">
                    <input
                      value={pack.name}
                      onChange={(e) =>
                        setPacks((rows) =>
                          rows.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)),
                        )
                      }
                      placeholder="Box of 10"
                      className="input-field flex-1"
                    />
                    <input
                      type="number"
                      min="1"
                      value={pack.factor}
                      onChange={(e) =>
                        setPacks((rows) =>
                          rows.map((row, i) => (i === index ? { ...row, factor: e.target.value } : row)),
                        )
                      }
                      placeholder="10"
                      className="input-field w-24"
                    />
                    <button
                      type="button"
                      onClick={() => setPacks((rows) => rows.filter((_, i) => i !== index))}
                      className="btn-ghost p-1"
                      title="Remove pack"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setPacks((rows) => [...rows, { name: "", factor: "" }])}
                  className="btn-secondary text-xs"
                >
                  <Plus size={13} />
                  Add pack
                </button>
                <p className="mt-2 text-[11px] text-muted">
                  Once a product has batches, its stock is the sum of their quantities.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving || uploading} className="btn-primary">
              {saving ? "Saving…" : product ? "Save changes" : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
