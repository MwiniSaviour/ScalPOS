"use client"

import { useRealtime } from "@/lib/api/realtime"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, Download, Eye, Edit, Trash2, Package, X } from "lucide-react"
import Link from "next/link"
import { fetchCustomers, createCustomer, updateCustomer, deleteCustomer, type CustomerInput } from "@/lib/api/data"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { Customer } from "@/lib/types"

const emptyForm: CustomerInput = { name: "", phone: "", address: "", note: "" }

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState<CustomerInput>(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setCustomers(await fetchCustomers())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load customers")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => void load(), 0)
    return () => clearTimeout(t)
  }, [load])

  useRealtime(load)

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
  )

  const totalCustomers = customers.length
  const activeCustomers = customers.filter((c) => c.total_purchases > 0).length
  const totalRevenue = customers.reduce((sum, c) => sum + (c.total_purchases || 0), 0)
  const avgOrderValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const newThisMonth = customers.filter((c) => new Date(c.created_at) >= startOfMonth).length

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(c: Customer) {
    setEditing(c)
    setForm({ name: c.name, phone: c.phone ?? "", address: c.address ?? "", note: c.note ?? "" })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editing) await updateCustomer(editing.id, form)
      else await createCustomer(form)
      setModalOpen(false)
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save customer")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this customer?")) return
    try {
      await deleteCustomer(id)
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete customer")
    }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Management</h1>
          <p className="page-subtitle">{totalCustomers} registered customers</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary">
            <Download size={16} />
            Export
          </button>
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} />
            Create Customer
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-danger-bg bg-danger-bg px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted">Total Customers</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{totalCustomers}</p>
            <p className="mt-1 text-xs text-muted">{newThisMonth} new this month</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-hover">
            <Package size={20} className="text-muted" />
          </div>
        </div>
        <div className="stat-card flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted">Active Customers</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{activeCustomers}</p>
            <p className="mt-1 text-xs text-muted">{totalCustomers > 0 ? Math.round((activeCustomers / totalCustomers) * 100) : 0}% active rate</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-hover">
            <Package size={20} className="text-muted" />
          </div>
        </div>
        <div className="stat-card flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted">New This Month</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{newThisMonth}</p>
            <p className="mt-1 text-xs text-muted">{totalCustomers > 0 ? Math.round((newThisMonth / totalCustomers) * 100) : 0}% growth</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-hover">
            <Package size={20} className="text-muted" />
          </div>
        </div>
        <div className="stat-card flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted">Avg. Order Value</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{formatCurrency(avgOrderValue)}</p>
            <p className="mt-1 text-xs text-muted">Per order</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-hover">
            <Package size={20} className="text-muted" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h2 className="text-lg font-bold text-foreground">Customer Directory</h2>
        </div>

        <div className="border-b border-border p-4">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9"
            />
          </div>
        </div>

        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted">
              <p className="text-lg font-medium">No customers found</p>
              <p className="text-sm">Try adjusting your search</p>
            </div>
          ) : (
            filtered.map((customer) => (
              <div
                key={customer.id}
                className="flex items-center gap-4 rounded-xl border border-border p-4 transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sidebar-hover text-lg font-bold text-muted">
                  {getInitials(customer.name)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{customer.name}</h3>
                    {customer.total_purchases > 0 && (
                      <span className="inline-flex items-center rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted">
                    {customer.phone && (
                      <span className="flex items-center gap-1.5">
                        <Package size={13} />
                        {customer.phone}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-sm text-muted">
                    <span>{formatCurrency(customer.total_purchases)} spent</span>
                    <span>Joined {formatDate(customer.created_at)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Link
                    href={`/dashboard/customers/${customer.id}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-sidebar-hover hover:text-foreground transition-all"
                    title="View"
                  >
                    <Eye size={18} />
                  </Link>
                  <button
                    onClick={() => openEdit(customer)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-sidebar-hover hover:text-foreground transition-all"
                    title="Edit"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(customer.id)}
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">
                {editing ? "Edit Customer" : "Create Customer"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-sidebar-hover hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground">Name</label>
                <input
                  className="input-field mt-1"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Customer name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Phone</label>
                <input
                  className="input-field mt-1"
                  value={form.phone ?? ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Address</label>
                <input
                  className="input-field mt-1"
                  value={form.address ?? ""}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Address"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Note</label>
                <textarea
                  className="input-field mt-1"
                  rows={2}
                  value={form.note ?? ""}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Notes"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saving || !form.name.trim()}>
                {saving ? "Saving..." : editing ? "Save Changes" : "Create Customer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
