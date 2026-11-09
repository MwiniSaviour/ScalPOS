import { getSupabase } from "@/lib/supabase/client"
import { getOrgId } from "@/lib/auth/org"

const PREFIX = "DEMO-"

type Row = Record<string, string | number | null>

function db(): NonNullable<ReturnType<typeof getSupabase>> {
  const client = getSupabase()
  if (!client) throw new Error("Supabase is not configured")
  return client
}

function orgId(): string {
  return getOrgId()
}

function check<T>(data: unknown, error: { message: string } | null): T {
  if (error) throw new Error(error.message)
  return data as T
}

const CATEGORIES = [
  { key: "drinks", name: "Demo · Drinks", color: "#0ea5e9" },
  { key: "provisions", name: "Demo · Provisions", color: "#22c55e" },
  { key: "household", name: "Demo · Household", color: "#f59e0b" },
]

const PRODUCTS = [
  { key: "water", category: "drinks", name: "Demo bottled water 500ml", price: 3, cost: 2, stock: 48 },
  { key: "coke", category: "drinks", name: "Demo Coca-Cola 1.5L", price: 18, cost: 14, stock: 24 },
  { key: "milo", category: "drinks", name: "Demo Milo refill 400g", price: 38, cost: 32, stock: 18 },
  { key: "rice", category: "provisions", name: "Demo rice 5kg", price: 65, cost: 55, stock: 20 },
  { key: "oil", category: "provisions", name: "Demo cooking oil 2L", price: 42, cost: 36, stock: 15 },
  { key: "detergent", category: "household", name: "Demo detergent 1kg", price: 22, cost: 17.5, stock: 25 },
  { key: "tissue", category: "household", name: "Demo toilet roll 4-pack", price: 12, cost: 9, stock: 40 },
  { key: "sachet", category: "household", name: "Demo sachet water bag", price: 5, cost: 3.5, stock: 60 },
]

const CUSTOMERS = [
  { key: "ama", name: "Demo customer · Ama Mensah", phone: "024 000 0001" },
  { key: "kofi", name: "Demo customer · Kofi Boateng", phone: "020 000 0002" },
  { key: "akosua", name: "Demo customer · Akosua Frimpong", phone: "055 000 0003" },
]

const ORDER_SPECS: { daysAgo: number; items: [string, number][]; method: "cash" | "momo" | "card"; customer?: string; credit?: boolean }[] = [
  { daysAgo: 29, items: [["rice", 1], ["oil", 1]], method: "cash" },
  { daysAgo: 27, items: [["water", 6]], method: "momo" },
  { daysAgo: 24, items: [["coke", 2], ["tissue", 1]], method: "cash", customer: "ama" },
  { daysAgo: 21, items: [["milo", 1]], method: "momo" },
  { daysAgo: 19, items: [["detergent", 2], ["sachet", 3]], method: "cash" },
  { daysAgo: 16, items: [["rice", 2]], method: "card", customer: "kofi" },
  { daysAgo: 14, items: [["water", 12], ["coke", 3]], method: "momo" },
  { daysAgo: 11, items: [["oil", 2], ["tissue", 2]], method: "cash", customer: "akosua" },
  { daysAgo: 9, items: [["milo", 2], ["water", 4]], method: "cash" },
  { daysAgo: 7, items: [["rice", 1], ["detergent", 1]], method: "momo", customer: "ama" },
  { daysAgo: 5, items: [["coke", 4]], method: "cash" },
  { daysAgo: 3, items: [["oil", 1], ["sachet", 2], ["tissue", 1]], method: "momo", customer: "kofi" },
  { daysAgo: 2, items: [["water", 8], ["milo", 1]], method: "cash" },
  { daysAgo: 1, items: [["rice", 1], ["coke", 2]], method: "cash", customer: "ama", credit: true },
  { daysAgo: 0, items: [["detergent", 1], ["water", 4]], method: "momo", customer: "akosua", credit: true },
]

export async function hasDemoData(): Promise<boolean> {
  const { count, error } = await db()
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId())
    .like("local_id", `${PREFIX}%`)
    .is("deleted_at", null)
  if (error) throw new Error(error.message)
  return (count ?? 0) > 0
}

export async function loadDemoData(): Promise<void> {
  const client = db()
  const org = orgId()
  if (await hasDemoData()) throw new Error("Demo data is already loaded")

  const { data: catRows, error: catError } = await client
    .from("categories")
    .insert(
      CATEGORIES.map((c) => ({
        org_id: org,
        local_id: `${PREFIX}CAT-${c.key}`,
        name: c.name,
        color: c.color,
      })),
    )
    .select("id, local_id")
  const cats = check<Row[]>(catRows, catError)
  const catId = new Map(cats.map((c) => [String(c.local_id).replace(`${PREFIX}CAT-`, ""), c.id as string]))

  const { data: prodRows, error: prodError } = await client
    .from("products")
    .insert(
      PRODUCTS.map((p, i) => ({
        org_id: org,
        local_id: `${PREFIX}PROD-${p.key}`,
        name: p.name,
        sku: `${PREFIX}SKU-${String(i + 1).padStart(3, "0")}`,
        barcode: null,
        price: p.price,
        cost: p.cost,
        stock: p.stock,
        category_id: catId.get(p.category) ?? null,
        image_path: null,
        description: "Sample product created by the demo data loader. Remove it from Demo data when you're done.",
        unit: "pcs",
        low_stock_at: 5,
        active: true,
      })),
    )
    .select("id, local_id")
  const prods = check<Row[]>(prodRows, prodError)
  const prodById = new Map(
    PRODUCTS.map((p) => [
      p.key,
      prods.find((r) => r.local_id === `${PREFIX}PROD-${p.key}`) as Row,
    ]),
  )

  const { data: custRows, error: custError } = await client
    .from("customers")
    .insert(
      CUSTOMERS.map((c) => ({
        org_id: org,
        local_id: `${PREFIX}CUST-${c.key}`,
        name: c.name,
        phone: c.phone,
        address: "",
        note: "Sample customer created by the demo data loader.",
      })),
    )
    .select("id, local_id")
  const custs = check<Row[]>(custRows, custError)
  const custId = new Map(custs.map((c) => [String(c.local_id).replace(`${PREFIX}CUST-`, ""), c.id as string]))

  const now = Date.now()
  let seq = 0
  for (const spec of ORDER_SPECS) {
    seq += 1
    const created = new Date(now - spec.daysAgo * 86_400_000 + (spec.daysAgo === 0 ? -3_600_000 : 0))
    const lines = spec.items.map(([key, qty]) => {
      const p = prodById.get(key)
      if (!p) throw new Error(`Missing demo product ${key}`)
      return {
        product: p,
        qty,
        price: Number(p.price ?? 0),
        cost: Number(p.cost ?? 0),
        name: String(p.name ?? ""),
      }
    })
    const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0)
    const total = Math.round(subtotal * 100) / 100
    const payments = spec.credit ? [] : [{ method: spec.method, amount: total }]
    const { data: orderRows, error: orderError } = await client
      .from("orders")
      .insert({
        org_id: org,
        customer_id: spec.customer ? custId.get(spec.customer) ?? null : null,
        subtotal: total,
        discount: 0,
        total,
        tax: 0,
        status: "completed",
        payments,
        pay_status: spec.credit ? "unpaid" : "paid",
        completed_at: created.toISOString(),
        note: "Sample sale created by the demo data loader.",
        created_at: created.toISOString(),
        updated_at: created.toISOString(),
        local_id: `${PREFIX}SALE-${String(seq).padStart(3, "0")}`,
      })
      .select("id")
      .single()
    const order = check<Row>(orderRows, orderError)
    const { error: itemError } = await client.from("order_items").insert(
      lines.map((l, position) => ({
        org_id: org,
        order_id: order.id,
        product_id: l.product.id,
        name: l.name,
        image_path: "",
        qty: l.qty,
        price: l.price,
        cost: l.cost,
        position,
        created_at: created.toISOString(),
        updated_at: created.toISOString(),
        local_id: `${PREFIX}ITEM-${String(seq).padStart(3, "0")}-${position + 1}`,
      })),
    )
    if (itemError) throw new Error(itemError.message)
  }
}

export async function clearDemoData(): Promise<void> {
  const client = db()
  const org = orgId()
  const stamp = new Date().toISOString()
  for (const table of ["orders", "order_items", "products", "customers", "categories"] as const) {
    const { error } = await client
      .from(table)
      .update({ deleted_at: stamp, updated_at: stamp })
      .eq("org_id", org)
      .like("local_id", `${PREFIX}%`)
      .is("deleted_at", null)
    if (error) throw new Error(error.message)
  }
}
