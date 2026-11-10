"use client"

import { useEffect, useState } from "react"
import { useAuth, useUser, useClerk } from "@clerk/clerk-react"
import { X, LogOut, Copy, Check, ExternalLink, Trash2 } from "lucide-react"
import { useOrg } from "@/lib/auth/org"
import { fetchSettings, updateSettings } from "@/lib/api/data"
import {
  affiliateShareUrl,
  clearAffiliateRef,
  normalizeAffiliateRef,
  openAffiliateProgram,
  readAffiliateRef,
  saveAffiliateRef,
} from "@/lib/affiliate"
import { exportBackup } from "@/lib/api/backup"
import { enterDemoMode, exitDemoMode, isDemoModeActive } from "@/lib/api/demo"

export const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  supervisor: "Supervisor",
  cashier: "Cashier",
}

export function AccountModal({ onClose }: { onClose: () => void }) {
  const { user } = useUser()
  const clerk = useClerk()
  const { shop } = useOrg()
  const email = user?.primaryEmailAddress?.emailAddress ?? ""
  const name = user?.fullName || user?.firstName || "User"
  const role = shop?.role ? (ROLE_LABEL[shop.role] ?? "Staff") : "Staff"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-lg font-bold text-foreground">My account</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-white">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">{name}</p>
              <p className="truncate text-sm text-muted">{email}</p>
              <span className="mt-1 inline-block rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-medium text-primary">
                {role}
              </span>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted">
            To change your email or password, use the account portal or ask your shop owner.
          </p>
          <button
            onClick={() => {
              void clerk.signOut()
              onClose()
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

interface ShopForm {
  shop_name: string
  address: string
  phone: string
  tax_rate: string
  tax_inclusive: boolean
  receipt_footer: string
  momo_number: string
  momo_network: string
}

export function ShopSettingsModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<ShopForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const { shop, retry } = useOrg()

  useEffect(() => {
    let cancelled = false
    fetchSettings()
      .then((s) => {
        if (cancelled) return
        setForm({
          shop_name: s?.shop_name ?? shop?.name ?? "",
          address: s?.address ?? "",
          phone: s?.phone ?? "",
          tax_rate: String(s?.tax_rate ?? 0),
          tax_inclusive: s?.tax_inclusive ?? false,
          receipt_footer: s?.receipt_footer ?? "",
          momo_number: s?.momo_number ?? "",
          momo_network: s?.momo_network ?? "",
        })
      })
      .catch(() => {
        if (!cancelled) setError("Could not load shop settings")
      })
    return () => {
      cancelled = true
    }
  }, [shop?.name])

  async function save() {
    if (!form) return
    setSaving(true)
    setError(null)
    try {
      await updateSettings({
        shop_name: form.shop_name,
        address: form.address || null,
        phone: form.phone || null,
        tax_rate: Number(form.tax_rate) || 0,
        tax_inclusive: form.tax_inclusive,
        receipt_footer: form.receipt_footer || null,
        momo_number: form.momo_number || null,
        momo_network: form.momo_network || null,
      })
      void retry()
      setSaved(true)
      setTimeout(() => onClose(), 800)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save shop settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card p-5">
          <h2 className="text-lg font-bold text-foreground">Shop settings</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          {saved && <p className="mb-3 text-sm text-green-600">Saved</p>}
          {!form ? (
            <p className="py-8 text-center text-sm text-muted">Loading...</p>
          ) : (
            <div className="space-y-3">
              <Field
                label="Shop name"
                value={form.shop_name}
                onChange={(v) => setForm({ ...form, shop_name: v })}
              />
              <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
              <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Tax rate (%)"
                  value={form.tax_rate}
                  onChange={(v) => setForm({ ...form, tax_rate: v })}
                  type="number"
                />
                <label className="flex items-end gap-2 pb-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={form.tax_inclusive}
                    onChange={(e) => setForm({ ...form, tax_inclusive: e.target.checked })}
                    className="h-4 w-4 rounded accent-emerald-600"
                  />
                  Prices include tax
                </label>
              </div>
              <Field
                label="MoMo number"
                value={form.momo_number}
                onChange={(v) => setForm({ ...form, momo_number: v })}
              />
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">MoMo network</span>
                <select
                  value={form.momo_network}
                  onChange={(e) => setForm({ ...form, momo_network: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Select network</option>
                  <option value="MTN">MTN MoMo</option>
                  <option value="VODAFONE">Telecel Cash</option>
                  <option value="AIRTELTIGO">AT Money</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted">Receipt footer</span>
                <textarea
                  value={form.receipt_footer}
                  onChange={(e) => setForm({ ...form, receipt_footer: e.target.value })}
                  rows={2}
                  placeholder="Thanks for shopping with us!"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>
              <button
                onClick={() => void save()}
                disabled={saving || !form.shop_name.trim()}
                className="mt-2 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <input
        type={type ?? "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
      />
    </label>
  )
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-xl border border-border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function ReferralModal({ onClose }: { onClose: () => void }) {
  const [saved, setSaved] = useState(() => readAffiliateRef())
  const [draft, setDraft] = useState(() => readAffiliateRef() ?? "")
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function save() {
    const code = normalizeAffiliateRef(draft)
    if (!code) {
      setError("Referral codes look like SCAL-XXXXXXXX.")
      return
    }
    const stored = saveAffiliateRef(code)
    if (!stored) {
      setError("Could not save this code on this device.")
      return
    }
    setSaved(stored)
    setDraft(stored)
    setError(null)
  }

  function remove() {
    clearAffiliateRef()
    setSaved(null)
    setDraft("")
    setError(null)
  }

  async function copyLink() {
    if (!saved) return
    try {
      await navigator.clipboard.writeText(affiliateShareUrl(saved))
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setError("Could not copy the link.")
    }
  }

  return (
    <ModalShell title="Referral program" onClose={onClose}>
      <p className="text-sm leading-6 text-muted">
        Share ScalPOS with other shops. When they subscribe with your referral code, you earn a
        commission. Referred shops also get their own onboarding perks.
      </p>
      <button
        onClick={openAffiliateProgram}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-sidebar-hover"
      >
        <ExternalLink size={15} />
        Open the affiliate program
      </button>

      <div className="mt-5">
        <label className="label">Your referral code</label>
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value.toUpperCase())
              setError(null)
            }}
            placeholder="SCAL-XXXXXXXX"
            className="input-field uppercase"
            autoCapitalize="characters"
            spellCheck={false}
          />
          <button onClick={save} className="btn-primary shrink-0 text-sm">
            Save
          </button>
        </div>
        {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
        {saved && (
          <div className="mt-3 rounded-lg border border-border bg-sidebar-hover/40 p-3">
            <p className="text-xs text-muted">Saved code</p>
            <p className="mt-0.5 text-sm font-semibold text-foreground">{saved}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => void copyLink()} className="btn-secondary text-xs">
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy referral link"}
              </button>
              <button onClick={remove} className="btn-ghost text-xs text-danger">
                <Trash2 size={13} />
                Remove
              </button>
            </div>
          </div>
        )}
        {!saved && (
          <p className="mt-1.5 text-xs text-muted">
            Enter the code you were given when you joined the program.
          </p>
        )}
      </div>
    </ModalShell>
  )
}

export function BackupModal({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function download() {
    setBusy(true)
    setError(null)
    try {
      await exportBackup()
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the backup")
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalShell title="Backup & recovery" onClose={onClose}>
      <p className="text-sm leading-6 text-muted">
        Download a full copy of this shop&apos;s data — products, categories, customers, sales,
        staff and settings — as a JSON file you can keep anywhere safe.
      </p>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      {done && <p className="mt-3 text-sm text-green-600">Backup downloaded.</p>}
      <button onClick={() => void download()} disabled={busy} className="btn-primary mt-4 w-full">
        {busy ? "Preparing…" : "Download backup"}
      </button>
      <p className="mt-3 text-xs leading-5 text-muted">
        Restoring a backup is done from the mobile app, where the file is imported back into the
        register.
      </p>
    </ModalShell>
  )
}

export function DemoModal({ onClose }: { onClose: () => void }) {
  const { userId } = useAuth()
  const [demoActive, setDemoActive] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const active = userId ? demoActive : false

  useEffect(() => {
    if (!userId) return
    let alive = true
    isDemoModeActive(userId)
      .then((v) => {
        if (alive) setDemoActive(v)
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : "Could not check demo mode")
      })
    return () => {
      alive = false
    }
  }, [userId])

  async function toggle() {
    if (!userId) {
      setError("Sign in first to try demo mode.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (active) exitDemoMode(userId)
      else await enterDemoMode(userId)
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update demo mode")
      setBusy(false)
    }
  }

  return (
    <ModalShell title="Demo mode" onClose={onClose}>
      <p className="text-sm leading-6 text-muted">
        Explore ScalPOS with sample products, customers and sales inside a private demo workspace.
        Nothing in this preview touches your real shop&apos;s data.
      </p>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      {userId && demoActive === null ? (
        <p className="mt-4 text-sm text-muted">Checking…</p>
      ) : active ? (
        <>
          <p className="mt-4 rounded-lg bg-sidebar-hover/60 px-3 py-2 text-xs text-muted">
            Demo mode is currently on.
          </p>
          <button
            onClick={() => void toggle()}
            disabled={busy}
            className="mt-3 w-full rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-sidebar-hover disabled:opacity-50"
          >
            {busy ? "Preparing…" : "Exit demo mode"}
          </button>
        </>
      ) : (
        <button onClick={() => void toggle()} disabled={busy} className="btn-primary mt-4 w-full">
          {busy ? "Preparing…" : "Enter demo mode"}
        </button>
      )}
    </ModalShell>
  )
}
