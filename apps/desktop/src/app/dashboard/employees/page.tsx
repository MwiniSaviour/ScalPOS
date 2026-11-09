"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, Edit2, Trash2, Loader2, AlertCircle } from "lucide-react"
import type { Staff } from "@/lib/types"
import { fetchStaff, deleteStaff } from "@/lib/api/data"
import { formatDate, cn } from "@/lib/utils"
import { ROLE_LABELS } from "@/lib/constants"
import { EmployeeForm } from "./employee-form"

const ROLE_BADGE: Record<Staff["role"], string> = {
  owner: "bg-primary-light text-primary",
  supervisor: "bg-info-bg text-info",
  cashier: "bg-success-bg text-success",
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export default function EmployeesPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Staff | null>(null)

  const load = useCallback(async () => {
    try {
      setStaff(await fetchStaff())
      setError(null)
    } catch {
      setError("Failed to load employees. Check your connection.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => void load(), 0)
    return () => clearTimeout(t)
  }, [load])

  const filtered = staff.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.phone ?? "").toLowerCase().includes(search.toLowerCase())
  )

  async function handleDelete(s: Staff) {
    if (!confirm(`Delete ${s.name}?`)) return
    try {
      await deleteStaff(s.id)
      void load()
    } catch {
      alert("Could not delete the employee. Try again.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">{staff.length} staff members</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="btn-primary"
        >
          <Plus size={16} />
          Add Employee
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-danger-bg bg-danger-bg px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-danger">
            <AlertCircle size={16} />
            {error}
          </div>
          <button onClick={() => void load()} className="btn-ghost text-danger">
            Retry
          </button>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading employees...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
          <p className="font-medium text-foreground">No employees found</p>
          <p className="mt-1 text-sm text-muted">
            {search ? "Try a different search term." : "Add your first employee to get started."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-6 py-3 text-left">Name</th>
                <th className="px-6 py-3 text-left">Role</th>
                <th className="px-6 py-3 text-left">Phone</th>
                <th className="px-6 py-3 text-left">Joined</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-sidebar-hover transition-colors border-b border-border last:border-b-0"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sidebar-hover overflow-hidden">
                        <span className="text-sm font-bold text-muted">{getInitials(s.name)}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{s.name}</span>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                              s.active ? "bg-success-bg text-success" : "bg-danger-bg text-danger"
                            )}
                          >
                            {s.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                        ROLE_BADGE[s.role]
                      )}
                    >
                      {ROLE_LABELS[s.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted">{s.phone ?? "—"}</td>
                  <td className="px-6 py-4 text-sm text-muted">{formatDate(s.created_at)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditing(s); setShowForm(true) }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-success hover:bg-success-bg transition-all"
                        title="Edit"
                      >
                        <Edit2 size={17} />
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-danger hover:bg-danger-bg transition-all"
                        title="Delete"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <EmployeeForm
          staff={editing}
          onSave={load}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
