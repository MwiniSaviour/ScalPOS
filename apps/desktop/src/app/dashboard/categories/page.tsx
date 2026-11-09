"use client"

import { useRealtime } from "@/lib/api/realtime"

import { useState, useEffect, useCallback } from "react"
import { Plus, Download, Eye, Edit2, Trash2, Package, X } from "lucide-react"
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchProducts,
  updateProduct,
  type CategoryInput,
} from "@/lib/api/data"
import type { Category, Product } from "@/lib/types"

const CATEGORY_COLORS: { hex: string; name: string }[] = [
  { hex: "#34d399", name: "Green" },
  { hex: "#4c8dff", name: "Blue" },
  { hex: "#a78bfa", name: "Violet" },
  { hex: "#f5a524", name: "Amber" },
  { hex: "#f4586e", name: "Rose" },
  { hex: "#f6c453", name: "Gold" },
  { hex: "#14b8a6", name: "Teal" },
  { hex: "#06b6d4", name: "Cyan" },
  { hex: "#6366f1", name: "Indigo" },
  { hex: "#f97316", name: "Orange" },
  { hex: "#ec4899", name: "Pink" },
  { hex: "#84cc16", name: "Lime" },
  { hex: "#0ea5e9", name: "Sky" },
  { hex: "#c026d3", name: "Fuchsia" },
  { hex: "#ef4444", name: "Red" },
  { hex: "#eab308", name: "Yellow" },
]

function CategoryViewModal({
  category,
  products,
  onClose,
  onChanged,
}: {
  category: Category
  products: Product[]
  onClose: () => void
  onChanged: () => void
}) {
  const [search, setSearch] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const inCategory = products.filter((p) => p.category_id === category.id)
  const outside = products.filter(
    (p) => p.category_id !== category.id && p.name.toLowerCase().includes(search.toLowerCase()),
  )

  async function assign(productId: string, nextCategoryId: string | null) {
    setBusy(productId)
    setError(null)
    try {
      await updateProduct(productId, { category_id: nextCategoryId })
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the product")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: category.color || "#34d399" }}
            >
              <Package size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{category.name}</h2>
              <p className="text-xs text-muted">{inCategory.length} products in this category</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {error && <p className="mb-3 text-sm text-danger">{error}</p>}

          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">In this category</h3>
          </div>
          <div className="mb-4 max-h-52 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {inCategory.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">No products here yet</p>
            ) : (
              inCategory.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{p.name}</span>
                  <span className="text-xs text-muted">{formatCurrencyLocal(p.price)}</span>
                  <button
                    onClick={() => assign(p.id, null)}
                    disabled={busy === p.id}
                    className="btn-ghost text-xs text-danger disabled:opacity-50"
                  >
                    {busy === p.id ? "..." : "Remove"}
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Add products</h3>
          </div>
          <input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field mb-2"
          />
          <div className="max-h-52 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {outside.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">No other products</p>
            ) : (
              outside.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{p.name}</span>
                  <span className="text-xs text-muted">{formatCurrencyLocal(p.price)}</span>
                  <button
                    onClick={() => assign(p.id, category.id)}
                    disabled={busy === p.id}
                    className="btn-ghost text-xs text-primary disabled:opacity-50"
                  >
                    {busy === p.id ? "..." : "Add"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function formatCurrencyLocal(amount: number): string {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" }).format(amount)
}

function CategoryModal({
  category,
  onSave,
  onClose,
}: {
  category?: Category | null
  onSave: (data: CategoryInput) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(category?.name || "")
  const [color, setColor] = useState(category?.color || "#34d399")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({ name, color })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">
            {category ? "Edit Category" : "New Category"}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Category Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  title={c.name}
                  className="h-8 w-8 rounded-full border-2 transition-all"
                  style={{ backgroundColor: c.hex, borderColor: color === c.hex ? "#1F2937" : "transparent" }}
                  aria-label={`Set color ${c.name}`}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving..." : category ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [viewing, setViewing] = useState<Category | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState<string | null>(null)
  const [productCounts, setProductCounts] = useState<Record<string, number>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [cats, prods] = await Promise.all([fetchCategories(), fetchProducts()])
      setCategories(cats)
      setProducts(prods)
      const counts: Record<string, number> = {}
      for (const p of prods) {
        if (p.category_id) counts[p.category_id] = (counts[p.category_id] || 0) + 1
      }
      setProductCounts(counts)
    } catch {
      setError("Failed to load categories. Check your connection.")
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => void load(), 0)
    return () => clearTimeout(t)
  }, [load])

  useRealtime(load)

  // Stats
  const totalCategories = categories.length
  const activeCategories = categories.length
  const productsTotal = Object.values(productCounts).reduce((s, n) => s + n, 0)
  const unusedCategories = categories.filter((c) => !productCounts[c.id]).length

  async function handleSave(data: CategoryInput) {
    try {
      if (editing) {
        await updateCategory(editing.id, data)
      } else {
        await createCategory(data)
      }
      setShowForm(false)
      setEditing(null)
      load()
    } catch (e) {
      alert(
        e instanceof Error
          ? `Could not save the category: ${e.message}`
          : "Could not save the category. Try again.",
      )
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category?")) return
    try {
      await deleteCategory(id)
      load()
    } catch {
      alert("Could not delete the category. It may still be assigned to products.")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">{totalCategories} categories total</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary">
            <Download size={16} />
            Export
          </button>
          <button
            onClick={() => { setEditing(null); setShowForm(true) }}
            className="btn-primary"
          >
            <Plus size={16} />
            Create Category
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted">Total Categories</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{totalCategories}</p>
            <p className="mt-1 text-xs text-muted">All categories</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-hover">
            <Package size={20} className="text-muted" />
          </div>
        </div>
        <div className="stat-card flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted">Active Categories</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{activeCategories}</p>
            <p className="mt-1 text-xs text-muted">100% active rate</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-hover">
            <Package size={20} className="text-muted" />
          </div>
        </div>
        <div className="stat-card flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted">Products Tagged</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{productsTotal}</p>
            <p className="mt-1 text-xs text-muted">Across all categories</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-hover">
            <Package size={20} className="text-muted" />
          </div>
        </div>
        <div className="stat-card flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted">Unused Categories</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{unusedCategories}</p>
            <p className="mt-1 text-xs text-muted">No products assigned</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-hover">
            <Package size={20} className="text-muted" />
          </div>
        </div>
      </div>

      {/* Category List */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="text-lg font-bold text-foreground">Product Categories</h2>
        </div>

        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted">Loading...</div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted">
              <p className="text-lg font-medium">No categories yet</p>
              <p className="text-sm">Create your first category to get started</p>
            </div>
          ) : (
            categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-4 rounded-xl border border-border p-4 transition-all hover:border-primary/30 hover:shadow-sm"
              >
                {/* Category Color */}
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: cat.color || "#34d399" }}
                >
                  <Package size={24} className="text-white" />
                </div>

                {/* Category Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{cat.name}</h3>
                    <span className="inline-flex items-center rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success">
                      Active
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted">/{cat.name.toLowerCase().replace(/\s+/g, "-")}</p>
                  <p className="mt-0.5 text-sm text-muted">{productCounts[cat.id] || 0} products</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setViewing(cat)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-sidebar-hover hover:text-foreground transition-all"
                    title="View"
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    onClick={() => { setEditing(cat); setShowForm(true) }}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-sidebar-hover hover:text-foreground transition-all"
                    title="Edit"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-danger-bg hover:text-danger transition-all"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showForm && (
        <CategoryModal
          category={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      {viewing && (
        <CategoryViewModal
          category={viewing}
          products={products}
          onClose={() => setViewing(null)}
          onChanged={load}
        />
      )}
    </div>
  )
}
