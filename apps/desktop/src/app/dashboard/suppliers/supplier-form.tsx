"use client"

import { useState } from "react"
import { X } from "lucide-react"
import type { Supplier } from "@/lib/types"

interface SupplierFormProps {
  supplier?: Supplier | null
  onSave: (data: Partial<Supplier>) => Promise<void>
  onClose: () => void
}

export function SupplierForm({ supplier, onSave, onClose }: SupplierFormProps) {
  const [name, setName] = useState(supplier?.name || "")
  const [contactPerson, setContactPerson] = useState(supplier?.contact_person || "")
  const [email, setEmail] = useState(supplier?.email || "")
  const [phone, setPhone] = useState(supplier?.phone || "")
  const [address, setAddress] = useState(supplier?.address || "")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({ name, contact_person: contactPerson || null, email: email || null, phone: phone || null, address: address || null })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">
            {supplier ? "Edit Supplier" : "Add Supplier"}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Company Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="label">Contact Person</label>
            <input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" />
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} className="input-field min-h-[60px] resize-none" rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving..." : supplier ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
