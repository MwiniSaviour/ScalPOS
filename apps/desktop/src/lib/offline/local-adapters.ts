"use client";

import type { Category, Customer, Product } from "@/lib/types"
import {
  localAll, localDelete, localGet, localPut,
} from "./local-db"
import {
  type LocalAppointmentInput, type LocalStaffInput,
  localPlaceSale, localOrderId, saveLocalAppointment,
  saveLocalPackage, saveLocalStaff,
} from "./local-data"

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

export type LocalProductInput = {
  name: string; sku?: string; barcode?: string | null; price?: number; cost_price?: number | null
  stock?: number; category_id?: string | null; image?: string | null; description?: string | null
  unit?: string; low_stock_at?: number; active?: boolean; prescription_only?: boolean
  controlled?: boolean; packs?: unknown; modifiers?: unknown; variants?: unknown
  unavailable_until?: string | null; kind?: "product" | "service" | null; duration_min?: number | null
}

export type LocalCategoryInput = { name: string; color?: string | null }
export type LocalCustomerInput = {
  name: string; email?: string | null; phone?: string | null; address?: string | null; note?: string | null
}

function now() { return new Date().toISOString() }

export async function createLocalProduct(input: LocalProductInput): Promise<Product> {
  const row: Product = {
    id: uid("p"), name: input.name, sku: input.sku ?? uid("sku").slice(0, 8),
    barcode: input.barcode ?? null, price: input.price ?? 0, cost_price: input.cost_price ?? null,
    stock: input.stock ?? 0, category_id: input.category_id ?? null,
    image: input.image ?? null, description: input.description ?? null, unit: input.unit ?? "pcs",
    low_stock_at: input.low_stock_at ?? 5, active: input.active !== false,
    prescription_only: input.prescription_only === true, controlled: input.controlled === true,
    packs: (input.packs as Product["packs"]) ?? null,
    modifiers: (input.modifiers as Product["modifiers"]) ?? null,
    variants: (input.variants as Product["variants"]) ?? null,
    unavailable_until: input.unavailable_until ?? null,
    kind: input.kind ?? null, duration_min: input.duration_min ?? null,
    created_at: now(), updated_at: now(),
  }
  return localPut("products", row)
}

export async function updateLocalProduct(id: string, input: Partial<LocalProductInput>): Promise<Product> {
  const current = await localGet<Product>("products", id)
  if (!current) throw new Error("Product not found")
  const next: Product = {
    ...current,
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.sku !== undefined ? { sku: input.sku } : {}),
    ...(input.barcode !== undefined ? { barcode: input.barcode } : {}),
    ...(input.price !== undefined ? { price: input.price } : {}),
    ...(input.cost_price !== undefined ? { cost_price: input.cost_price } : {}),
    ...(input.category_id !== undefined ? { category_id: input.category_id } : {}),
    ...(input.image !== undefined ? { image: input.image } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.unit !== undefined ? { unit: input.unit } : {}),
    ...(input.low_stock_at !== undefined ? { low_stock_at: input.low_stock_at } : {}),
    ...(input.active !== undefined ? { active: input.active } : {}),
    ...(input.kind !== undefined ? { kind: input.kind } : {}),
    ...(input.duration_min !== undefined ? { duration_min: input.duration_min } : {}),
    updated_at: now(),
  }
  return localPut("products", next)
}

export async function deleteLocalProduct(id: string) { await localDelete("products", id) }

export async function createLocalCategory(input: LocalCategoryInput): Promise<Category> {
  const row: Category = {
    id: uid("cat"), name: input.name, color: input.color ?? null,
    description: null, image: null, created_at: now(),
  }
  return localPut("categories", row)
}

export async function createLocalCustomer(input: LocalCustomerInput): Promise<Customer> {
  const row: Customer = {
    id: uid("cus"), name: input.name, email: input.email ?? null,
    phone: input.phone ?? null, address: input.address ?? null, note: input.note ?? null,
    created_at: now(), total_purchases: 0, visit_notes: null, package_credits: null,
  }
  return localPut("customers", row)
}

export async function updateLocalCustomer(id: string, input: Partial<LocalCustomerInput>): Promise<Customer> {
  const current = await localGet<Customer>("customers", id)
  if (!current) throw new Error("Customer not found")
  return localPut("customers", { ...current, ...input, updated_at: now() } as Customer)
}

export async function deleteLocalCustomer(id: string) { await localDelete("customers", id) }

export async function localAdjustStock(productId: string, delta: number): Promise<void> {
  const product = await localGet<Product>("products", productId)
  if (product) await localPut("products", { ...product, stock: Math.max(0, product.stock + delta), updated_at: now() })
}

export async function localFindByBarcode(barcode: string): Promise<Product | null> {
  const products = await localAll<Product>("products")
  return products.find((p) => p.barcode === barcode) ?? null
}

export {
  localPlaceSale, localOrderId, saveLocalAppointment, saveLocalPackage,
  saveLocalStaff, localDelete as deleteLocalRow, localGet as getLocalRow,
}
export type { LocalAppointmentInput, LocalStaffInput }
