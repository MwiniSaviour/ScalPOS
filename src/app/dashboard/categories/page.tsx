"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Download, Eye, Edit2, Trash2, Package, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Category } from "@/lib/types"

function CategoryModal({
  category,
  onSave,
  onClose,
}: {
  category?: Category | null
  onSave: (data: Partial<Category>) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(category?.name || "")
  const [description, setDescription] = useState(category?.description || "")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({ name, description: description || null })
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
            <label className="label">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field min-h-[60px] resize-none"
              rows={2}
            />
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
  const [productCounts, setProductCounts] = useState<Record<string, number>>({})
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("name")
    if (data) {
      setCategories(data)
      const counts: Record<string, number> = {}
      for (const cat of data) {
        const { count } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("category_id", cat.id)
        counts[cat.id] = count || 0
      }
      setProductCounts(counts)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetch() }, [fetch])

  // Stats
  const totalCategories = categories.length
  const activeCategories = categories.length
  const parentCategories = categories.filter((c) => !c.description?.includes("sub:")).length
  const subCategories = totalCategories - parentCategories

  async function handleSave(data: Partial<Category>) {
    if (editing) {
      await supabase.from("categories").update(data).eq("id", editing.id)
    } else {
      await supabase.from("categories").insert(data)
    }
    setShowForm(false)
    setEditing(null)
    fetch()
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category?")) return
    await supabase.from("categories").delete().eq("id", id)
    fetch()
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
            <p className="text-sm font-medium text-muted">Parent Categories</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{parentCategories}</p>
            <p className="mt-1 text-xs text-muted">Main categories</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-hover">
            <Package size={20} className="text-muted" />
          </div>
        </div>
        <div className="stat-card flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted">Sub Categories</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{subCategories}</p>
            <p className="mt-1 text-xs text-muted">Child categories</p>
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
                {/* Category Image */}
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-sidebar-hover overflow-hidden">
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package size={24} className="text-muted" />
                  )}
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
    </div>
  )
}
