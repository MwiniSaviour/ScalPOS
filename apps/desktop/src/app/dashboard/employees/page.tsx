"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Key,
  Trash2,
  LayoutGrid,
  List,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatDate, cn } from "@/lib/utils"
import type { Profile } from "@/lib/types"
import { EmployeeForm } from "./employee-form"

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [view, setView] = useState<"table" | "grid">("table")
  const [perPage, setPerPage] = useState(10)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Profile | null>(null)
  const supabase = createClient()

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("name")
    if (data) setEmployees(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetch() }, [fetch])

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase())
  )

  const displayed = filtered.slice(0, perPage)

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  async function handleSave(data: Partial<Profile>) {
    if (editing) {
      await supabase.from("profiles").update(data).eq("id", editing.id)
    } else {
      await supabase.from("profiles").insert(data)
    }
    setShowForm(false)
    setEditing(null)
    fetch()
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this employee?")) return
    await supabase.from("profiles").delete().eq("id", id)
    fetch()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p className="page-subtitle">{employees.length} staff members</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="btn-primary"
        >
          <Plus size={16} />
          Add User
        </button>
      </div>

      {/* Filters bar */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9"
            />
          </div>
          <button className="btn-primary">
            <Search size={16} />
            Search
          </button>
          <button className="btn-secondary">
            <Filter size={16} />
            Filters
          </button>

          <div className="ml-auto flex items-center gap-3">
            <div className="flex rounded-lg border border-border p-0.5">
              <button
                onClick={() => setView("table")}
                className={cn(
                  "rounded-md p-1.5 transition-all",
                  view === "table" ? "bg-primary text-white" : "text-muted hover:text-foreground"
                )}
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setView("grid")}
                className={cn(
                  "rounded-md p-1.5 transition-all",
                  view === "grid" ? "bg-primary text-white" : "text-muted hover:text-foreground"
                )}
              >
                <LayoutGrid size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted">
              <span>Per Page:</span>
              <select
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
                className="rounded-lg border border-border bg-card px-2 py-1 text-sm text-foreground outline-none"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted">Loading...</div>
      ) : view === "table" ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-6 py-3 text-left">#</th>
                <th className="px-6 py-3 text-left">Name</th>
                <th className="px-6 py-3 text-left">Roles</th>
                <th className="px-6 py-3 text-left">Joined</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted">
                    No employees found
                  </td>
                </tr>
              ) : (
                displayed.map((emp, i) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-sidebar-hover transition-colors border-b border-border last:border-b-0"
                  >
                    <td className="px-6 py-4 text-sm text-muted">{i + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sidebar-hover overflow-hidden">
                          {emp.avatar ? (
                            <img src={emp.avatar} alt={emp.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-muted">{getInitials(emp.name)}</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{emp.name}</span>
                            <span className="inline-flex items-center rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success">
                              Active
                            </span>
                          </div>
                          <p className="text-sm text-muted">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                        emp.role === "admin"
                          ? "bg-primary-light text-primary"
                          : "bg-info-bg text-info"
                      )}>
                        {emp.role === "admin" ? "Admin" : "Employee"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted">
                      {formatDate(emp.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-info hover:bg-info-bg transition-all"
                          title="View"
                        >
                          <Eye size={17} />
                        </button>
                        <button
                          onClick={() => { setEditing(emp); setShowForm(true) }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-success hover:bg-success-bg transition-all"
                          title="Edit"
                        >
                          <Edit2 size={17} />
                        </button>
                        <button
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-primary hover:bg-primary-light transition-all"
                          title="Reset Password"
                        >
                          <Key size={17} />
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-danger hover:bg-danger-bg transition-all"
                          title="Delete"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayed.map((emp) => (
            <div key={emp.id} className="glass-panel p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sidebar-hover overflow-hidden">
                    {emp.avatar ? (
                      <img src={emp.avatar} alt={emp.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-muted">{getInitials(emp.name)}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{emp.name}</h3>
                      <span className="inline-flex items-center rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success">
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-muted">{emp.email}</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <span className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                  emp.role === "admin"
                    ? "bg-primary-light text-primary"
                    : "bg-info-bg text-info"
                )}>
                  {emp.role === "admin" ? "Admin" : "Employee"}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditing(emp); setShowForm(true) }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-sidebar-hover hover:text-foreground transition-all"
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(emp.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-danger-bg hover:text-danger transition-all"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <EmployeeForm
          employee={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
