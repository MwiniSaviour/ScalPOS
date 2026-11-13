import type {
  Category,
  Customer,
  Modifier,
  OrderPayStatus,
  OrderStatus,
  Pack,
  PaymentMethod,
  Product,
  ProductBatch,
  PurchaseOrder,
  PurchaseOrderLine,
  Recipe,
  RecipeLine,
  RestaurantTable,
  Sale,
  SaleItem,
  ShopSettings,
  Staff,
  StockMove,
  Supplier,
  Variant,
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
  prescription_only: boolean | null
  controlled: boolean | null
  packs: unknown
  modifiers: unknown
  variants: unknown
  unavailable_until: string | null
  created_at: string
  updated_at: string
}

type ProductBatchRow = {
  id: string
  product_id: string
  batch_no: string | null
  expiry: string | null
  qty: number | string | null
  cost: number | string | null
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

type PurchaseOrderRow = {
  id: string
  supplier_id: string | null
  status: string | null
  lines: unknown
  total: number | string | null
  received_at: string | null
  created_at: string
  updated_at: string
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
  variant_id: string | null
  variant_name: string | null
  modifier_ids: unknown
  modifier_names: unknown
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
  order_type: string | null
  table_id: string | null
  ticket_status: string | null
  completed_at: string | null
  created_at: string
  customer?: CustomerRow | CustomerRow[] | null
}

type SettingsRow = {
  business_type: string | null
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
  prescription_only?: boolean
  controlled?: boolean
  packs?: Pack[] | null
  modifiers?: Modifier[] | null
  variants?: Variant[] | null
  unavailable_until?: string | null
}

export interface ProductBatchInput {
  batch_no?: string
  expiry?: string | null
  qty?: number
  cost?: number
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

export interface PurchaseOrderInput {
  supplier_id?: string | null
  lines?: PurchaseOrderLine[]
  status?: PurchaseOrder["status"]
}

export interface StaffInput {
  name: string
  role: "owner" | "supervisor" | "cashier"
  phone?: string | null
  photo_path?: string | null
  active?: boolean
}

export const PRODUCT_SELECT = "*, category:categories(id,name,color)"

const BATCH_SELECT = "id,product_id,batch_no,expiry,qty,cost"

/**
 * The packs column is jsonb, so it can hold anything: a bare array, an object
 * or nothing at all. Only well-formed entries are kept, and a product with no
 * usable pack reads back as null.
 */
function mapPacks(raw: unknown): Pack[] | null {
  if (!Array.isArray(raw)) return null
  const packs: Pack[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue
    const pack = entry as { name?: unknown; factor?: unknown }
    const name = typeof pack.name === "string" ? pack.name.trim() : ""
    const factor = Number(pack.factor)
    if (!name || !Number.isFinite(factor) || factor <= 0) continue
    packs.push({ name, factor })
  }
  return packs.length > 0 ? packs : null
}

/**
 * Modifiers / variants are jsonb arrays of { id, name, priceDelta } written by
 * the mobile app. Only well-formed entries are kept; an empty or malformed
 * array reads back as null.
 */
function mapOptions(raw: unknown): { id: string; name: string; priceDelta: number }[] | null {
  if (!Array.isArray(raw)) return null
  const out: { id: string; name: string; priceDelta: number }[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue
    const opt = entry as { id?: unknown; name?: unknown; priceDelta?: unknown }
    const id = typeof opt.id === "string" ? opt.id.trim() : ""
    const name = typeof opt.name === "string" ? opt.name.trim() : ""
    if (!id || !name) continue
    const delta = Number(opt.priceDelta ?? 0)
    out.push({ id, name, priceDelta: Number.isFinite(delta) ? delta : 0 })
  }
  return out.length > 0 ? out : null
}

function mapStringList(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null
  const out = raw.filter((v): v is string => typeof v === "string" && v !== "")
  return out.length > 0 ? out : null
}

function mapBatch(row: ProductBatchRow): ProductBatch {
  return {
    id: row.id,
    product_id: row.product_id,
    batch_no: row.batch_no ?? "",
    expiry: row.expiry ?? null,
    qty: Number(row.qty ?? 0),
    cost: Number(row.cost ?? 0),
  }
}

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
    prescription_only: row.prescription_only === true,
    controlled: row.controlled === true,
    packs: mapPacks(row.packs),
    modifiers: mapOptions(row.modifiers) as Modifier[] | null,
    variants: mapOptions(row.variants) as Variant[] | null,
    unavailable_until: row.unavailable_until ?? null,
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

/**
 * The lines of a purchase order live in one jsonb column, so anything can be
 * sitting in there. Only well-formed lines are kept.
 */
function mapPurchaseOrderLines(raw: unknown): PurchaseOrderLine[] {
  if (!Array.isArray(raw)) return []
  const lines: PurchaseOrderLine[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue
    const line = entry as { productId?: unknown; packName?: unknown; qty?: unknown; unitCost?: unknown }
    const productId = typeof line.productId === "string" ? line.productId.trim() : ""
    if (!productId) continue
    const qty = Number(line.qty)
    const unitCost = Number(line.unitCost)
    const packName = typeof line.packName === "string" ? line.packName.trim() : ""
    lines.push({
      productId,
      packName: packName || null,
      qty: Number.isFinite(qty) ? qty : 0,
      unitCost: Number.isFinite(unitCost) ? unitCost : 0,
    })
  }
  return lines
}

/** The jsonb shape the column stores: only these four keys, nothing else. */
function purchaseOrderLinesPayload(lines: PurchaseOrderLine[]): PurchaseOrderLine[] {
  return lines.map((line) => ({
    productId: line.productId,
    packName: line.packName && line.packName.trim() ? line.packName.trim() : null,
    qty: Number.isFinite(Number(line.qty)) ? Number(line.qty) : 0,
    unitCost: Number.isFinite(Number(line.unitCost)) ? Number(line.unitCost) : 0,
  }))
}

function purchaseOrderTotal(lines: PurchaseOrderLine[]): number {
  const total = lines.reduce((sum, line) => sum + Number(line.qty) * Number(line.unitCost), 0)
  return Math.round(total * 100) / 100
}

export function mapPurchaseOrder(row: PurchaseOrderRow): PurchaseOrder {
  const status = row.status === "sent" || row.status === "received" ? row.status : "draft"
  return {
    id: row.id,
    supplier_id: row.supplier_id ?? null,
    status,
    lines: mapPurchaseOrderLines(row.lines),
    total: Number(row.total ?? 0),
    received_at: row.received_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
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
    variant_id: row.variant_id ?? null,
    variant_name: row.variant_name ?? null,
    modifier_ids: mapStringList(row.modifier_ids),
    modifier_names: mapStringList(row.modifier_names),
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
    order_type: row.order_type ?? null,
    table_id: row.table_id ?? null,
    ticket_status: (row.ticket_status === "queued" || row.ticket_status === "preparing"
      || row.ticket_status === "ready" || row.ticket_status === "served"
      ? row.ticket_status : null) as Sale["ticket_status"],
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
    .select("id,order_id,product_id,name,image_path,qty,price,cost,position,created_at,variant_id,variant_name,modifier_ids,modifier_names")
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
    prescription_only: input.prescription_only === true,
    controlled: input.controlled === true,
    packs: input.packs ?? null,
    modifiers: input.modifiers ?? null,
    variants: input.variants ?? null,
    unavailable_until: input.unavailable_until ?? null,
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
  if (input.prescription_only !== undefined) patch.prescription_only = input.prescription_only
  if (input.controlled !== undefined) patch.controlled = input.controlled
  if (input.packs !== undefined) patch.packs = input.packs
  if (input.modifiers !== undefined) patch.modifiers = input.modifiers
  if (input.variants !== undefined) patch.variants = input.variants
  if (input.unavailable_until !== undefined) patch.unavailable_until = input.unavailable_until
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

// ---------- restaurant ----------

type RestaurantTableRow = {
  id: string
  name: string | null
  seats: number | string | null
  created_at: string
}

function mapTable(row: RestaurantTableRow): RestaurantTable {
  return {
    id: row.id,
    name: row.name ?? "",
    seats: Number(row.seats ?? 4),
    created_at: row.created_at,
  }
}

export async function fetchRestaurantTables(): Promise<RestaurantTable[]> {
  const { data, error } = await db()
    .from("restaurant_tables")
    .select("id,name,seats,created_at")
    .eq("org_id", orgId())
    .is("deleted_at", null)
    .order("name", { ascending: true })
  const rows = check<RestaurantTableRow[]>(data, error)
  return rows.map(mapTable)
}

export async function createRestaurantTable(input: { name: string; seats: number }): Promise<RestaurantTable> {
  const { data, error } = await db()
    .from("restaurant_tables")
    .insert({ org_id: orgId(), local_id: makeLocalId(), name: input.name, seats: input.seats })
    .select("id,name,seats,created_at")
    .single()
  const row = check<RestaurantTableRow>(data, error)
  return mapTable(row)
}

export async function updateRestaurantTable(
  id: string,
  input: { name?: string; seats?: number },
): Promise<RestaurantTable> {
  const patch: Row = { updated_at: new Date().toISOString() }
  if (input.name !== undefined) patch.name = input.name
  if (input.seats !== undefined) patch.seats = input.seats
  const { data, error } = await db()
    .from("restaurant_tables")
    .update(patch)
    .eq("org_id", orgId())
    .eq("id", id)
    .select("id,name,seats,created_at")
    .single()
  const row = check<RestaurantTableRow>(data, error)
  return mapTable(row)
}

export async function deleteRestaurantTable(id: string): Promise<void> {
  const { error } = await db()
    .from("restaurant_tables")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("org_id", orgId())
    .eq("id", id)
  check(null, error as unknown as { message: string } | null)
}

type RecipeRow = {
  id: string
  product_id: string
  lines: unknown
  created_at: string
}

function mapRecipe(row: RecipeRow): Recipe {
  const raw = Array.isArray(row.lines) ? row.lines : []
  const lines: RecipeLine[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue
    const l = entry as { ingredientProductId?: unknown; qty?: unknown; wastePct?: unknown }
    const ingredientProductId = typeof l.ingredientProductId === "string" ? l.ingredientProductId : ""
    const qty = Number(l.qty)
    if (!ingredientProductId || !Number.isFinite(qty) || qty <= 0) continue
    const waste = Number(l.wastePct ?? 0)
    lines.push({
      ingredientProductId,
      qty,
      ...(Number.isFinite(waste) && waste > 0 ? { wastePct: waste } : {}),
    })
  }
  return { id: row.id, product_id: row.product_id, lines, created_at: row.created_at }
}

export async function fetchRecipes(productIds?: string[]): Promise<Recipe[]> {
  let query = db()
    .from("recipes")
    .select("id,product_id,lines,created_at")
    .eq("org_id", orgId())
    .is("deleted_at", null)
  if (productIds && productIds.length > 0) query = query.in("product_id", productIds)
  const { data, error } = await query
  const rows = check<RecipeRow[]>(data, error)
  return rows.map(mapRecipe)
}

export async function upsertRecipe(productId: string, lines: RecipeLine[]): Promise<Recipe> {
  const payload = lines
    .filter((l) => l.ingredientProductId && l.qty > 0)
    .map((l) => ({
      ingredientProductId: l.ingredientProductId,
      qty: l.qty,
      ...(l.wastePct ? { wastePct: l.wastePct } : {}),
    }))
  const existing = await db()
    .from("recipes")
    .select("id")
    .eq("org_id", orgId())
    .eq("product_id", productId)
    .is("deleted_at", null)
    .maybeSingle()
  if (existing.error) throw new Error(existing.error.message)
  if (payload.length === 0) {
    if (existing.data?.id) {
      await db()
        .from("recipes")
        .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("org_id", orgId())
        .eq("id", existing.data.id)
    }
    return { id: existing.data?.id ?? "", product_id: productId, lines: [], created_at: "" }
  }
  const { data, error } = existing.data?.id
    ? await db()
        .from("recipes")
        .update({ lines: payload, updated_at: new Date().toISOString() })
        .eq("org_id", orgId())
        .eq("id", existing.data.id)
        .select("id,product_id,lines,created_at")
        .single()
    : await db()
        .from("recipes")
        .insert({ org_id: orgId(), product_id: productId, lines: payload })
        .select("id,product_id,lines,created_at")
        .single()
  const row = check<RecipeRow>(data, error)
  return mapRecipe(row)
}

/** Advance a kitchen ticket: queued → preparing → ready → served. */
export async function setTicketStatus(orderId: string, status: Sale["ticket_status"]): Promise<void> {
  const { error } = await db()
    .from("orders")
    .update({ ticket_status: status, updated_at: new Date().toISOString() })
    .eq("org_id", orgId())
    .eq("id", orderId)
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
    business_type: row.business_type ?? "retail",
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

/* ------------------------------- purchase orders ------------------------------- */

export async function fetchPurchaseOrders(): Promise<PurchaseOrder[]> {
  const { data, error } = await db()
    .from("purchase_orders")
    .select("*")
    .eq("org_id", orgId())
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
  const rows = check<PurchaseOrderRow[]>(data, error)
  return rows.map(mapPurchaseOrder)
}

export async function fetchPurchaseOrder(id: string): Promise<PurchaseOrder | null> {
  const { data, error } = await db()
    .from("purchase_orders")
    .select("*")
    .eq("org_id", orgId())
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle()
  const row = check<PurchaseOrderRow | null>(data, error)
  return row ? mapPurchaseOrder(row) : null
}

export async function upsertPurchaseOrder(
  id: string | null,
  input: PurchaseOrderInput,
): Promise<PurchaseOrder> {
  const patch: Row = {}
  if (input.supplier_id !== undefined) patch.supplier_id = input.supplier_id
  if (input.status !== undefined) patch.status = input.status
  if (input.lines !== undefined) {
    const lines = purchaseOrderLinesPayload(input.lines)
    patch.lines = lines
    patch.total = purchaseOrderTotal(lines)
  }
  if (id) {
    const { data, error } = await db()
      .from("purchase_orders")
      .update(patch)
      .eq("org_id", orgId())
      .eq("id", id)
      .select("*")
      .single()
    return mapPurchaseOrder(check<PurchaseOrderRow>(data, error))
  }
  const payload: Row = { org_id: orgId(), ...patch }
  payload.status = input.status ?? "draft"
  payload.lines = patch.lines ?? []
  payload.total = patch.total ?? 0
  const { data, error } = await db().from("purchase_orders").insert(payload).select("*").single()
  return mapPurchaseOrder(check<PurchaseOrderRow>(data, error))
}

export async function deletePurchaseOrder(id: string): Promise<void> {
  const { error } = await db()
    .from("purchase_orders")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("org_id", orgId())
    .eq("id", id)
  check(null, error as unknown as { message: string } | null)
}

/**
 * Receiving adds the ordered units to stock. A line's qty is in base units —
 * the pack name on the line is only a label, it never multiplies the qty.
 *
 * A product that owns batches receives the units in a new batch, so its stock
 * stays the sum of its batches; every other product gets the units added to
 * its own stock. Either way the movement is written once, as a purchase.
 *
 * The stock is moved first and the order is only marked received afterwards,
 * so a line that fails outright (a cashier without the owner role, a product
 * that has gone) leaves the order open instead of marking stock that never
 * arrived. Once a single line has landed the order is marked, so its units
 * can never be applied a second time.
 */
export async function receivePurchaseOrder(id: string): Promise<PurchaseOrder> {
  const po = await fetchPurchaseOrder(id)
  if (!po) throw new Error("Purchase order not found")
  if (po.status === "received") throw new Error("This purchase order was already received")

  const failed: string[] = []
  let applied = 0
  let applicable = 0
  for (const line of po.lines) {
    const qty = Number(line.qty)
    if (!Number.isFinite(qty) || qty <= 0) continue
    applicable += 1
    let product: Product | null = null
    try {
      product = await fetchProduct(line.productId)
      if (!product) throw new Error("the product is no longer in the catalogue")
      const batches = await fetchProductBatches(line.productId)
      if (batches.length > 0) {
        await createProductBatch(
          line.productId,
          {
            batch_no: line.packName ?? "",
            expiry: null,
            qty,
            cost: line.unitCost > 0 ? line.unitCost : product.cost_price ?? 0,
          },
          po.id,
        )
      } else {
        await adjustStock(line.productId, qty, "purchase", po.id)
      }
      applied += 1
      if (line.unitCost > 0) await updateProduct(line.productId, { cost_price: line.unitCost })
    } catch (err) {
      failed.push(`${product?.name ?? line.productId}: ${err instanceof Error ? err.message : "failed"}`)
    }
  }
  if (applicable > 0 && applied === 0) {
    throw new Error(`Nothing was received — ${failed.join("; ")}`)
  }

  const { data, error } = await db()
    .from("purchase_orders")
    .update({ status: "received", received_at: new Date().toISOString() })
    .eq("org_id", orgId())
    .eq("id", id)
    .select("*")
    .single()
  const received = mapPurchaseOrder(check<PurchaseOrderRow>(data, error))
  if (failed.length > 0) {
    throw new Error(`Some lines could not be received — ${failed.join("; ")}`)
  }
  return received
}

/* ------------------------------- pharmacy batches ------------------------------- */

function sortBatches(batches: ProductBatch[]): ProductBatch[] {
  return batches.slice().sort((a, b) => {
    const ea = a.expiry ?? "9999-12-31"
    const eb = b.expiry ?? "9999-12-31"
    if (ea !== eb) return ea < eb ? -1 : 1
    return a.batch_no.localeCompare(b.batch_no)
  })
}

/** The expiry column is a date: only a plain YYYY-MM-DD is stored. */
function normalizeExpiry(expiry: string | null | undefined): string | null {
  if (!expiry) return null
  const trimmed = expiry.trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null
}

export async function fetchProductBatches(productId: string): Promise<ProductBatch[]> {
  const { data, error } = await db()
    .from("product_batches")
    .select(BATCH_SELECT)
    .eq("org_id", orgId())
    .eq("product_id", productId)
    .is("deleted_at", null)
  const rows = check<ProductBatchRow[]>(data, error)
  return sortBatches(rows.map(mapBatch))
}

export async function fetchProductBatchesForProducts(productIds: string[]): Promise<ProductBatch[]> {
  if (productIds.length === 0) return []
  const { data, error } = await db()
    .from("product_batches")
    .select(BATCH_SELECT)
    .eq("org_id", orgId())
    .in("product_id", productIds)
    .is("deleted_at", null)
  const rows = check<ProductBatchRow[]>(data, error)
  return rows.map(mapBatch)
}

export async function createProductBatch(
  productId: string,
  input: ProductBatchInput,
  moveRef?: string,
): Promise<ProductBatch> {
  const payload: Row = {
    org_id: orgId(),
    local_id: makeLocalId(),
    product_id: productId,
    batch_no: input.batch_no ?? "",
    expiry: normalizeExpiry(input.expiry),
    qty: input.qty ?? 0,
    cost: input.cost ?? 0,
  }
  const { data, error } = await db()
    .from("product_batches")
    .insert(payload)
    .select(BATCH_SELECT)
    .single()
  const batch = mapBatch(check<ProductBatchRow>(data, error))
  await applyDerivedStock(batch.product_id, batch.id, batch.batch_no, true, moveRef)
  return batch
}

export async function updateProductBatch(id: string, input: ProductBatchInput): Promise<ProductBatch> {
  const patch: Row = {}
  if (input.batch_no !== undefined) patch.batch_no = input.batch_no
  if (input.expiry !== undefined) patch.expiry = normalizeExpiry(input.expiry)
  if (input.qty !== undefined) patch.qty = input.qty
  if (input.cost !== undefined) patch.cost = input.cost
  if (Object.keys(patch).length === 0) {
    const { data, error } = await db()
      .from("product_batches")
      .select(BATCH_SELECT)
      .eq("org_id", orgId())
      .eq("id", id)
      .maybeSingle()
    return mapBatch(check<ProductBatchRow>(data, error))
  }
  const { data, error } = await db()
    .from("product_batches")
    .update(patch)
    .eq("org_id", orgId())
    .eq("id", id)
    .select(BATCH_SELECT)
    .single()
  const batch = mapBatch(check<ProductBatchRow>(data, error))
  await applyDerivedStock(batch.product_id, batch.id, batch.batch_no, false)
  return batch
}

export async function deleteProductBatch(id: string): Promise<void> {
  const { data, error } = await db()
    .from("product_batches")
    .select(BATCH_SELECT)
    .eq("org_id", orgId())
    .eq("id", id)
    .maybeSingle()
  const row = check<ProductBatchRow | null>(data, error)
  const { error: deleteError } = await db()
    .from("product_batches")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("org_id", orgId())
    .eq("id", id)
  check(null, deleteError as unknown as { message: string } | null)
  if (row) await applyDerivedStock(row.product_id, row.id, row.batch_no ?? "", false)
}

/**
 * A batched product's stock is derived: it is the sum of its batches. After any
 * batch change the product row is brought back in line, and the change is
 * written as a stock move so the history still explains the number.
 */
async function applyDerivedStock(
  productId: string,
  batchId: string,
  batchNo: string,
  isNew: boolean,
  moveRef?: string,
): Promise<void> {
  const batches = await fetchProductBatches(productId)
  const derived = batches.reduce((sum, b) => sum + b.qty, 0)
  const { data, error } = await db()
    .from("products")
    .select("stock")
    .eq("org_id", orgId())
    .eq("id", productId)
    .maybeSingle()
  check<ProductRow | null>(data, error)
  const previous = Number((data as { stock?: number | string } | null)?.stock ?? 0)
  const delta = derived - previous
  if (delta === 0) return
  const { error: updateError } = await db()
    .from("products")
    .update({ stock: derived, updated_at: new Date().toISOString() })
    .eq("org_id", orgId())
    .eq("id", productId)
  check(null, updateError as unknown as { message: string } | null)
  // the move column holds whole units, so a fractional change has no move to write
  const moveQty = Math.round(delta)
  if (moveQty === 0) return
  const { error: moveError } = await db()
    .from("stock_moves")
    .insert({
      org_id: orgId(),
      product_id: productId,
      qty: moveQty,
      reason: isNew && delta > 0 ? "purchase" : "adjust",
      ref: moveRef ?? (batchNo ? `batch ${batchNo}` : "batch"),
      batch_id: batchId,
    })
  check(null, moveError as unknown as { message: string } | null)
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
