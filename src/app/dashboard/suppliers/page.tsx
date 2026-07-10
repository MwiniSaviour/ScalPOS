"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, Edit2, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Supplier } from "@/lib/types"
import { SupplierForm } from "./supplier-form"

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("suppliers")
      .select("*")
      .order("name")
    if (data) setSuppliers(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetch() }, [fetch])

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.contact_person?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSave(data: Partial<Supplier>) {
    if (editing) {
      await supabase.from("suppliers").update(data).eq("id", editing.id)
    } else {
      await supabase.from("suppliers").insert(data)
    }
    setShowForm(false)
    setEditing(null)
    fetch()
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this supplier?")) return
    await supabase.from("suppliers").delete().eq("id", id)
    fetch()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Suppliers</h1>
          <p className="page-subtitle">{suppliers.length} suppliers</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="btn-primary"
        >
          <Plus size={18} />
          Add Supplier
        </button>
      </div>

      <div className="mb-6 relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          placeholder="Search suppliers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-9"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Contact Person</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted">
                  No suppliers found
                </td>
              </tr>
            ) : (
              filtered.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-sidebar-hover transition-colors">
                  <td className="table-cell font-medium text-foreground">{supplier.name}</td>
                  <td className="table-cell">{supplier.contact_person || "-"}</td>
                  <td className="table-cell">{supplier.email || "-"}</td>
                  <td className="table-cell">{supplier.phone || "-"}</td>
                  <td className="table-cell text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => { setEditing(supplier); setShowForm(true) }}
                        className="btn-ghost p-1.5"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(supplier.id)}
                        className="btn-ghost p-1.5 text-danger hover:text-danger"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <SupplierForm
          supplier={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
