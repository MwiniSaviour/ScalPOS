"use client"

import { useState } from "react"
import { X } from "lucide-react"
import type { Staff } from "@/lib/types"
import { upsertStaff } from "@/lib/api/data"
import { ROLES, ROLE_LABELS } from "@/lib/constants"

interface EmployeeFormProps {
  staff?: Staff | null
  onSave: () => Promise<void> | void
  onClose: () => void
}

export function EmployeeForm({ staff, onSave, onClose }: EmployeeFormProps) {
  const [name, setName] = useState(staff?.name ?? "")
  const [phone, setPhone] = useState(staff?.phone ?? "")
  const [role, setRole] = useState<Staff["role"]>(staff?.role ?? "cashier")
  const [active, setActive] = useState(staff?.active ?? true)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await upsertStaff(staff?.id ?? null, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        role,
        active,
      })
      await onSave()
      onClose()
    } catch {
      alert("Could not save the employee. Try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">
            {staff ? "Edit Employee" : "Add Employee"}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="label">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" placeholder="Optional" />
          </div>
          <div>
            <label className="label">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as Staff["role"])} className="input-field">
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Active</p>
              <p className="text-xs text-muted">Employee can sign in and use the POS</p>
            </div>
            <button
              type="button"
              onClick={() => setActive(!active)}
              className={active ? "bg-success text-white" : "bg-sidebar-hover text-muted"}
            >
              {active ? "On" : "Off"}
            </button>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving..." : staff ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
