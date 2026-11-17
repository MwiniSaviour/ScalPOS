"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Plus,
  Trash2,
  UserRound,
  X,
} from "lucide-react"
import {
  createAppointment,
  deleteAppointment,
  fetchAppointments,
  fetchCustomers,
  fetchProducts,
  fetchStaff,
  placeSale,
  updateAppointment,
  withCommissions,
} from "@/lib/api/data"
import { useRealtime } from "@/lib/api/realtime"
import { hasFeature } from "@/lib/features"
import { useBusinessType } from "@/lib/terms"
import { cn, formatDate } from "@/lib/utils"
import { fmtMoney } from "@/lib/money"
import type {
  Appointment,
  AppointmentServiceLine,
  AppointmentStatus,
  Customer,
  Product,
  Staff,
} from "@/lib/types"

const STATUSES: AppointmentStatus[] = [
  "booked", "arrived", "in-service", "done", "no-show", "cancelled",
]

const STATUS_BADGE: Record<AppointmentStatus, string> = {
  booked: "bg-info-bg text-info",
  arrived: "bg-warn-bg text-warn",
  "in-service": "bg-primary-light text-primary",
  done: "bg-success-bg text-success",
  "no-show": "bg-danger-bg text-danger",
  cancelled: "bg-sidebar-hover text-muted",
}

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  booked: "Booked",
  arrived: "Arrived",
  "in-service": "In service",
  done: "Done",
  "no-show": "No-show",
  cancelled: "Cancelled",
}

const NEXT_STATUS: Partial<Record<AppointmentStatus, AppointmentStatus>> = {
  booked: "arrived",
  arrived: "in-service",
  "in-service": "done",
}

function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function shiftDay(key: string, days: number): string {
  const d = new Date(`${key}T12:00:00`)
  d.setDate(d.getDate() + days)
  return dayKey(d)
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
}

function toInputValue(key: string, time: string): string {
  return `${key}T${time}`
}

function splitInput(value: string): { key: string; time: string } {
  const [key, time] = value.split("T")
  return { key: key ?? dayKey(new Date()), time: time ?? "09:00" }
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export default function AppointmentsPage() {
  const businessType = useBusinessType()
  const enabled = hasFeature(businessType, "appointments")

  const [day, setDay] = useState(() => dayKey(new Date()))
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Appointment | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [appts, custs, prods, staffList] = await Promise.all([
        fetchAppointments(), fetchCustomers(), fetchProducts(), fetchStaff(),
      ])
      setAppointments(appts)
      setCustomers(custs)
      setProducts(prods.filter((p) => p.kind === "service"))
      setStaff(staffList)
      setError(null)
    } catch {
      setError("Failed to load appointments. Check your connection.")
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

  const services = useMemo(() => products.filter((p) => p.active), [products])
  const dayAppointments = useMemo(
    () =>
      appointments
        .filter((a) => dayKey(new Date(a.start)) === day)
        .sort((a, b) => a.start.localeCompare(b.start)),
    [appointments, day],
  )
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const a of dayAppointments) c[a.status] = (c[a.status] ?? 0) + 1
    return c
  }, [dayAppointments])

  async function advance(a: Appointment, status: AppointmentStatus) {
    setBusyId(a.id)
    setError(null)
    try {
      await updateAppointment(a.id, { status })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the appointment")
    } finally {
      setBusyId(null)
    }
  }

  async function remove(a: Appointment) {
    if (!window.confirm(`Delete the ${timeOf(a.start)} appointment?`)) return
    setBusyId(a.id)
    try {
      await deleteAppointment(a.id)
      await load()
    } catch {
      setError("Could not delete the appointment")
    } finally {
      setBusyId(null)
    }
  }

  /**
   * Convert a visit to a paid-in-full order. Commission stamping lives in the
   * data mapper so no commission rules are duplicated here.
   */
  async function convert(a: Appointment) {
    if (a.service_lines.length === 0) {
      setError("This booking has no services to charge for")
      return
    }
    setBusyId(a.id)
    setError(null)
    try {
      const items = withCommissions(
        a.service_lines.map((line) => {
          const product = products.find((p) => p.id === line.productId)
          const serviceStaffId = a.staff_id
          return {
            product_id: line.productId,
            name: product?.name ?? "Service",
            image_path: product?.image ?? null,
            qty: line.qty ?? 1,
            price: line.price,
            kind: "service" as const,
            ...(serviceStaffId ? { service_staff_id: serviceStaffId } : {}),
          }
        }),
        staff,
      )
      const total = Math.round(items.reduce((s, i) => s + i.qty * i.price, 0) * 100) / 100
      await placeSale({
        customer_id: a.customer_id,
        items,
        payments: [{ method: "cash", amount: total }],
        subtotal: total,
        discount: 0,
        tax: 0,
        total,
        staff_id: a.staff_id,
        appointment_id: a.id,
      })
      await updateAppointment(a.id, { status: "done" })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not convert the appointment to a sale")
    } finally {
      setBusyId(null)
    }
  }

  if (!enabled) {
    return (
      <div className="space-y-6">
        <div className="page-header"><h1 className="page-title">Appointments</h1></div>
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <CalendarDays size={32} className="mx-auto text-muted" />
          <p className="mt-3 font-semibold text-foreground">Salon only</p>
          <p className="mt-1 text-sm text-muted">
            Appointments are available when this shop is set up as a salon.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Appointments</h1>
          <p className="page-subtitle">The salon&rsquo;s day at a glance</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="btn-primary"
        >
          <Plus size={16} />
          New booking
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-danger-bg bg-danger-bg px-4 py-3 text-sm text-danger">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setDay(shiftDay(day, -1))} className="btn-ghost p-2" title="Previous day">
            <ChevronLeft size={18} />
          </button>
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value || day)}
            className="input-field w-auto"
            aria-label="Appointment day"
          />
          <button onClick={() => setDay(shiftDay(day, 1))} className="btn-ghost p-2" title="Next day">
            <ChevronRight size={18} />
          </button>
          <button onClick={() => setDay(dayKey(new Date()))} className="btn-ghost text-xs">
            Today
          </button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {STATUSES.filter((s) => (counts[s] ?? 0) > 0).map((s) => (
            <span key={s} className={cn("rounded-full px-2.5 py-1 font-medium", STATUS_BADGE[s])}>
              {STATUS_LABEL[s]} {counts[s]}
            </span>
          ))}
          {dayAppointments.length === 0 && <span className="text-muted">No bookings this day</span>}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading appointments...
        </div>
      ) : dayAppointments.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
          <p className="font-medium text-foreground">Nothing booked yet</p>
          <p className="mt-1 text-sm text-muted">Add the day&rsquo;s first appointment to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dayAppointments.map((a) => {
            const customer = customers.find((c) => c.id === a.customer_id)
            const stylist = staff.find((s) => s.id === a.staff_id)
            const total = a.service_lines.reduce((s, l) => s + l.price * (l.qty ?? 1), 0)
            const lineNames = a.service_lines
              .map((l) => {
                const p = products.find((x) => x.id === l.productId)
                const qty = l.qty ?? 1
                return `${p?.name ?? "Service"}${qty > 1 ? ` × ${qty}` : ""}`
              })
              .join(", ")
            const next = NEXT_STATUS[a.status]
            return (
              <div key={a.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="w-16 shrink-0">
                    <p className="tabnum text-lg font-bold text-foreground">{timeOf(a.start)}</p>
                    <p className="flex items-center gap-1 text-xs text-muted">
                      <Clock size={12} /> {a.duration_min}m
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {customer ? customer.name : "Walk-in"}
                      </span>
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_BADGE[a.status])}>
                        {STATUS_LABEL[a.status]}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted">{lineNames || "No services"}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted">
                      {stylist && (
                        <span className="flex items-center gap-1">
                          <UserRound size={13} /> {stylist.name}
                        </span>
                      )}
                      <span className="tabnum">{fmtMoney(total)}</span>
                      {a.notes && <span className="truncate">{a.notes}</span>}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {next && (
                      <button
                        disabled={busyId === a.id}
                        onClick={() => void advance(a, next)}
                        className="btn-secondary text-xs"
                      >
                        <Check size={14} /> {STATUS_LABEL[next]}
                      </button>
                    )}
                    {(a.status === "arrived" || a.status === "in-service" || a.status === "done") && (
                      <button
                        disabled={busyId === a.id || a.service_lines.length === 0}
                        onClick={() => void convert(a)}
                        className="btn-primary text-xs"
                        title={a.service_lines.length === 0 ? "Add a service first" : "Create a paid-in-full sale"}
                      >
                        Convert to sale
                      </button>
                    )}
                    {a.status !== "cancelled" && a.status !== "done" && (
                      <button
                        disabled={busyId === a.id}
                        onClick={() => void advance(a, "cancelled")}
                        className="btn-ghost text-xs text-danger"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      disabled={busyId === a.id}
                      onClick={() => { setEditing(a); setShowForm(true) }}
                      className="btn-ghost text-xs"
                    >
                      Edit
                    </button>
                    <button
                      disabled={busyId === a.id}
                      onClick={() => void remove(a)}
                      className="btn-ghost p-2 text-danger"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <AppointmentForm
          appointment={editing}
          customers={customers}
          services={services}
          staff={staff}
          day={day}
          onSave={load}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

function AppointmentForm({
  appointment,
  customers,
  services,
  staff,
  day,
  onSave,
  onClose,
}: {
  appointment: Appointment | null
  customers: Customer[]
  services: Product[]
  staff: Staff[]
  day: string
  onSave: () => Promise<void> | void
  onClose: () => void
}) {
  const isCreate = !appointment
  const [customerId, setCustomerId] = useState(appointment?.customer_id ?? "")
  const [staffId, setStaffId] = useState(appointment?.staff_id ?? "")
  const [start, setStart] = useState(() =>
    appointment ? toInputValue(dayKey(new Date(appointment.start)), timeOf(appointment.start)) : `${day}T09:00`,
  )
  const [notes, setNotes] = useState(appointment?.notes ?? "")
  const [lines, setLines] = useState<AppointmentServiceLine[]>(appointment?.service_lines ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const duration = lines.reduce((sum, line) => {
    const p = services.find((s) => s.id === line.productId)
    return sum + (p?.duration_min ?? 30) * (line.qty ?? 1)
  }, 0)

  function toggleService(product: Product) {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id)
      if (existing) return prev.filter((l) => l.productId !== product.id)
      return [...prev, { productId: product.id, price: product.price, qty: 1 }]
    })
  }

  function setQty(productId: string, qty: number) {
    setLines((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, qty: Math.max(1, qty) } : l)),
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (lines.length === 0) {
      setError("Pick at least one service")
      return
    }
    setSaving(true)
    setError("")
    try {
      const { key, time } = splitInput(start)
      const iso = new Date(`${key}T${time}:00`).toISOString()
      const payload = {
        customer_id: customerId || null,
        staff_id: staffId || null,
        service_lines: lines,
        start: iso,
        duration_min: duration || 30,
        notes: notes.trim(),
      }
      if (isCreate) await createAppointment(payload)
      else await updateAppointment(appointment!.id, payload)
      await onSave()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the appointment")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">
            {isCreate ? "New appointment" : "Edit appointment"}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Client</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input-field">
              <option value="">Walk-in</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Stylist</label>
            <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="input-field">
              <option value="">Not assigned</option>
              {staff.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date &amp; time</label>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="label">Services</label>
            <div className="space-y-2 rounded-lg border border-border p-3">
              {services.length === 0 && (
                <p className="text-sm text-muted">Add service products in Inventory first.</p>
              )}
              {services.map((p) => {
                const line = lines.find((l) => l.productId === p.id)
                return (
                  <div key={p.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!line}
                      onChange={() => toggleService(p)}
                      aria-label={`Book ${p.name}`}
                    />
                    <span className="min-w-0 flex-1 truncate text-foreground">{p.name}</span>
                    <span className="tabnum text-xs text-muted">{fmtMoney(p.price)}</span>
                    {line && (
                      <input
                        type="number"
                        min={1}
                        value={line.qty ?? 1}
                        onChange={(e) => setQty(p.id, Number(e.target.value))}
                        className="input-field w-16 px-2 py-1 text-center"
                        aria-label={`Quantity of ${p.name}`}
                      />
                    )}
                  </div>
                )
              })}
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted">
              <Clock size={12} /> Estimated duration {duration} min
            </p>
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field min-h-20"
              placeholder="Anything the stylist should know"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving..." : isCreate ? "Book appointment" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
