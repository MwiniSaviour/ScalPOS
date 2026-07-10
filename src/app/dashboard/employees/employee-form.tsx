"use client"

import { useState } from "react"
import { X } from "lucide-react"
import type { Profile } from "@/lib/types"
import { ROLES } from "@/lib/constants"

interface EmployeeFormProps {
  employee?: Profile | null
  onSave: (data: Partial<Profile>) => Promise<void>
  onClose: () => void
}

function generatePin() {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

export function EmployeeForm({ employee, onSave, onClose }: EmployeeFormProps) {
  const [name, setName] = useState(employee?.name || "")
  const [email, setEmail] = useState(employee?.email || "")
  const [role, setRole] = useState<"admin" | "employee">(employee?.role || "employee")
  const [pin, setPin] = useState(employee?.pin || generatePin())
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({ name, email, role, pin })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">
            {employee ? "Edit Employee" : "Add Employee"}
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
            <label className="label">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="label">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className="input-field">
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">POS PIN</label>
            <div className="flex gap-2">
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="input-field font-mono"
                maxLength={6}
              />
              <button type="button" onClick={() => setPin(generatePin())} className="btn-secondary shrink-0">
                Generate
              </button>
            </div>
            <p className="mt-1 text-xs text-muted">Used for POS access (4-6 digits)</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving..." : employee ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
