import type {
  Category,
  Customer,
  OrderPayStatus,
  OrderStatus,
  PaymentMethod,
  Product,
  Sale,
  SaleItem,
  ShopSettings,
  Staff,
  StockMove,
  Supplier,
} from "@/lib/types"
import { getSupabase } from "@/lib/supabase/client"
import { getOrgId } from "@/lib/auth/org"
import { freshToken } from "@/lib/auth/session"

type Row = Record<string, unknown>

type CategoryRef = { id: string; name: string; color: string | null }

type ProductRow = {
  id: string
  name: string
  sku: string | null
  barcode: string | null
  price: number | string
  cost: number | string | null
  stock: number | string
  category_id: string | null
  category?: CategoryRef | CategoryRef[] | null
  image_path: string | null
  description: string | null
  unit: string | null
  low_stock_at: number | string | null
  active: boolean | null
  created_at: string
  updated_at: string
}

type CategoryRow = { id: string; name: string; color: string | null; created_at: string }

type CustomerRow = {
  id: string
  name: string
  phone: string | null
  address: string | null
  note: string | null
  created_at: string
}

type SupplierRow = {
  id: string
  name: string
  contact_person: string | null
  email: string | null
  phone: string | null
  address: string | null
  created_at: string
}

type StaffRow = {
  id: string
  name: string
  role?: string | null
  phone: string | null
  photo_path: string | null
  active: boolean | null
  created_at: string
}

type SaleItemRow = {
  id: string
  order_id: string
  product_id: string | null
  name: string | null
  qty: number | string
  price: number | string
}

type PaymentRow = { method?: string; amount?: number | string }

type SaleRow = {
  id: string
  local_id: string | null
  customer_id: string | null
  subtotal: number | string | null
  tax: number | string | null
  discount: number | string | null
  total: number | string | null
  payments: PaymentRow[] | null
  pay_status: string | null
  status: string | null
  completed_at: string | null
  created_at: string
  customer?: CustomerRow | CustomerRow[] | null
}

type SettingsRow = {
  shop_name: string | null
  address: string | null
  phone: string | null
  owner_name: string | null
  momo_number: string | null
  momo_network: string | null
  tax_inclusive: boolean | null
  tax_rate: number | string | null
  receipt_footer: string | null
  theme: string | null
  next_order_no: number | string | null
}

function check<T>(data: unknown, error: { message: string } | null): T {
  if (error) throw new Error(error.message)
  return data as T
}

export function makeLocalId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function db(): NonNullable<ReturnType<typeof getSupabase>> {
  const client = getSupabase()
  if (!client) throw new Error("Supabase is not configured")
  return client
}

function orgId(): string {
  return getOrgId()
}

export interface CategoryInput {
  name: string
  color?: string | null
}

export interface ProductInput {
  name: string
  sku: string
  barcode?: string | null
  price: number
  cost_price?: number | null
  stock?: number
  category_id?: string | null
  image?: string | null
  description?: string | null
  unit?: string
  low_stock_at?: number
  active?: boolean
}

export interface CustomerInput {
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  note?: string | null
}

export interface SupplierInput {
  name: string
  contact_person?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
}

export interface StaffInput {
  name: string
  role: "owner" | "supervisor" | "cashier"
  phone?: string | null
  photo_path?: string | null
  active?: boolean
}

export const PRODUCT_SELECT = "*, category:categories(id,name,color)"

function mapRow(row: ProductRow): Product {
  const cat = row.category
  const category = Array.isArray(cat) ? cat[0] : cat
  return {
    id: row.id,
    name: row.name,
    sku: row.sku ?? "",
    barcode: row.barcode ?? null,
    price: Number(row.price ?? 0),
    cost_price: row.cost == null ? null : Number(row.cost),
    stock: Number(row.stock ?? 0),
    category_id: row.category_id ?? null,
    category: category
      ? {
          id: category.id,
          name: category.name,
          color: category.color ?? null,
          description: null,
          image: null,
          created_at: "",
        }
      : undefined,
    image: row.image_path ?? null,
    description: row.description ?? null,
    unit: row.unit ?? "pcs",
    low_stock_at: Number(row.low_stock_at ?? 5),
    active: row.active !== false,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    color: row.color ?? null,
    description: null,
    image: null,
    created_at: row.created_at,
  }
}

export function mapCustomer(row: CustomerRow, totalPurchases = 0): Customer {
  return {
    id: row.id,
    name: row.name,
    email: null,
    phone: row.phone ?? null,
    address: row.address ?? null,
    note: row.note ?? null,
    created_at: row.created_at,
    total_purchases: totalPurchases,
  }
}

export function mapSupplier(row: SupplierRow): Supplier {
  return {
    id: row.id,
    name: row.name,
    contact_person: row.contact_person ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    address: row.address ?? null,
    created_at: row.created_at,
  }
}

export function mapStaff(row: StaffRow): Staff {
  return {
    id: row.id,
    name: row.name,
    role: row.role === "owner" || row.role === "supervisor" ? row.role : "cashier",
    phone: row.phone ?? null,
    photo_path: row.photo_path ?? null,
    active: row.active !== false,
    created_at: row.created_at,
  }
}

function mapSaleItem(row: SaleItemRow): SaleItem {
  const qty = Number(row.qty ?? 0)
  const price = Number(row.price ?? 0)
  return {
    id: row.id,
    sale_id: row.order_id,
    product_id: row.product_id ?? null,
    product_name: row.name ?? "",
    quantity: qty,
    unit_price: price,
    subtotal: qty * price,
  }
}

export function mapSale(row: SaleRow, items?: SaleItem[]): Sale {
  const payments = Array.isArray(row.payments)
    ? row.payments.map((p) => ({
        method: (p.method ?? "cash") as PaymentMethod,
        amount: Number(p.amount ?? 0),
      }))
    : []
  const method = payments[0]?.method ?? "cash"
  const payStatus = (row.pay_status === "paid" || row.pay_status === "partial"
    || row.pay_status === "unpaid" || row.pay_status === "refunded"
    ? row.pay_status : "pending") as OrderPayStatus
  return {
    id: row.id,
    invoice_no: row.local_id ?? "",
    customer_id: row.customer_id ?? null,
    employee_id: null,
    subtotal: Number(row.subtotal ?? 0),
    tax: Number(row.tax ?? 0),
    discount: Number(row.discount ?? 0),
    total: Number(row.total ?? 0),
    payment_method: method,
    payment_status: row.pay_status === "paid" ? "paid" : "pending",
    status: (row.status === "completed" || row.status === "refunded" ? row.status : "pending") as OrderStatus,
    pay_status: payStatus,
    payments,
    sale_date: row.completed_at ?? row.created_at,
    created_at: row.created_at,
    items: items,
  }
}

function orderSelect(): string {
  return "*, customer:customers(id,name,phone,address,note,created_at)"
}

function mapOrderWithCustomer(row: SaleRow, items?: SaleItem[]): Sale {
  const sale = mapSale(row, items)
  const cust = row.customer
  const customer = Array.isArray(cust) ? cust[0] : cust
  if (customer) {
    sale.customer = mapCustomer(customer)
    sale.customer_id = customer.id
  }
  return sale
}

async function itemsForOrders(orderIds: string[]): Promise<Map<string, SaleItem[]>> {
  const map = new Map<string, SaleItem[]>()
  if (orderIds.length === 0) return map
  const { data, error } = await db()
    .from("order_items")
    .select("id,order_id,product_id,name,image_path,qty,price,cost,position,created_at")
    .in("order_id", orderIds)
    .order("position", { ascending: true })
  if (error) throw new Error(error.message)
  for (const row of data as SaleItemRow[]) {
    const list = map.get(row.order_id) ?? []
    list.push(mapSaleItem(row))
    map.set(row.order_id, list)
  }
  return map
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await db()
    .from("categories")
    .select("*")
    .eq("org_id", orgId())
    .is("deleted_at", null)
    .order("name")
  const rows = check<CategoryRow[]>(data, error)
  return rows.map(mapCategory)
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await db()
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("org_id", orgId())
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
  const rows = check<ProductRow[]>(data, error)
  return rows.map(mapRow)
}

export async function fetchProduct(id: string): Promise<Product | null> {
  const { data, error } = await db()
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("org_id", orgId())
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle()
  const row = check<ProductRow | null>(data, error)
  return row ? mapRow(row) : null
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const payload: Row = {
    org_id: orgId(),
    local_id: makeLocalId(),
    name: input.name,
    sku: input.sku || makeLocalId().slice(0, 8).toUpperCase(),
    barcode: input.barcode ?? null,
    price: input.price,
    cost: input.cost_price ?? 0,
    stock: 0,
    category_id: input.category_id ?? null,
    image_path: input.image ?? null,
    description: input.description ?? null,
    unit: input.unit ?? "pcs",
    low_stock_at: input.low_stock_at ?? 5,
    active: input.active !== false,
  }
  const { data, error } = await db().from("products").insert(payload).select(PRODUCT_SELECT).single()
  const row = check<ProductRow>(data, error)
  const stock = input.stock ?? 0
  if (stock > 0) {
    await adjustStock(row.id, stock, "opening")
    row.stock = stock
  }
  return mapRow(row)
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<Product> {
  const patch: Row = {}
  if (input.name !== undefined) patch.name = input.name
  if (input.sku !== undefined) patch.sku = input.sku
  if (input.barcode !== undefined) patch.barcode = input.barcode
  if (input.price !== undefined) patch.price = input.price
  if (input.cost_price !== undefined) patch.cost = input.cost_price
  if (input.category_id !== undefined) patch.category_id = input.category_id
  if (input.image !== undefined) patch.image_path = input.image
  if (input.description !== undefined) patch.description = input.description
  if (input.unit !== undefined) patch.unit = input.unit
  if (input.low_stock_at !== undefined) patch.low_stock_at = input.low_stock_at
  if (input.active !== undefined) patch.active = input.active
  const client = db()
  if (Object.keys(patch).length > 0) {
    const { data, error } = await client
      .from("products")
      .update(patch)
      .eq("org_id", orgId())
      .eq("id", id)
      .select(PRODUCT_SELECT)
      .single()
    const row = check<ProductRow>(data, error)
    return mapRow(row)
  }
  const existing = await fetchProduct(id)
  if (!existing) throw new Error("Product not found")
  return existing
}

export async function adjustStock(productId: string, delta: number, reason: string, ref?: string): Promise<void> {
  const { error } = await db().rpc("receive_stock_tx", {
    p_org: orgId(),
    p_product_id: productId,
    p_delta: delta,
    p_reason: reason,
    p_ref: ref ?? null,
  })
  check(null, error as unknown as { message: string } | null)
}

export async function fetchStockMoves(productId: string): Promise<StockMove[]> {
  const { data, error } = await db()
    .from("stock_moves")
    .select("id,product_id,qty,reason,ref,occurred_at")
    .eq("org_id", orgId())
    .eq("product_id", productId)
    .is("deleted_at", null)
    .order("occurred_at", { ascending: false })
  const rows = check<Row[]>(data, error)
  return rows.map((r) => ({
    id: String(r.id),
    product_id: String(r.product_id),
    qty: Number(r.qty ?? 0),
    reason: (["purchase", "sale", "adjust", "damage", "return", "count", "opening"].includes(String(r.reason))
      ? r.reason
      : "adjust") as StockMove["reason"],
    ref: typeof r.ref === "string" ? r.ref : null,
    occurred_at: String(r.occurred_at ?? r.created_at ?? new Date().toISOString()),
  }))
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await db()
    .from("products")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString(), active: false })
    .eq("org_id", orgId())
    .eq("id", id)
  check(null, error as unknown as { message: string } | null)
}

export async function createCategory(input: CategoryInput): Promise<Category> {
  const { data, error } = await db()
    .from("categories")
    .insert({ org_id: orgId(), local_id: makeLocalId(), name: input.name, color: input.color ?? null })
    .select("*")
    .single()
  const row = check<CategoryRow>(data, error)
  return mapCategory(row)
}

export async function updateCategory(id: string, input: Partial<CategoryInput>): Promise<Category> {
  const patch: Row = {}
  if (input.name !== undefined) patch.name = input.name
  if (input.color !== undefined) patch.color = input.color
  const { data, error } = await db()
    .from("categories")
    .update(patch)
    .eq("org_id", orgId())
    .eq("id", id)
    .select("*")
    .single()
  const row = check<CategoryRow>(data, error)
  return mapCategory(row)
}

export async function deleteCategory(id: string): Promise<void> {
  const client = db()
  const { error: clearError } = await client
    .from("products")
    .update({ category_id: null })
    .eq("org_id", orgId())
    .eq("category_id", id)
  check(null, clearError as unknown as { message: string } | null)
  const { error } = await client
    .from("categories")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("org_id", orgId())
    .eq("id", id)
  check(null, error as unknown as { message: string } | null)
}

export async function fetchCustomers(): Promise<Customer[]> {
  const { data, error } = await db()
    .from("customers")
    .select("*")
    .eq("org_id", orgId())
    .is("deleted_at", null)
    .order("name")
  const rows = check<CustomerRow[]>(data, error)
  const totals = await customerOrderTotals(rows.map((r) => r.id))
  return rows.map((r) => mapCustomer(r, totals.get(r.id as string) ?? 0))
}

async function customerOrderTotals(customerIds: string[]): Promise<Map<string, number>> {
  const totals = new Map<string, number>()
  if (customerIds.length === 0) return totals
  const { data, error } = await db()
    .from("orders")
    .select("customer_id,total,status")
    .eq("org_id", orgId())
    .in("customer_id", customerIds)
  if (error) throw new Error(error.message)
  for (const row of data as { customer_id: string; total: number | string | null; status: string | null }[]) {
    if (row.status === "refunded") continue
    totals.set(row.customer_id, (totals.get(row.customer_id) ?? 0) + Number(row.total ?? 0))
  }
  return totals
}

export async function fetchCustomer(id: string): Promise<Customer | null> {
  const { data, error } = await db()
    .from("customers")
    .select("*")
    .eq("org_id", orgId())
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle()
  const row = check<CustomerRow | null>(data, error)
  if (!row) return null
  const totals = await customerOrderTotals([id])
  return mapCustomer(row, totals.get(id) ?? 0)
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  const { data, error } = await db()
    .from("customers")
    .insert({
      org_id: orgId(),
      local_id: makeLocalId(),
      name: input.name,
      phone: input.phone ?? "",
      address: input.address ?? "",
      note: input.note ?? null,
    })
    .select("*")
    .single()
  const row = check<CustomerRow>(data, error)
  return mapCustomer(row, 0)
}

export async function updateCustomer(id: string, input: Partial<CustomerInput>): Promise<Customer> {
  const patch: Row = {}
  if (input.name !== undefined) patch.name = input.name
  if (input.phone !== undefined) patch.phone = input.phone
  if (input.address !== undefined) patch.address = input.address
  if (input.note !== undefined) patch.note = input.note
  const { data, error } = await db()
    .from("customers")
    .update(patch)
    .eq("org_id", orgId())
    .eq("id", id)
    .select("*")
    .single()
  const row = check<CustomerRow>(data, error)
  return mapCustomer(row, 0)
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await db()
    .from("customers")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("org_id", orgId())
    .eq("id", id)
  check(null, error as unknown as { message: string } | null)
}

export interface SaleInput {
  customer_id?: string | null
  items: { product_id: string | null; name: string; image_path?: string | null; qty: number; price: number; cost?: number }[]
  payments: { method: string; amount: number }[]
  subtotal: number
  discount: number
  tax: number
  total: number
  note?: string | null
}

export async function placeSale(input: SaleInput): Promise<Sale> {
  const client = db()
  const { data: settingsRow, error: settingsError } = await client
    .from("settings")
    .select("next_order_no")
    .eq("org_id", orgId())
    .maybeSingle()
  const settings = check<{ next_order_no?: number | string } | null>(settingsRow, settingsError as unknown as { message: string } | null)
  const nextNo = Number(settings?.next_order_no ?? 1)
  const localId = buildOrderLocalId(nextNo)
  const { data, error } = await client.rpc("place_order_tx", {
    p_org: orgId(),
    p_local_id: localId,
    p_customer_id: input.customer_id ?? null,
    p_items: input.items,
    p_payments: input.payments,
    p_discount: input.discount,
    p_tax: input.tax,
    p_note: input.note ?? null,
    p_next_order_no: nextNo + 1,
  })
  if (error) throw new Error(error.message)
  const result = data as { order?: { id?: string } }
  let fetched: SaleRow | null = null
  const select = orderSelect()
  if (result?.order?.id) {
    const res = await client.from("orders").select(select).eq("id", result.order.id).maybeSingle()
    fetched = check<SaleRow | null>(res.data, res.error as unknown as { message: string } | null)
  } else {
    const res = await client.from("orders").select(select).eq("local_id", localId).maybeSingle()
    fetched = check<SaleRow | null>(res.data, res.error as unknown as { message: string } | null)
  }
  if (!fetched) throw new Error("Order was placed but could not be read back")
  const items = await itemsForOrders([fetched.id])
  return mapOrderWithCustomer(fetched, items.get(fetched.id) ?? [])
}

export function buildOrderLocalId(nextNo: number): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `ORD-${y}${m}${d}-${String(nextNo).padStart(4, "0")}`
}

export async function fetchSales(): Promise<Sale[]> {
  const { data, error } = await db()
    .from("orders")
    .select(orderSelect())
    .eq("org_id", orgId())
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200)
  const rows = check<SaleRow[]>(data, error)
  const items = await itemsForOrders(rows.map((r) => r.id))
  return rows.map((r) => mapOrderWithCustomer(r, items.get(r.id) ?? []))
}

export async function fetchSale(id: string): Promise<Sale | null> {
  const { data, error } = await db()
    .from("orders")
    .select(orderSelect())
    .eq("org_id", orgId())
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle()
  const row = check<SaleRow | null>(data, error)
  if (!row) return null
  const items = await itemsForOrders([id])
  return mapOrderWithCustomer(row, items.get(id) ?? [])
}

export async function fetchSaleByLocalId(localId: string): Promise<Sale | null> {
  const { data, error } = await db()
    .from("orders")
    .select(orderSelect())
    .eq("org_id", orgId())
    .eq("local_id", localId)
    .is("deleted_at", null)
    .maybeSingle()
  const row = check<SaleRow | null>(data, error)
  if (!row) return null
  const items = await itemsForOrders([row.id])
  return mapOrderWithCustomer(row, items.get(row.id) ?? [])
}

export async function recordOrderPayment(
  orderId: string,
  payment: { method: PaymentMethod; amount: number },
): Promise<Sale> {
  const { data, error } = await db().from("orders").select("*").eq("id", orderId).maybeSingle()
  const row = check<SaleRow | null>(data, error)
  if (!row) throw new Error("Order not found")
  const prev = Array.isArray(row.payments) ? row.payments : []
  const payments = [...prev, payment]
  const total = Number(row.total ?? 0)
  const paid = payments.reduce((s, p) => s + (p.method === "credit" ? 0 : Number(p.amount ?? 0)), 0)
  const due = Math.max(total - paid, 0)
  const pay_status: OrderPayStatus = due <= 0.005 ? "paid" : paid > 0 ? "partial" : "unpaid"
  const status: OrderStatus =
    row.status === "refunded" ? "refunded" : due <= 0.005 ? "completed" : "pending"
  const { data: updated, error: updErr } = await db()
    .from("orders")
    .update({ payments, pay_status, status })
    .eq("id", orderId)
    .eq("org_id", orgId())
    .select("*")
    .single()
  const urow = check<SaleRow>(updated, updErr)
  const items = await itemsForOrders([orderId])
  return mapOrderWithCustomer(urow, items.get(orderId) ?? [])
}

export async function fetchSettings(): Promise<ShopSettings | null> {
  const { data, error } = await db().from("settings").select("*").eq("org_id", orgId()).maybeSingle()
  const row = check<SettingsRow | null>(data, error as unknown as { message: string } | null)
  if (!row) return null
  return mapSettings(row)
}

export function mapSettings(row: SettingsRow): ShopSettings {
  return {
    shop_name: row.shop_name ?? "",
    address: row.address ?? null,
    phone: row.phone ?? null,
    owner_name: row.owner_name ?? null,
    momo_number: row.momo_number ?? null,
    momo_network: row.momo_network ?? null,
    tax_inclusive: row.tax_inclusive === undefined ? false : Boolean(row.tax_inclusive),
    tax_rate: Number(row.tax_rate ?? 0),
    receipt_footer: row.receipt_footer ?? null,
    theme: row.theme ?? null,
    next_order_no: Number(row.next_order_no ?? 1),
  }
}

export async function updateSettings(input: Partial<ShopSettings>): Promise<ShopSettings> {
  const patch: Row = { ...input }
  delete patch.next_order_no
  const { data, error } = await db().from("settings").update(patch).eq("org_id", orgId()).select("*").single()
  const row = check<SettingsRow>(data, error)
  return mapSettings(row)
}

export async function fetchStaff(): Promise<Staff[]> {
  const { data, error } = await db()
    .from("staff")
    .select("*")
    .eq("org_id", orgId())
    .is("deleted_at", null)
    .order("created_at")
  const rows = check<StaffRow[]>(data, error)
  return rows.map(mapStaff)
}

export async function upsertStaff(id: string | null, input: StaffInput): Promise<Staff> {
  const payload: Row = {
    name: input.name.trim(),
    role: input.role,
    phone: input.phone?.trim() ?? "",
    active: input.active !== false,
  }
  if (input.photo_path !== undefined) payload.photo_path = input.photo_path ?? ""
  if (id) {
    const { data, error } = await db()
      .from("staff")
      .update(payload)
      .eq("org_id", orgId())
      .eq("id", id)
      .select("*")
      .single()
    const row = check<StaffRow>(data, error)
    return mapStaff(row)
  }
  payload.photo_path = input.photo_path ?? ""
  const { data, error } = await db()
    .from("staff")
    .insert({ org_id: orgId(), ...payload })
    .select("*")
    .single()
  const row = check<StaffRow>(data, error)
  return mapStaff(row)
}

export async function deleteStaff(id: string): Promise<void> {
  const { error } = await db()
    .from("staff")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("org_id", orgId())
    .eq("id", id)
  check(null, error as unknown as { message: string } | null)
}

export async function inviteEmployee(
  org: string,
  email: string,
  role: Staff["role"],
): Promise<{ emailed: boolean; invite_url?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  if (!url) throw new Error("Supabase is not configured")
  const token = await freshToken()
  if (!token) throw new Error("Your session expired. Sign in again.")
  const res = await fetch(`${url}/functions/v1/invite-member`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ org_id: org, email, role }),
    signal: AbortSignal.timeout(20_000),
  })
  const json = (await res.json().catch(() => ({}))) as {
    emailed?: boolean
    invite_url?: string
    error?: string
  }
  if (!res.ok) throw new Error(json.error ?? "Invite failed")
  return { emailed: json.emailed !== false, invite_url: json.invite_url }
}

export async function fetchSuppliers(): Promise<Supplier[]> {
  const { data, error } = await db()
    .from("suppliers")
    .select("*")
    .eq("org_id", orgId())
    .is("deleted_at", null)
    .order("name")
  const rows = check<SupplierRow[]>(data, error)
  return rows.map(mapSupplier)
}

export async function upsertSupplier(id: string | null, input: SupplierInput): Promise<Supplier> {
  const payload: Row = {
    name: input.name,
    contact_person: input.contact_person ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    address: input.address ?? null,
  }
  if (id) {
    const { data, error } = await db()
      .from("suppliers")
      .update(payload)
      .eq("org_id", orgId())
      .eq("id", id)
      .select("*")
      .single()
    const row = check<SupplierRow>(data, error)
    return mapSupplier(row)
  }
  const { data, error } = await db()
    .from("suppliers")
    .insert({ org_id: orgId(), ...payload })
    .select("*")
    .single()
  const row = check<SupplierRow>(data, error)
  return mapSupplier(row)
}

export async function deleteSupplier(id: string): Promise<void> {
  const { error } = await db()
    .from("suppliers")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("org_id", orgId())
    .eq("id", id)
  check(null, error as unknown as { message: string } | null)
}

export async function findProductByBarcode(barcode: string): Promise<Product | null> {
  const client = db()
  const { data, error } = await client
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("org_id", orgId())
    .eq("barcode", barcode.trim())
    .is("deleted_at", null)
    .maybeSingle()
  const row = check<ProductRow | null>(data, error)
  return row ? mapRow(row) : null
}
