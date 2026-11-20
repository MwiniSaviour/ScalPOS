"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, Edit2, Trash2, Loader2, AlertCircle } from "lucide-react"
import type { Product, Staff } from "@/lib/types"
import { fetchProducts, fetchStaff, deleteStaff } from "@/lib/api/data"
import { useImageSrc } from "@/lib/api/image"
import { useOrg } from "@/lib/auth/org"
import { hasFeature } from "@/lib/features"
import { useBusinessType } from "@/lib/terms"
import { formatDate, cn } from "@/lib/utils"
import { ROLE_LABELS } from "@/lib/constants"
import { EmployeeForm } from "./employee-form"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

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

function StaffAvatar({ staff }: { staff: Staff }) {
  const src = useImageSrc(staff.photo_path)
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sidebar-hover">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm font-bold text-muted">{getInitials(staff.name)}</span>
      )}
    </div>
  )
}

export default function EmployeesPage() {
  const { shop } = useOrg()
  const isOwner = shop?.role === "owner"
  const businessType = useBusinessType()
  const showSalon = hasFeature(businessType, "services")
  const showCommission = hasFeature(businessType, "commissions")
  const [staff, setStaff] = useState<Staff[]>([])
  const [services, setServices] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Staff | null>(null)

  const load = useCallback(async () => {
    try {
      const [staffList, products] = await Promise.all([fetchStaff(), fetchProducts()])
      setStaff(staffList)
      setServices(products.filter((p) => p.kind === "service" && p.active))
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
          disabled={!isOwner}
          title={isOwner ? undefined : "Only the owner can manage staff"}
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
                {showSalon && <th className="px-6 py-3 text-left">Skills</th>}
                {showSalon && <th className="px-6 py-3 text-left">Schedule</th>}
                {showCommission && <th className="px-6 py-3 text-right">Commission</th>}
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
                      <StaffAvatar staff={s} />
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
                  {showSalon && (
                    <td className="px-6 py-4 text-sm text-muted">
                      {s.skills && s.skills.length > 0
                        ? s.skills
                            .map((id) => services.find((p) => p.id === id)?.name)
                            .filter(Boolean)
                            .join(", ") || "—"
                        : "Any service"}
                    </td>
                  )}
                  {showSalon && (
                    <td className="px-6 py-4 text-sm text-muted">
                      {s.schedule && s.schedule.length > 0
                        ? s.schedule.map((r) => `${DAYS[r.day] ?? ""} ${r.start}–${r.end}`).join(", ")
                        : "—"}
                    </td>
                  )}
                  {showCommission && (
                    <td className="tabnum px-6 py-4 text-right text-sm font-semibold text-foreground">
                      {s.commission_pct != null ? `${s.commission_pct}%` : "—"}
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm text-muted">{s.phone ?? "—"}</td>
                  <td className="px-6 py-4 text-sm text-muted">{formatDate(s.created_at)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditing(s); setShowForm(true) }}
                        disabled={!isOwner}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-success hover:bg-success-bg transition-all disabled:opacity-40"
                        title="Edit"
                      >
                        <Edit2 size={17} />
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        disabled={!isOwner}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-danger hover:bg-danger-bg transition-all disabled:opacity-40"
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
          orgId={shop?.id ?? ""}
          services={services}
          onSave={load}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
