import { createDemoOrg, getSupabase } from "@/lib/supabase/client"
import { clearDemoOrg, readDemoOrg, setDemoOrg } from "@/lib/auth/org"

const PREFIX = "DEMO-"

type Row = Record<string, string | number | null>

function db(): NonNullable<ReturnType<typeof getSupabase>> {
  const client = getSupabase()
  if (!client) throw new Error("Supabase is not configured")
  return client
}

function check<T>(data: unknown, error: { message: string } | null): T {
  if (error) throw new Error(error.message)
  return data as T
}

const CATEGORIES = [
  { key: "elec", name: "Demo · Electronics", color: "#2563eb" },
  { key: "groc", name: "Demo · Groceries", color: "#059669" },
  { key: "home", name: "Demo · Home & Kitchen", color: "#d97706" },
  { key: "cloth", name: "Demo · Clothing", color: "#7c3aed" },
  { key: "care", name: "Demo · Personal Care", color: "#e11d48" },
]

// The demo mirrors the mobile demo catalogue so both platforms show the same
// shop — every product carries the photo the mobile app ships, so the tiles
// are real pictures instead of placeholder icons.
const PRODUCTS = [
  { key: "earbuds", category: "elec", name: "Demo wireless earbuds", price: 85, cost: 55, stock: 42, image: "/products/earbuds.jpg" },
  { key: "charger", category: "elec", name: "Demo phone charger 20W", price: 45, cost: 28, stock: 96, image: "/products/charger.jpg" },
  { key: "powerbank", category: "elec", name: "Demo power bank 10,000mAh", price: 120, cost: 85, stock: 27, image: "/products/powerbank.jpg" },
  { key: "cable", category: "elec", name: "Demo USB-C cable", price: 15, cost: 8, stock: 140, image: "/products/usbcable.jpg" },
  { key: "rice", category: "groc", name: "Demo rice 5kg", price: 120, cost: 95, stock: 39, image: "/products/rice.jpg" },
  { key: "oil", category: "groc", name: "Demo cooking oil 1L", price: 32, cost: 25, stock: 58, image: "/products/oil.jpg" },
  { key: "noodles", category: "groc", name: "Demo instant noodles 70g", price: 3.5, cost: 2.2, stock: 240, image: "/products/noodles.jpg" },
  { key: "sugar", category: "groc", name: "Demo sugar 1kg", price: 16, cost: 12, stock: 8, image: "/products/sugar.jpg" },
  { key: "mug", category: "home", name: "Demo coffee mug", price: 25, cost: 15, stock: 64, image: "/products/mug.jpg" },
  { key: "towel", category: "home", name: "Demo kitchen towel", price: 12, cost: 8, stock: 90, image: "/products/towel.jpg" },
  { key: "detergent", category: "home", name: "Demo laundry detergent 1kg", price: 22, cost: 17.5, stock: 25, image: "/products/detergent.jpg" },
  { key: "jeans", category: "cloth", name: "Demo denim jeans", price: 180, cost: 120, stock: 6, image: "/products/jeans.jpg" },
  { key: "socks", category: "cloth", name: "Demo sports socks 3-pack", price: 15, cost: 9, stock: 92, image: "/products/socks.jpg" },
  { key: "soap", category: "care", name: "Demo bathing soap 125g", price: 10, cost: 6.5, stock: 130, image: "/products/soap.jpg" },
]

const CUSTOMERS = [
  { key: "ama", name: "Demo customer · Ama Mensah", phone: "024 000 0001" },
  { key: "kofi", name: "Demo customer · Kofi Boateng", phone: "020 000 0002" },
  { key: "akosua", name: "Demo customer · Akosua Frimpong", phone: "055 000 0003" },
]

const ORDER_SPECS: { daysAgo: number; items: [string, number][]; method: "cash" | "momo" | "card"; customer?: string; credit?: boolean }[] = [
  { daysAgo: 29, items: [["rice", 1], ["oil", 1]], method: "cash" },
  { daysAgo: 27, items: [["noodles", 6]], method: "momo" },
  { daysAgo: 24, items: [["earbuds", 2], ["towel", 1]], method: "cash", customer: "ama" },
  { daysAgo: 21, items: [["charger", 1]], method: "momo" },
  { daysAgo: 19, items: [["detergent", 2], ["sugar", 3]], method: "cash" },
  { daysAgo: 16, items: [["rice", 2]], method: "card", customer: "kofi" },
  { daysAgo: 14, items: [["noodles", 12], ["earbuds", 3]], method: "momo" },
  { daysAgo: 11, items: [["oil", 2], ["socks", 2]], method: "cash", customer: "akosua" },
  { daysAgo: 9, items: [["powerbank", 2], ["noodles", 4]], method: "cash" },
  { daysAgo: 7, items: [["rice", 1], ["detergent", 1]], method: "momo", customer: "ama" },
  { daysAgo: 5, items: [["cable", 4]], method: "cash" },
  { daysAgo: 3, items: [["oil", 1], ["sugar", 2], ["soap", 1]], method: "momo", customer: "kofi" },
  { daysAgo: 2, items: [["noodles", 8], ["charger", 1]], method: "cash" },
  { daysAgo: 1, items: [["rice", 1], ["earbuds", 2]], method: "cash", customer: "ama", credit: true },
  { daysAgo: 0, items: [["detergent", 1], ["noodles", 4]], method: "momo", customer: "akosua", credit: true },
]

export async function isDemoModeActive(userId: string): Promise<boolean> {
  return Boolean(readDemoOrg(userId))
}

export async function enterDemoMode(userId: string): Promise<void> {
  db()
  const existing = readDemoOrg(userId)
  if (existing) {
    setDemoOrg(userId, existing)
    if (await hasDemoData(existing)) return
    await seedDemoData(existing)
    return
  }
  // No token argument: createDemoOrg's parameter is the Supabase JWT, not the
  // Clerk user id — passing userId sent "Bearer user_…" and bootstrap-org
  // answered 401 "invalid session".
  const orgId = await createDemoOrg()
  setDemoOrg(userId, orgId)
  if (await hasDemoData(orgId)) return
  await seedDemoData(orgId)
}

export function exitDemoMode(userId: string): void {
  clearDemoOrg(userId)
}

async function hasDemoData(orgId: string): Promise<boolean> {
  // The marker is the first catalogue entry: when the catalogue changes, the
  // marker moves and the demo re-seeds itself.
  const { count, error } = await db()
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("local_id", `${PREFIX}PROD-${PRODUCTS[0].key}`)
    .is("deleted_at", null)
  if (error) throw new Error(error.message)
  return (count ?? 0) > 0
}

/**
 * Demo rows from an older catalogue are retired instead of deleted: the RLS
 * delete policies reject client deletes, but a soft delete hides the row from
 * every query that filters on `deleted_at`.
 */
async function retireStaleDemoRows(client: ReturnType<typeof db>, orgId: string): Promise<void> {
  const now = new Date().toISOString()
  const keepProducts = PRODUCTS.map((p) => `"${PREFIX}PROD-${p.key}"`).join(",")
  const keepCategories = CATEGORIES.map((c) => `"${PREFIX}CAT-${c.key}"`).join(",")
  const { error: productError } = await client
    .from("products")
    .update({ deleted_at: now, active: false, updated_at: now })
    .eq("org_id", orgId)
    .like("local_id", `${PREFIX}PROD-%`)
    .is("deleted_at", null)
    .not("local_id", "in", `(${keepProducts})`)
  if (productError) throw new Error(productError.message)
  const { error: categoryError } = await client
    .from("categories")
    .update({ deleted_at: now, updated_at: now })
    .eq("org_id", orgId)
    .like("local_id", `${PREFIX}CAT-%`)
    .is("deleted_at", null)
    .not("local_id", "in", `(${keepCategories})`)
  if (categoryError) throw new Error(categoryError.message)
}

async function seedDemoData(orgId: string): Promise<void> {
  const client = db()
  const org = orgId

  const { data: catRows, error: catError } = await client
    .from("categories")
    .upsert(
      CATEGORIES.map((c) => ({
        org_id: org,
        local_id: `${PREFIX}CAT-${c.key}`,
        name: c.name,
        color: c.color,
      })),
      { onConflict: "org_id,local_id" },
    )
    .select("id, local_id")
  const cats = check<Row[]>(catRows, catError)
  const catId = new Map(cats.map((c) => [String(c.local_id).replace(`${PREFIX}CAT-`, ""), c.id as string]))

  const { data: prodRows, error: prodError } = await client
    .from("products")
    .upsert(
      PRODUCTS.map((p, i) => ({
        org_id: org,
        local_id: `${PREFIX}PROD-${p.key}`,
        name: p.name,
        sku: `${PREFIX}SKU-${String(i + 1).padStart(3, "0")}`,
        barcode: "",
        price: p.price,
        cost: p.cost,
        stock: p.stock,
        category_id: catId.get(p.category) ?? null,
        image_path: p.image,
        description: "Sample product created by the demo data loader. Remove it from Demo data when you're done.",
        unit: "pcs",
        low_stock_at: 5,
        active: true,
      })),
      { onConflict: "org_id,local_id" },
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
    .upsert(
      CUSTOMERS.map((c) => ({
        org_id: org,
        local_id: `${PREFIX}CUST-${c.key}`,
        name: c.name,
        phone: c.phone,
        address: "",
        note: "Sample customer created by the demo data loader.",
      })),
      { onConflict: "org_id,local_id" },
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
        image: PRODUCTS.find((d) => d.key === key)?.image ?? "",
      }
    })
    const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0)
    const total = Math.round(subtotal * 100) / 100
    const payments = spec.credit ? [] : [{ method: spec.method, amount: total }]
    const { data: orderRows, error: orderError } = await client
      .from("orders")
      .upsert({
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
      }, { onConflict: "org_id,local_id" })
      .select("id")
      .single()
    const order = check<Row>(orderRows, orderError)
    const { error: itemError } = await client.from("order_items").upsert(
      lines.map((l, position) => ({
        org_id: org,
        order_id: order.id,
        product_id: l.product.id,
        name: l.name,
        image_path: l.image,
        qty: l.qty,
        price: l.price,
        cost: l.cost,
        position,
        created_at: created.toISOString(),
        updated_at: created.toISOString(),
        local_id: `${PREFIX}ITEM-${String(seq).padStart(3, "0")}-${position + 1}`,
      })),
      { onConflict: "org_id,local_id" },
    )
    if (itemError) throw new Error(itemError.message)
  }

  await retireStaleDemoRows(client, org)
}

