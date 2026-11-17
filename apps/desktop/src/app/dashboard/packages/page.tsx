"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, Edit2, Gift, Loader2, Plus, Trash2, X } from "lucide-react"
import {
  createPackage,
  deletePackage,
  fetchPackages,
  fetchProducts,
  updatePackage,
} from "@/lib/api/data"
import { useRealtime } from "@/lib/api/realtime"
import { hasFeature } from "@/lib/features"
import { fmtMoney } from "@/lib/money"
import { useBusinessType } from "@/lib/terms"
import type { PackageCreditLine, Product, ServicePackage } from "@/lib/types"

export default function PackagesPage() {
  const businessType = useBusinessType()
  const enabled = hasFeature(businessType, "packages")

  const [packages, setPackages] = useState<ServicePackage[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ServicePackage | null>(null)

  const load = useCallback(async () => {
    try {
      const [pkgs, prods] = await Promise.all([fetchPackages(), fetchProducts()])
      setPackages(pkgs)
      setProducts(prods.filter((p) => p.kind === "service" && p.active))
      setError(null)
    } catch {
      setError("Failed to load packages. Check your connection.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    const t = setTimeout(() => void load(), 0)
    return () => clearTimeout(t)
  }, [load, enabled])

  useRealtime(() => void load(), enabled)

  async function remove(pkg: ServicePackage) {
    if (!window.confirm(`Delete the package "${pkg.name}"?`)) return
    try {
      await deletePackage(pkg.id)
      await load()
    } catch {
      setError("Could not delete the package")
    }
  }

  function contents(pkg: ServicePackage): string {
    return pkg.credits
      .map((c) => {
        const p = products.find((x) => x.id === c.productId)
        return `${c.qty} × ${p?.name ?? "Service"}`
      })
      .join(", ")
  }

  if (!enabled) {
    return (
      <div className="space-y-6">
        <div className="page-header"><h1 className="page-title">Packages</h1></div>
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <Gift size={32} className="mx-auto text-muted" />
          <p className="mt-3 font-semibold text-foreground">Salon only</p>
          <p className="mt-1 text-sm text-muted">
            Packages are available when this shop is set up as a salon.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Packages</h1>
          <p className="page-subtitle">Bundles of services paid for with credits</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="btn-primary"
        >
          <Plus size={16} />
          New package
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-danger-bg bg-danger-bg px-4 py-3 text-sm text-danger">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading packages...
        </div>
      ) : packages.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
          <p className="font-medium text-foreground">No packages yet</p>
          <p className="mt-1 text-sm text-muted">
            Create a bundle of services your clients can buy once and use later.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-6 py-3 text-left">Package</th>
                <th className="px-6 py-3 text-left">Contents</th>
                <th className="px-6 py-3 text-right">Price</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <tr key={pkg.id} className="border-b border-border last:border-b-0 hover:bg-sidebar-hover transition-colors">
                  <td className="px-6 py-4 font-semibold text-foreground">{pkg.name}</td>
                  <td className="px-6 py-4 text-sm text-muted">{contents(pkg) || "No services"}</td>
                  <td className="tabnum px-6 py-4 text-right font-semibold text-foreground">{fmtMoney(pkg.price)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditing(pkg); setShowForm(true) }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-success hover:bg-success-bg"
                        title="Edit"
                      >
                        <Edit2 size={17} />
                      </button>
                      <button
                        onClick={() => void remove(pkg)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-danger hover:bg-danger-bg"
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
        <PackageForm
          pkg={editing}
          services={products}
          onSave={load}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

function PackageForm({
  pkg,
  services,
  onSave,
  onClose,
}: {
  pkg: ServicePackage | null
  services: Product[]
  onSave: () => Promise<void> | void
  onClose: () => void
}) {
  const isCreate = !pkg
  const [name, setName] = useState(pkg?.name ?? "")
  const [price, setPrice] = useState(pkg ? String(pkg.price) : "")
  const [credits, setCredits] = useState<PackageCreditLine[]>(pkg?.credits ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function toggle(productId: string) {
    setCredits((prev) =>
      prev.some((c) => c.productId === productId)
        ? prev.filter((c) => c.productId !== productId)
        : [...prev, { productId, qty: 1 }],
    )
  }

  function setQty(productId: string, qty: number) {
    setCredits((prev) =>
      prev.map((c) => (c.productId === productId ? { ...c, qty: Math.max(1, qty) } : c)),
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amount = Number(price)
    if (!name.trim()) { setError("Name is required"); return }
    if (!Number.isFinite(amount) || amount <= 0) { setError("Enter a price greater than zero"); return }
    if (credits.length === 0) { setError("Pick at least one service"); return }
    setSaving(true)
    setError("")
    try {
      const payload = { name: name.trim(), price: amount, credits }
      if (isCreate) await createPackage(payload)
      else await updatePackage(pkg!.id, payload)
      await onSave()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the package")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">{isCreate ? "New package" : "Edit package"}</h2>
          <button onClick={onClose} className="btn-ghost p-1"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="e.g. Manicure ×4"
              required
            />
          </div>
          <div>
            <label className="label">Price (GH₵)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="input-field"
              placeholder="280.00"
              required
            />
          </div>
          <div>
            <label className="label">Services included</label>
            <div className="space-y-2 rounded-lg border border-border p-3">
              {services.length === 0 && (
                <p className="text-sm text-muted">Add service products in Inventory first.</p>
              )}
              {services.map((p) => {
                const credit = credits.find((c) => c.productId === p.id)
                return (
                  <div key={p.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!credit}
                      onChange={() => toggle(p.id)}
                      aria-label={`Include ${p.name}`}
                    />
                    <span className="min-w-0 flex-1 truncate text-foreground">{p.name}</span>
                    {credit && (
                      <input
                        type="number"
                        min={1}
                        value={credit.qty}
                        onChange={(e) => setQty(p.id, Number(e.target.value))}
                        className="input-field w-16 px-2 py-1 text-center"
                        aria-label={`Credits of ${p.name}`}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving..." : isCreate ? "Create package" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
