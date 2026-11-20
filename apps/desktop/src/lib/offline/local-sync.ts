"use client"

/**
 * One-way bridge from a day-one local shop into a connected cloud shop.
 * After linking an account, local records are pushed once; subsequent edits
 * go through the live data layer and the offline outbox.
 */

import { localAppointments, localCustomers, localPackages, localProducts, localStaff } from "./local-data"

const SYNCED_KEY = "desk-pos-local-synced-v1"

function syncedIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(SYNCED_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed.map(String) : [])
  } catch {
    return new Set()
  }
}

function markSynced(id: string) {
  const ids = syncedIds()
  ids.add(id)
  try { window.localStorage.setItem(SYNCED_KEY, JSON.stringify([...ids])) } catch { /* best effort */ }
}

let running = false

export async function syncLocalToCloud(): Promise<void> {
  if (running || typeof window === "undefined") return
  running = true
  try {
    const data = await import("@/lib/api/data")
    const done = syncedIds()

    for (const product of await localProducts()) {
      if (done.has(product.id)) continue
      try {
        await data.createProduct({
          name: product.name, sku: product.sku, barcode: product.barcode, price: product.price,
          cost_price: product.cost_price, stock: product.stock, category_id: product.category_id,
          image: product.image, description: product.description, unit: product.unit,
          low_stock_at: product.low_stock_at, active: product.active,
          prescription_only: product.prescription_only, controlled: product.controlled,
          packs: product.packs, modifiers: product.modifiers, variants: product.variants,
          unavailable_until: product.unavailable_until,
        })
        markSynced(product.id)
      } catch { /* keep for next attempt */ }
    }

    for (const customer of await localCustomers()) {
      if (done.has(customer.id)) continue
      try {
        await data.createCustomer({ name: customer.name, email: customer.email, phone: customer.phone, address: customer.address, note: customer.note })
        markSynced(customer.id)
      } catch { /* keep for next attempt */ }
    }

    for (const member of await localStaff()) {
      if (done.has(member.id)) continue
      try {
        await data.upsertStaff(null, {
          name: member.name, role: member.role, phone: member.phone, photo_path: member.photo_path,
          active: member.active, skills: member.skills, schedule: member.schedule,
          commission_pct: member.commission_pct,
        })
        markSynced(member.id)
      } catch { /* keep for next attempt */ }
    }

    for (const pkg of await localPackages()) {
      if (done.has(pkg.id)) continue
      try {
        await data.createPackage({ name: pkg.name, price: pkg.price, credits: pkg.credits })
        markSynced(pkg.id)
      } catch { /* keep for next attempt */ }
    }

    for (const appointment of await localAppointments()) {
      if (done.has(appointment.id)) continue
      try {
        await data.createAppointment({
          customer_id: appointment.customer_id, staff_id: appointment.staff_id,
          service_lines: appointment.service_lines, start: appointment.start,
          duration_min: appointment.duration_min, status: appointment.status,
          notes: appointment.notes,
        })
        markSynced(appointment.id)
      } catch { /* keep for next attempt */ }
    }
  } finally {
    running = false
  }
}
