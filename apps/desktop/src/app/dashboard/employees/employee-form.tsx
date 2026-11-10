"use client"

import { useRef, useState } from "react"
import { ImagePlus, Trash2, X } from "lucide-react"
import type { Staff } from "@/lib/types"
import { inviteEmployee, upsertStaff } from "@/lib/api/data"
import { uploadStaffImage, useImageSrc } from "@/lib/api/image"
import { ROLES, ROLE_LABELS } from "@/lib/constants"

interface EmployeeFormProps {
  staff?: Staff | null
  orgId: string
  onSave: () => Promise<void> | void
  onClose: () => void
}

export function EmployeeForm({ staff, orgId, onSave, onClose }: EmployeeFormProps) {
  const [name, setName] = useState(staff?.name ?? "")
  const [phone, setPhone] = useState(staff?.phone ?? "")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<Staff["role"]>(staff?.role ?? "cashier")
  const [active, setActive] = useState(staff?.active ?? true)
  const [photoPath, setPhotoPath] = useState(staff?.photo_path ?? "")
  const [saving, setSaving] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const fileRef = useRef<HTMLInputElement | null>(null)
  const preview = useImageSrc(photoPath)
  const isCreate = !staff

  async function handlePhoto(file: File) {
    setPhotoBusy(true)
    setError("")
    try {
      setPhotoPath(await uploadStaffImage(file, orgId))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not attach that photo")
    } finally {
      setPhotoBusy(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError("Name is required")
      return
    }
    setSaving(true)
    setError("")
    try {
      await upsertStaff(staff?.id ?? null, {
        name: name.trim(),
        phone: phone.trim(),
        photo_path: photoPath || null,
        role,
        active,
      })
      await onSave()

      const addr = email.trim()
      if (isCreate && addr) {
        try {
          const result = await inviteEmployee(orgId, addr, role)
          if (!result.emailed && result.invite_url) {
            setNotice(`Invite link for ${addr}: ${result.invite_url}`)
            return
          }
        } catch (inviteError) {
          setNotice(
            `${name.trim()} was added, but the invite failed: ${
              inviteError instanceof Error ? inviteError.message : String(inviteError)
            }`,
          )
          return
        }
      }
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the employee. Try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">{isCreate ? "New staff" : "Edit staff"}</h2>
          <button onClick={onClose} className="btn-ghost p-1">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sidebar-hover">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-muted">
                  {name
                    .split(" ")
                    .map((w) => w[0])
                    .filter(Boolean)
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "?"}
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="text-xs text-muted">
                {photoPath ? "Photo attached to this member." : "A photo helps the team recognise each other."}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={photoBusy}
                  className="btn-secondary text-xs"
                >
                  <ImagePlus size={14} />
                  {photoBusy ? "Uploading..." : "Choose photo"}
                </button>
                {photoPath && (
                  <button
                    type="button"
                    onClick={() => setPhotoPath("")}
                    className="btn-ghost text-xs text-danger"
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ""
                  if (f) void handlePhoto(f)
                }}
              />
            </div>
          </div>

          <div>
            <label className="label">Full Name</label>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError("")
              }}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="label">Phone (optional)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-field"
              placeholder="024 000 0000"
              inputMode="tel"
            />
          </div>
          {isCreate && (
            <div>
              <label className="label">Email (cloud invite, optional)</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="teammate@shop.com"
                inputMode="email"
              />
              <p className="mt-1 text-xs text-muted">
                Sends a ScalPOS invite so this teammate can sync and sign in from their own device.
              </p>
            </div>
          )}
          {notice && (
            <div className="rounded-lg border border-border bg-sidebar-hover px-4 py-3 text-sm text-foreground">
              {notice}
            </div>
          )}
          <div>
            <label className="label">Role</label>
            <div className="grid grid-cols-3 gap-1 rounded-lg border border-border p-1">
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={
                    role === r
                      ? "rounded-md bg-primary px-2 py-1.5 text-xs font-semibold text-white"
                      : "rounded-md px-2 py-1.5 text-xs font-medium text-muted hover:bg-sidebar-hover"
                  }
                >
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Active</p>
              <p className="text-xs text-muted">Can sign in and use the register</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={active}
              onClick={() => setActive(!active)}
              className={
                active
                  ? "relative h-7 w-12 shrink-0 rounded-full bg-primary transition-colors"
                  : "relative h-7 w-12 shrink-0 rounded-full bg-sidebar-hover transition-colors"
              }
            >
              <span
                className={
                  active
                    ? "absolute left-6 top-1 h-5 w-5 rounded-full bg-white transition-all"
                    : "absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-all"
                }
              />
            </button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            {notice ? (
              <button type="button" onClick={onClose} className="btn-primary">
                Done
              </button>
            ) : (
              <>
                <button type="button" onClick={onClose} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving || photoBusy} className="btn-primary">
                  {saving ? "Saving..." : isCreate ? "Add staff" : "Save changes"}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
