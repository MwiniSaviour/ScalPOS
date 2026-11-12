"use client";

/**
 * Cloud sync engine.
 *
 * - Local rows use short ids (p_x…, ORD-…); server PKs are uuid plus a unique
 *   `local_id` column. `idmap` keeps local→server and the reverse.
 * - Writes: a store watcher diffs snapshots and enqueues pushes; outbox table
 *   ranks keep FK order sane, but pushLocalRow may raise "parent not on
 *   server yet" — those ops retry (bounded attempts).
 * - Pull: on arm + every 30s while online, LWW merge by stamp.
 * - Realtime: postgres_changes applied immediately. Remote applies flip
 *   APPLYING so they never re-enqueue themselves.
 */

import { getSupabase } from "@/lib/api/supabase";
import { readConnection } from "@/lib/api/bootstrap";
import type { SyncConnection } from "@/lib/api/bootstrap";
import { freshToken } from "@/lib/api/session";
import type { Staff } from "@/lib/staff";
import type {
  Batch,
  BatchAllocation,
  Category,
  Customer,
  Order,
  Pack,
  Product,
  Recipe,
  RestaurantTable,
  Settings,
  StockMove,
} from "@/lib/types";
import { batchStock } from "@/lib/batches";
import { isDemoMode } from "@/lib/demo";
import { cloudAccessAllowed } from "@/lib/entitlement";
import { CLOUD_IMAGE_PREFIX, rememberCloudImage } from "@/lib/image-refs";
import { getImageBlob, isLocalImageRef } from "@/lib/image-store";
import type { Op } from "./types";
import { pullSettings } from "./settings";

const IDMAP_KEY = "nova-pos-idmap-v1";
const FIRST_PUSH_KEY = "nova-pos-first-push-v1";
const LAST_PULL_KEY = "nova-pos-last-pull";

const PULL_INTERVAL = 30_000;

const TABLES = ["categories", "products", "product_batches", "recipes", "restaurant_tables", "customers", "orders", "order_items", "stock_moves", "staff"] as const;
type Table = (typeof TABLES)[number];

type IdMap = Record<Table, Record<string, string>>;

let APPLYING = false;
let armedOrgId: string | null = null;

function emptyMap(): IdMap {
  return {
    categories: {},
    products: {},
    product_batches: {},
    recipes: {},
    restaurant_tables: {},
    customers: {},
    orders: {},
    order_items: {},
    stock_moves: {},
    staff: {},
  };
}

function readMap(): IdMap {
  if (typeof window === "undefined") return emptyMap();
  try {
    return {
      ...emptyMap(),
      ...(JSON.parse(window.localStorage.getItem(IDMAP_KEY) ?? "{}") as Partial<IdMap>),
    } as IdMap;
  } catch {
    return emptyMap();
  }
}

function writeMap(map: IdMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(IDMAP_KEY, JSON.stringify(map));
}

const n = (v: unknown, d = 0) => {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : d;
};
const ms = (v: unknown): number | null => {
  if (typeof v !== "string") return null;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
};
const iso = (t: number | null | undefined): string | null =>
  typeof t === "number" && Number.isFinite(t) ? new Date(t).toISOString() : null;

// ---- product images ---------------------------------------------------------

const IMG_EXT = (type: string): string => {
  if (type.includes("png")) return "png";
  if (type.includes("gif")) return "gif";
  if (type.includes("jpeg")) return "jpeg";
  return "webp";
};

function hexTo(hash: ArrayBuffer): string {
  return [...new Uint8Array(hash).subarray(0, 8)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Upload the locally-stored blob behind an "idb:" ref to the private
 * "product-images" bucket and return the cloud ref for it. The content hash is
 * baked into the object path so resolvers on other devices can verify a cached
 * copy against it. Throws so the outbox op retries when storage refuses the
 * write (offline, or a role without upload rights) — better to retry than
 * publish dead local refs. Returns null when the blob is no longer stored here
 * so the caller leaves any previously uploaded ref untouched.
 */
async function imageRefForRemote(
  c: NonNullable<Awaited<ReturnType<typeof sb>>>,
  org: string,
  folder: string,
  key: string,
  ref: string,
): Promise<string | null> {
  if (!ref) return "";
  if (!isLocalImageRef(ref)) return ref;
  const blob = await getImageBlob(ref);
  if (!blob) return null;
  const hash = hexTo(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()));
  const path = `${org}/${folder}/${key}/${hash}.${IMG_EXT(blob.type)}`;
  const { error } = await c
    .storage.from("product-images")
    .upload(path, blob, { contentType: blob.type, upsert: true });
  if (error) throw new Error(`image upload: ${error.message}`);
  const cloudRef = CLOUD_IMAGE_PREFIX + path;
  rememberCloudImage(cloudRef, ref);
  return cloudRef;
}

/** Point the local product row at the cloud ref so later ops stay consistent. */
async function adoptLocalImageUrl(id: string, cloudRef: string) {
  const usePos = (await import("@/lib/store")).usePos;
  APPLYING = true;
  try {
    usePos.setState((s: Store) => {
      const i = s.products.findIndex((p) => p.id === id);
      if (i < 0 || s.products[i].imageUrl === cloudRef) return s;
      const next = s.products.slice();
      next[i] = { ...next[i], imageUrl: cloudRef };
      return { ...s, products: next } as unknown as typeof s;
    });
  } finally {
    APPLYING = false;
  }
}

type RemoteRow = Record<string, unknown>;

type Store = {
  categories: Category[];
  products: Product[];
  customers: Customer[];
  orders: Order[];
  stockMoves: StockMove[];
  batches: Batch[];
  recipes: Recipe[];
  tables: RestaurantTable[];
  staff: Staff[];
  settings: Settings;
};

async function store(): Promise<Store> {
  return (await import("@/lib/store")).usePos.getState() as unknown as Store;
}

async function sb(): Promise<ReturnType<typeof getSupabase>> {
  return getSupabase((await freshToken()) ?? undefined);
}

// ---- push ------------------------------------------------------------------

export async function pushLocalRow(table: Table, localId: string): Promise<void> {
  if (!cloudAccessAllowed()) throw new Error("Cloud sync requires the Enterprise plan");
  const conn = readConnection();
  if (!conn?.org_id) throw new Error("not connected");
  const c = await sb();
  if (!c) throw new Error("server not ready");
  const s = await store();
  // A nested parent push rewrites the id map, so it is re-read after each one.
  let map = readMap();
  const org_id = conn.org_id;
  const upd = new Date().toISOString();

  const put = async (t: Table, row: RemoteRow): Promise<string> => {
    const { data, error } = await c.from(t).upsert(row, { onConflict: "org_id,local_id" }).select("id");
    if (error) throw new Error(error.message);
    if (!data?.[0]) throw new Error("no row returned");
    const remote = String(data[0].id);
    map[t][String(row.local_id)] = remote;
    writeMap(map);
    return remote;
  };

  if (table === "categories") {
    const x = s.categories.find((i) => i.id === localId);
    if (!x) throw new Error("row deleted locally");
    await put(table, {
      ...(map.categories[x.id] ? { id: map.categories[x.id] } : {}),
      org_id,
      local_id: x.id,
      name: x.name,
      color: x.color,
      updated_at: upd,
      deleted_at: null,
    });
    return;
  }

  if (table === "products") {
    const x = s.products.find((i) => i.id === localId);
    if (!x) throw new Error("row deleted locally");
    let catId = x.categoryId ? map.categories[x.categoryId] : undefined;
    if (x.categoryId && !catId) {
      if (revFrom(map.categories)[x.categoryId]) {
        // Older builds stored the server UUID on the product; it is still valid.
        catId = x.categoryId;
      } else if (s.categories.some((c) => c.id === x.categoryId)) {
        // The category exists here but has never been pushed — push it first
        // instead of leaving the product stuck forever.
        await pushLocalRow("categories", x.categoryId);
        map = readMap();
        catId = map.categories[x.categoryId];
      }
    }
    const imagePath: string | null =
      x.imageUrl && isLocalImageRef(x.imageUrl)
        ? await imageRefForRemote(c, org_id, "products", x.id, x.imageUrl)
        : (x.imageUrl ?? "");
    await put(table, {
      ...(map.products[x.id] ? { id: map.products[x.id] } : {}),
      org_id,
      local_id: x.id,
      name: x.name,
      category_id: catId ?? null,
      cost: x.cost,
      price: x.price,
      stock: x.stock,
      low_stock_at: x.lowStockAt,
      unit: x.unit,
      sku: x.sku,
      barcode: x.barcode,
      ...(imagePath === null ? {} : { image_path: imagePath }),
      description: x.description,
      active: x.active,
      prescription_only: x.prescriptionOnly ?? false,
      controlled: x.controlled ?? false,
      packs: x.packs && x.packs.length ? x.packs.map((p) => ({ name: p.name, factor: p.factor })) : null,
      modifiers: x.modifiers && x.modifiers.length
        ? x.modifiers.map((m) => ({ id: m.id, name: m.name, priceDelta: m.priceDelta }))
        : null,
      variants: x.variants && x.variants.length
        ? x.variants.map((m) => ({ id: m.id, name: m.name, priceDelta: m.priceDelta }))
        : null,
      unavailable_until: x.unavailableUntil || null,
      created_at: iso(x.createdAt) ?? undefined,
      updated_at: upd,
      deleted_at: null,
    });
    if (imagePath && imagePath !== x.imageUrl) void adoptLocalImageUrl(x.id, imagePath);
    return;
  }

  if (table === "product_batches") {
    const x = s.batches.find((i) => i.id === localId);
    if (!x) throw new Error("row deleted locally");
    let productId = map.products[x.productId];
    if (!productId && revFrom(map.products)[x.productId]) productId = x.productId;
    if (!productId && s.products.some((p) => p.id === x.productId)) {
      // The product exists here but has never been pushed — push it first so
      // the batch can point at it.
      await pushLocalRow("products", x.productId);
      map = readMap();
      productId = map.products[x.productId];
    }
    // A batch whose product is nowhere on the server cannot be attached to
    // anything; let the op retire instead of failing forever.
    if (!productId) return;
    await put(table, {
      ...(map.product_batches[x.id] ? { id: map.product_batches[x.id] } : {}),
      org_id,
      local_id: x.id,
      product_id: productId,
      batch_no: x.batchNo,
      expiry: x.expiry || null,
      qty: x.qty,
      cost: x.cost,
      created_at: iso(x.createdAt) ?? undefined,
      updated_at: upd,
      deleted_at: null,
    });
    return;
  }

  if (table === "customers") {
    const x = s.customers.find((i) => i.id === localId);
    if (!x) throw new Error("row deleted locally");
    await put(table, {
      ...(map.customers[x.id] ? { id: map.customers[x.id] } : {}),
      org_id,
      local_id: x.id,
      name: x.name,
      phone: x.phone,
      address: x.address,
      note: x.note,
      allergies: x.allergies ?? "",
      created_at: iso(x.createdAt) ?? undefined,
      updated_at: upd,
      deleted_at: null,
    });
    return;
  }

  if (table === "staff") {
    const x = s.staff.find((i) => i.id === localId);
    if (!x) throw new Error("row deleted locally");
    await put(table, {
      ...(map.staff[x.id] ? { id: map.staff[x.id] } : {}),
      org_id,
      local_id: x.id,
      name: x.name,
      role: x.role,
      phone: x.phone ?? "",
      // Local "idb:" photos stay on this device; never upload the ref.
      photo_path: x.photoId && !isLocalImageRef(x.photoId) ? x.photoId : "",
      active: x.active,
      created_at: iso(x.createdAt) ?? undefined,
      updated_at: upd,
      deleted_at: null,
    });
    return;
  }

  if (table === "recipes") {
    const x = s.recipes.find((i) => i.id === localId);
    if (!x) throw new Error("row deleted locally");
    let productId = map.products[x.productId];
    if (!productId && revFrom(map.products)[x.productId]) productId = x.productId;
    if (!productId && s.products.some((p) => p.id === x.productId)) {
      // The menu item exists here but has never been pushed — push it first so
      // the recipe can point at it.
      await pushLocalRow("products", x.productId);
      map = readMap();
      productId = map.products[x.productId];
    }
    if (!productId) return;
    await put(table, {
      ...(map.recipes[x.id] ? { id: map.recipes[x.id] } : {}),
      org_id,
      local_id: x.id,
      product_id: productId,
      lines: x.lines.map((l) => ({
        ingredientProductId: l.ingredientProductId,
        qty: l.qty,
        ...(l.wastePct === undefined ? {} : { wastePct: l.wastePct }),
      })),
      created_at: iso(x.createdAt) ?? undefined,
      updated_at: upd,
      deleted_at: null,
    });
    return;
  }

  if (table === "restaurant_tables") {
    const x = s.tables.find((i) => i.id === localId);
    if (!x) throw new Error("row deleted locally");
    await put(table, {
      ...(map.restaurant_tables[x.id] ? { id: map.restaurant_tables[x.id] } : {}),
      org_id,
      local_id: x.id,
      name: x.name,
      seats: x.seats,
      created_at: iso(x.createdAt) ?? undefined,
      updated_at: upd,
      deleted_at: null,
    });
    return;
  }

  if (table === "stock_moves") {
    const x = s.stockMoves.find((i) => i.id === localId);
    if (!x) throw new Error("row deleted locally");
    let productId = map.products[x.productId];
    if (!productId && revFrom(map.products)[x.productId]) productId = x.productId;
    if (!productId && s.products.some((p) => p.id === x.productId)) {
      await pushLocalRow("products", x.productId);
      map = readMap();
      productId = map.products[x.productId];
    }
    // A move whose product no longer exists locally cannot be attached to
    // anything on the server; let the op retire instead of failing forever.
    if (!productId) return;
    let batchId = x.batchId ? map.product_batches[x.batchId] : undefined;
    if (x.batchId && !batchId && s.batches.some((b) => b.id === x.batchId)) {
      // The batch has never been pushed — push it first so the move can point
      // at its remote row.
      await pushLocalRow("product_batches", x.batchId);
      map = readMap();
      batchId = map.product_batches[x.batchId];
    }
    await put(table, {
      ...(map.stock_moves[x.id] ? { id: map.stock_moves[x.id] } : {}),
      org_id,
      local_id: x.id,
      product_id: productId,
      batch_id: batchId ?? null,
      qty: x.qty,
      reason: x.reason,
      ref: x.ref ?? null,
      occurred_at: iso(x.t) ?? undefined,
      created_at: iso(x.t) ?? undefined,
      updated_at: upd,
      deleted_at: null,
    });
    return;
  }

  if (table === "orders") {
    const x = s.orders.find((i) => i.id === localId);
    if (!x) throw new Error("order deleted locally");
    let customerId = x.customerId ? map.customers[x.customerId] : undefined;
    if (x.customerId && !customerId) {
      if (revFrom(map.customers)[x.customerId]) customerId = x.customerId;
      else if (s.customers.some((c) => c.id === x.customerId)) {
        await pushLocalRow("customers", x.customerId);
        customerId = readMap().customers[x.customerId];
      }
    }
    const orderRemoteId = await put(table, {
      ...(map.orders[x.id] ? { id: map.orders[x.id] } : {}),
      org_id,
      local_id: x.id,
      customer_id: customerId ?? null,
      subtotal: x.subtotal,
      discount: x.discount,
      total: x.total,
      tax: x.tax ?? 0,
      status: x.status,
      payments: x.payments.map((pay) => ({ ...pay, t: iso(pay.t) })),
      pay_status: x.payStatus,
      completed_at: iso(x.completedAt ?? null),
      note: x.note ?? "",
      order_type: x.orderType ?? null,
      table_id: x.tableId ?? null,
      ticket_status: x.ticketStatus ?? null,
      created_at: iso(x.createdAt) ?? undefined,
      updated_at: upd,
      deleted_at: null,
    });
    const revProductIds = revFrom(map.products);
    for (let i = 0; i < x.items.length; i++) {
      const it = x.items[i];
      const itLocal = `${x.id}#${i}`;
      const itImagePath: string | null =
        it.imageUrl && isLocalImageRef(it.imageUrl)
          ? await imageRefForRemote(c, org_id, "items", itLocal, it.imageUrl)
          : (it.imageUrl ?? "");
      const allocations: BatchAllocation[] = [];
      for (const a of it.batchAllocations ?? []) {
        let bid = map.product_batches[a.batchId];
        if (!bid && s.batches.some((b) => b.id === a.batchId)) {
          // The allocated batch has never been pushed — push it first so the
          // allocation can name its remote row.
          await pushLocalRow("product_batches", a.batchId);
          map = readMap();
          bid = map.product_batches[a.batchId];
        }
        allocations.push({ batchId: bid ?? a.batchId, qty: a.qty });
      }
      await put("order_items", {
        ...(map.order_items[itLocal] ? { id: map.order_items[itLocal] } : {}),
        org_id,
        order_id: orderRemoteId,
        local_id: itLocal,
        product_id: map.products[it.productId] ?? (revProductIds[it.productId] ? it.productId : null),
        name: it.name,
        ...(itImagePath === null ? {} : { image_path: itImagePath }),
        qty: it.qty,
        price: it.price,
        cost: it.cost,
        position: i,
        batch_allocations: allocations.length ? allocations : null,
        pack_name: it.packName ?? null,
        prescription_ref: it.prescriptionRef ?? null,
        base_qty: it.baseQty ?? null,
        modifier_ids: it.modifierIds && it.modifierIds.length ? it.modifierIds : null,
        modifier_names: it.modifierNames && it.modifierNames.length ? it.modifierNames : null,
        variant_id: it.variantId ?? null,
        variant_name: it.variantName ?? null,
        recipe_consumption: it.recipeConsumption && it.recipeConsumption.length
          ? it.recipeConsumption.map((c) => ({
              productId: map.products[c.productId] ?? (revProductIds[c.productId] ? c.productId : c.productId),
              qty: c.qty,
            }))
          : null,
        updated_at: upd,
        deleted_at: null,
      });
    }
    return;
  }
}

export async function softDeleteRemote(table: Table, localId: string): Promise<void> {
  if (!cloudAccessAllowed()) return;
  const c = await sb();
  if (!c) throw new Error("server not ready");
  const remote = readMap()[table]?.[localId];
  if (!remote) return;
  const { error } = await c
    .from(table)
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString(), local_id: localId })
    .eq("id", remote);
  if (error) throw new Error(error.message);
}

// ---- local shapes from remote rows -----------------------------------------

function catLocal(r: RemoteRow): Category {
  return { id: String(r.local_id ?? ""), name: String(r.name ?? ""), color: String(r.color ?? "#059669") };
}

/** Packs arrive as jsonb — keep only the entries that make sense. */
function packsLocal(v: unknown): Pack[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: Pack[] = [];
  for (const p of v) {
    if (!p || typeof p !== "object") continue;
    const name = String((p as { name?: unknown }).name ?? "").trim();
    const factor = Number((p as { factor?: unknown }).factor);
    if (!name || !Number.isFinite(factor) || factor <= 0) continue;
    out.push({ name, factor });
  }
  return out;
}

/** Batch allocations arrive as jsonb and name remote batch rows. */
/** a jsonb array of strings */
function strListLocal(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((x): x is string => typeof x === "string");
  return out.length > 0 ? out : undefined;
}

/** the ingredients an order line took: [{ productId, qty }] */
function consumptionLocal(
  v: unknown,
  revProd: Record<string, string>,
): { productId: string; qty: number }[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v
    .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
    .map((c) => {
      const pid = String(c.productId ?? "");
      return { productId: revProd[pid] ?? pid, qty: n(c.qty) };
    })
    .filter((c) => c.productId !== "");
  return out.length > 0 ? out : undefined;
}

function allocLocal(v: unknown, revBatch: Record<string, string>): BatchAllocation[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: BatchAllocation[] = [];
  for (const a of v) {
    if (!a || typeof a !== "object") continue;
    const bid = String((a as { batchId?: unknown }).batchId ?? (a as { batch_id?: unknown }).batch_id ?? "");
    if (!bid) continue;
    out.push({ batchId: revBatch[bid] ?? bid, qty: n((a as { qty?: unknown }).qty) });
  }
  return out.length ? out : undefined;
}

function custLocal(r: RemoteRow): Customer {
  return {
    id: String(r.local_id ?? ""),
    name: String(r.name ?? ""),
    phone: String(r.phone ?? ""),
    address: String(r.address ?? ""),
    note: String(r.note ?? ""),
    allergies: typeof r.allergies === "string" ? r.allergies : undefined,
    createdAt: ms(r.created_at) ?? Date.now(),
  };
}

function prodLocal(r: RemoteRow, rev: Record<string, string>): Product {
  return {
    id: String(r.local_id ?? ""),
    name: String(r.name ?? ""),
    categoryId: typeof r.category_id === "string" ? rev[r.category_id] ?? r.category_id : null,
    cost: n(r.cost),
    price: n(r.price),
    stock: n(r.stock),
    lowStockAt: n(r.low_stock_at, 5),
    unit: (["pcs", "kg", "bag", "box", "ltr", "pack"].includes(String(r.unit)) ? r.unit : "pcs") as Product["unit"],
    sku: String(r.sku ?? ""),
    barcode: String(r.barcode ?? ""),
    imageUrl: String(r.image_path ?? ""),
    description: String(r.description ?? ""),
    active: r.active !== false,
    prescriptionOnly: typeof r.prescription_only === "boolean" ? r.prescription_only : undefined,
    controlled: typeof r.controlled === "boolean" ? r.controlled : undefined,
    packs: packsLocal(r.packs),
    modifiers: modifiersLocal(r.modifiers),
    variants: modifiersLocal(r.variants),
    unavailableUntil: typeof r.unavailable_until === "string" ? r.unavailable_until : undefined,
    createdAt: ms(r.created_at) ?? Date.now(),
    updatedAt: ms(r.updated_at) ?? 0,
  };
}

/** modifiers and variants share one shape: [{ id, name, priceDelta }] */
function modifiersLocal(raw: unknown): { id: string; name: string; priceDelta: number }[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw
    .filter((m): m is Record<string, unknown> => typeof m === "object" && m !== null)
    .map((m) => ({
      id: String(m.id ?? ""),
      name: String(m.name ?? ""),
      priceDelta: n(m.priceDelta),
    }))
    .filter((m) => m.id !== "" && m.name !== "");
  return out.length > 0 ? out : undefined;
}

function batchLocal(r: RemoteRow, revProd: Record<string, string>): Batch {
  return {
    id: String(r.local_id ?? ""),
    // A product that is not known here yet keeps its server uuid; the pull
    // repairs it once the product arrives.
    productId: typeof r.product_id === "string" ? revProd[r.product_id] ?? r.product_id : "",
    batchNo: String(r.batch_no ?? ""),
    expiry: typeof r.expiry === "string" ? r.expiry : "",
    qty: n(r.qty),
    cost: n(r.cost),
    createdAt: ms(r.created_at) ?? Date.now(),
    updatedAt: ms(r.updated_at) ?? 0,
  };
}

function recipeLocal(r: RemoteRow, revProd: Record<string, string>): Recipe {
  const raw = Array.isArray(r.lines) ? (r.lines as unknown[]) : [];
  const lines = raw
    .filter((l): l is Record<string, unknown> => typeof l === "object" && l !== null)
    .map((l) => ({
      ingredientProductId: String(l.ingredientProductId ?? ""),
      qty: n(l.qty),
      ...(l.wastePct === undefined || l.wastePct === null ? {} : { wastePct: n(l.wastePct) }),
    }))
    .filter((l) => l.ingredientProductId !== "");
  return {
    id: String(r.local_id ?? ""),
    // A menu item that is not known here yet keeps its server uuid; the pull
    // repairs it once the product arrives.
    productId: typeof r.product_id === "string" ? revProd[r.product_id] ?? r.product_id : "",
    lines,
    createdAt: ms(r.created_at) ?? Date.now(),
    updatedAt: ms(r.updated_at) ?? 0,
  };
}

function tableLocal(r: RemoteRow): RestaurantTable {
  return {
    id: String(r.local_id ?? ""),
    name: String(r.name ?? ""),
    seats: n(r.seats, 4),
    createdAt: ms(r.created_at) ?? Date.now(),
    updatedAt: ms(r.updated_at) ?? 0,
  };
}

function staffLocal(r: RemoteRow): Staff {
  return {
    id: String(r.local_id ?? ""),
    name: String(r.name ?? ""),
    role: (["owner", "supervisor", "cashier"].includes(String(r.role)) ? r.role : "cashier") as Staff["role"],
    phone: String(r.phone ?? ""),
    photoId: typeof r.photo_path === "string" && r.photo_path ? r.photo_path : undefined,
    active: r.active !== false,
    createdAt: ms(r.created_at) ?? Date.now(),
    updatedAt: ms(r.updated_at) ?? 0,
  };
}

function ordLocal(r: RemoteRow, map: IdMap, items: Order["items"]): Order {
  const revCust = revFrom(map.customers);
  return {
    id: String(r.local_id ?? ""),
    items,
    customerId: typeof r.customer_id === "string" ? revCust[r.customer_id] ?? r.customer_id : null,
    subtotal: n(r.subtotal),
    discount: n(r.discount),
    total: n(r.total),
    tax: n(r.tax),
    status: (["pending", "completed", "refunded"].includes(String(r.status)) ? r.status : "pending") as Order["status"],
    payments: Array.isArray(r.payments)
      ? (r.payments as Order["payments"]).map((pay) => ({
          ...pay,
          t: (typeof pay.t === "number" ? pay.t : ms(pay.t)) ?? Date.now(),
        }))
      : [],
    payStatus: (["unpaid", "partial", "paid", "refunded"].includes(String(r.pay_status)) ? r.pay_status : "unpaid") as Order["payStatus"],
    createdAt: ms(r.created_at) ?? Date.now(),
    completedAt: ms(r.completed_at),
    note: typeof r.note === "string" ? r.note : "",
    orderType: typeof r.order_type === "string" && r.order_type ? r.order_type : undefined,
    tableId: typeof r.table_id === "string" && r.table_id ? r.table_id : undefined,
    ticketStatus: (["queued", "preparing", "ready", "served"].includes(String(r.ticket_status))
      ? r.ticket_status
      : undefined) as Order["ticketStatus"],
  };
}

function mvLocal(r: RemoteRow, map: IdMap): StockMove {
  const revProd = revFrom(map.products);
  const revBatch = revFrom(map.product_batches);
  return {
    id: String(r.local_id ?? ""),
    productId: typeof r.product_id === "string" ? revProd[r.product_id] ?? "" : "",
    qty: n(r.qty),
    reason: (["purchase", "sale", "adjust", "damage", "return", "count", "opening"].includes(String(r.reason)) ? r.reason : "adjust") as StockMove["reason"],
    ref: typeof r.ref === "string" ? r.ref : undefined,
    batchId: typeof r.batch_id === "string" ? revBatch[r.batch_id] ?? undefined : undefined,
    t: ms(r.occurred_at) ?? ms(r.created_at) ?? Date.now(),
  };
}

/**
 * A batched product's stock is derived from its batches — the server's
 * products.stock is never trusted for one.
 */
function deriveStock(products: Product[], batches: Batch[]): Product[] {
  const owners = new Set(batches.map((b) => b.productId));
  if (!owners.size) return products;
  return products.map((p) => {
    if (!owners.has(p.id)) return p;
    const stock = batchStock(batches, p.id);
    return stock === p.stock ? p : { ...p, stock };
  });
}

/** Carry the pharmacy fields a remote row does not carry over from the local row. */
function carryPharmacy(pulled: Product, prev: Product | undefined): Product {
  if (!prev) return pulled;
  const next = { ...pulled };
  if (next.prescriptionOnly === undefined && prev.prescriptionOnly !== undefined) next.prescriptionOnly = prev.prescriptionOnly;
  if (next.controlled === undefined && prev.controlled !== undefined) next.controlled = prev.controlled;
  if (next.packs === undefined && prev.packs !== undefined) next.packs = prev.packs;
  if (next.modifiers === undefined && prev.modifiers !== undefined) next.modifiers = prev.modifiers;
  if (next.variants === undefined && prev.variants !== undefined) next.variants = prev.variants;
  if (next.unavailableUntil === undefined && prev.unavailableUntil !== undefined) {
    next.unavailableUntil = prev.unavailableUntil;
  }
  if (
    next.prescriptionOnly === pulled.prescriptionOnly &&
    next.controlled === pulled.controlled &&
    next.packs === pulled.packs &&
    next.modifiers === pulled.modifiers &&
    next.variants === pulled.variants &&
    next.unavailableUntil === pulled.unavailableUntil
  ) {
    return pulled;
  }
  return next;
}

/** Carry the allergies a remote row does not carry over from the local row. */
function carryAllergies(pulled: Customer, prev: Customer | undefined): Customer {
  if (!prev || pulled.allergies !== undefined || prev.allergies === undefined) return pulled;
  return { ...pulled, allergies: prev.allergies };
}

/** Carry the pharmacy fields a remote order item does not carry over. */
function carryItems(pulled: Order["items"], prev: Order["items"] | undefined): Order["items"] {
  if (!prev || !prev.length) return pulled;
  let changed = false;
  const out = pulled.map((it, i) => {
    const p = prev[i];
    if (!p) return it;
    const next = { ...it };
    if (next.batchAllocations === undefined && p.batchAllocations !== undefined) next.batchAllocations = p.batchAllocations;
    if (next.packName === undefined && p.packName !== undefined) next.packName = p.packName;
    if (next.prescriptionRef === undefined && p.prescriptionRef !== undefined) next.prescriptionRef = p.prescriptionRef;
    if (next.baseQty === undefined && p.baseQty !== undefined) next.baseQty = p.baseQty;
    if (next.batchAllocations === it.batchAllocations && next.packName === it.packName && next.prescriptionRef === it.prescriptionRef && next.baseQty === it.baseQty) return it;
    changed = true;
    return next;
  });
  return changed ? out : pulled;
}

function revFrom(m: Record<string, string>): Record<string, string> {
  const rev: Record<string, string> = {};
  for (const [loc, rem] of Object.entries(m)) rev[rem] = loc;
  return rev;
}

const remoteId = (t: Table, localId: string): string | undefined => readMap()[t]?.[localId];
function forgetId(map: IdMap, t: Table, localId: string) {
  delete map[t][localId];
  writeMap(map);
}

/** local-side stamp per table for LWW merges */
function localStamp(table: Table, row: Record<string, unknown>): number {
  switch (table) {
    case "products": return n(row.updatedAt);
    case "product_batches": return n(row.updatedAt);
    case "recipes": return n(row.updatedAt);
    case "restaurant_tables": return n(row.updatedAt);
    case "customers": return n(row.createdAt);
    case "orders": return n((row.completedAt as number | null) ?? row.createdAt);
    case "stock_moves": return n(row.t);
    case "staff": return n(row.updatedAt ?? row.createdAt);
    default: return 0;
  }
}

function remoteStamp(table: Table, r: RemoteRow): number {
  switch (table) {
    case "products": return ms(r.updated_at) ?? 0;
    case "product_batches": return ms(r.updated_at) ?? 0;
    case "recipes": return ms(r.updated_at) ?? 0;
    case "restaurant_tables": return ms(r.updated_at) ?? 0;
    case "customers": return ms(r.created_at) ?? 0;
    case "orders": return ms(r.completed_at) ?? ms(r.created_at) ?? 0;
    case "stock_moves": return ms(r.occurred_at) ?? ms(r.created_at) ?? 0;
    case "staff": return ms(r.updated_at) ?? ms(r.created_at) ?? 0;
    default: return 0;
  }
}

function registerRemoteIds(map: IdMap, rows: Partial<Record<Table, RemoteRow[]>>) {
  for (const t of TABLES) {
    for (const r of rows[t] ?? []) {
      const lid = String(r.local_id ?? "");
      if (lid && typeof r.id === "string") map[t][lid] = String(r.id);
    }
  }
  writeMap(map);
}

function mergeLocal<T extends { id: string } & Record<string, unknown>>(table: Table, cur: T[], pulled: T[]): T[] {
  const out = new Map(cur.map((x) => [x.id, x]));
  for (const r of pulled) {
    const exist = out.get(r.id);
    if (!exist) {
      out.set(r.id, r);
      continue;
    }
    if (remoteStamp(table, (r as unknown as RemoteRow)) > localStamp(table, exist as unknown as Record<string, unknown>)) {
      out.set(r.id, r);
    }
  }
  return [...out.values()];
}

// ---- pull ------------------------------------------------------------------

export async function pullAll(conn: SyncConnection): Promise<number> {
  if (isDemoMode()) return 0;
  if (!cloudAccessAllowed()) return 0;
  const c = await sb();
  if (!c) return 0;
  let count = 0;
  const rows: Partial<Record<Table, RemoteRow[]>> = {};
  for (const t of TABLES) {
    const { data, error } = await c
      .from(t)
      .select("*")
      .eq("org_id", conn.org_id)
      .is("deleted_at", null);
    if (error) {
      console.warn("sync: pull failed", t, error.message);
      continue;
    }
    rows[t] = (data ?? []) as RemoteRow[];
    count += rows[t].length;
  }

  APPLYING = true;
  try {
    const usePos = (await import("@/lib/store")).usePos;
    const map = readMap();
    registerRemoteIds(map, rows);

    const revProd = revFrom(map.products);
    const revBatch = revFrom(map.product_batches);
    const itemsByOrder = new Map<string, Order["items"]>();
    for (const r of rows.order_items ?? []) {
      const orderLocal = typeof r.local_id === "string" ? r.local_id.split("#")[0] : null;
      if (!orderLocal) continue;
      const list = itemsByOrder.get(orderLocal) ?? [];
      list.push({
        productId: typeof r.product_id === "string" ? revProd[r.product_id] ?? "" : "",
        name: String(r.name ?? ""),
        imageUrl: String(r.image_path ?? ""),
        qty: n(r.qty, 1),
        price: n(r.price),
        cost: n(r.cost),
        batchAllocations: allocLocal(r.batch_allocations, revBatch),
        packName: typeof r.pack_name === "string" && r.pack_name ? r.pack_name : undefined,
        prescriptionRef: typeof r.prescription_ref === "string" && r.prescription_ref ? r.prescription_ref : undefined,
        baseQty: r.base_qty === null || r.base_qty === undefined ? undefined : n(r.base_qty),
        modifierIds: strListLocal(r.modifier_ids),
        modifierNames: strListLocal(r.modifier_names),
        variantId: typeof r.variant_id === "string" && r.variant_id ? r.variant_id : undefined,
        variantName: typeof r.variant_name === "string" && r.variant_name ? r.variant_name : undefined,
        recipeConsumption: consumptionLocal(r.recipe_consumption, revProd),
      });
      itemsByOrder.set(orderLocal, list);
    }

    const revCat = revFrom(map.categories);
    const revCust = revFrom(map.customers);
    usePos.setState((s: Store) => {
      const categories = mergeLocal(
        "categories",
        s.categories as unknown as (Record<string, unknown> & { id: string })[],
        (rows.categories ?? []).map(catLocal) as unknown as (Record<string, unknown> & { id: string })[],
      );
      const catIds = new Set((categories as unknown as Category[]).map((c) => c.id));
      const pulledProducts = (rows.products ?? []).map((r) => prodLocal(r, revCat));
      const pulledCatByProduct = new Map(pulledProducts.map((p) => [p.id, p.categoryId]));
      const prevProducts = new Map(s.products.map((x) => [x.id, x]));
      const batches = mergeLocal(
        "product_batches",
        s.batches as unknown as (Record<string, unknown> & { id: string })[],
        (rows.product_batches ?? []).map((r) => batchLocal(r, revProd)) as unknown as (Record<string, unknown> & { id: string })[],
      ).map((b) => {
        // A batch that arrived before its product kept the server uuid; the
        // product is known now, so the batch can name it.
        const row = b as unknown as Batch;
        const mapped = revProd[row.productId];
        if (!mapped || mapped === row.productId) return b;
        return ({ ...row, productId: mapped } as unknown as typeof b);
      }) as unknown as Batch[];
      const products = deriveStock(
        mergeLocal(
          "products",
          s.products as unknown as (Record<string, unknown> & { id: string })[],
          pulledProducts as unknown as (Record<string, unknown> & { id: string })[],
        ).map((p) => {
          // Repair refs saved by older builds as raw server UUIDs or nulled out
          // by the onRemoteChange bug: prefer a valid local category id.
          const row = p as unknown as Product;
          let cid = row.categoryId;
          if (!cid || !catIds.has(cid)) {
            const fromPulled = pulledCatByProduct.get(row.id);
            if (fromPulled && catIds.has(fromPulled)) cid = fromPulled;
            else if (row.categoryId) cid = revCat[row.categoryId] ?? null;
          }
          if (cid && !catIds.has(cid)) cid = null;
          const repaired = cid === row.categoryId ? row : ({ ...row, categoryId: cid } as unknown as typeof p);
          // A remote row that predates the pharmacy columns must not wipe the
          // local values it simply does not carry.
          return carryPharmacy(repaired as unknown as Product, prevProducts.get(row.id)) as unknown as typeof p;
        }) as unknown as Product[],
        batches,
      );
      const recipes = mergeLocal(
        "recipes",
        s.recipes as unknown as (Record<string, unknown> & { id: string })[],
        (rows.recipes ?? []).map((r) => recipeLocal(r, revProd)) as unknown as (Record<string, unknown> & { id: string })[],
      ).map((r) => {
        // A recipe that arrived before its menu item kept the server uuid; the
        // product is known now, so the recipe can name it.
        const row = r as unknown as Recipe;
        const mapped = revProd[row.productId];
        if (!mapped || mapped === row.productId) return r;
        return ({ ...row, productId: mapped } as unknown as typeof r);
      }) as unknown as Recipe[];
      const tables = mergeLocal(
        "restaurant_tables",
        s.tables as unknown as (Record<string, unknown> & { id: string })[],
        (rows.restaurant_tables ?? []).map(tableLocal) as unknown as (Record<string, unknown> & { id: string })[],
      ) as unknown as RestaurantTable[];
      const prodIds = new Set(products.map((x) => x.id));
      const prevCustomers = new Map(s.customers.map((x) => [x.id, x]));
      const customers = mergeLocal(
        "customers",
        s.customers as unknown as (Record<string, unknown> & { id: string })[],
        (rows.customers ?? []).map(custLocal) as unknown as (Record<string, unknown> & { id: string })[],
      ).map((c) => {
        const row = c as unknown as Customer;
        const carried = carryAllergies(row, prevCustomers.get(row.id));
        return carried as unknown as typeof c;
      });
      const custIds = new Set((customers as unknown as Customer[]).map((c) => c.id));
      const pulledOrders = (rows.orders ?? []).map((r) => {
        const localOrder = ordLocal(r, { ...map, products: map.products }, [] as Order["items"]);
        localOrder.customerId = typeof r.customer_id === "string" ? revCust[r.customer_id] ?? r.customer_id : null;
        localOrder.items = itemsByOrder.get(String(r.local_id)) ?? [];
        return localOrder as unknown as Record<string, unknown> & { id: string };
      });
      const prevOrders = new Map(s.orders.map((o) => [o.id, o]));
      const orders = mergeLocal(
        "orders",
        s.orders as unknown as (Record<string, unknown> & { id: string })[],
        pulledOrders,
      ).map((o) => {
        const row = o as unknown as Order;
        const mapped = row.customerId
          ? custIds.has(row.customerId)
            ? row.customerId
            : revCust[row.customerId] ?? null
          : null;
        const customerId = mapped && custIds.has(mapped) ? mapped : null;
        const prev = prevOrders.get(row.id);
        const items = prev ? carryItems(row.items, prev.items) : row.items;
        if (customerId === row.customerId && items === row.items) return o;
        return ({ ...row, customerId, items } as unknown as typeof o);
      });
      const stockMoves = mergeLocal(
        "stock_moves",
        s.stockMoves as unknown as (Record<string, unknown> & { id: string })[],
        (rows.stock_moves ?? []).map((r) => mvLocal(r, map)) as unknown as (Record<string, unknown> & { id: string })[],
      ).map((m) => {
        const row = m as unknown as StockMove;
        if (!row.productId || prodIds.has(row.productId)) return m;
        const mapped = revProd[row.productId];
        return ({ ...m, productId: mapped ?? "" } as unknown as typeof m);
      });
      const staff = mergeLocal(
        "staff",
        s.staff as unknown as (Record<string, unknown> & { id: string })[],
        (rows.staff ?? []).map(staffLocal) as unknown as (Record<string, unknown> & { id: string })[],
      );
      return {
        ...s,
        categories,
        products,
        customers,
        orders,
        stockMoves,
        staff,
        batches,
        recipes,
        tables,
      } as unknown as typeof s;
    });

    // Warm the local cache for portable images in the background so other
    // devices' photos render immediately (and offline) after a pull.
    const imageRefs: string[] = [];
    for (const r of rows.products ?? []) imageRefs.push(String(r.image_path ?? ""));
    for (const r of rows.order_items ?? []) imageRefs.push(String(r.image_path ?? ""));
    void import("@/lib/cloud-images")
      .then((m) => m.warmCloudImages(imageRefs))
      .catch(() => {});

    window.localStorage.setItem(LAST_PULL_KEY, String(Date.now()));

    // Shop settings are a one-row-per-shop document, not a synced table.
    try {
      await pullSettings(conn);
    } catch (e) {
      console.warn("sync: pull settings", e);
    }
  } finally {
    APPLYING = false;
  }
  return count;
}

// ---- realtime --------------------------------------------------------------

export async function onRemoteChange(conn: SyncConnection, change: { table: string; eventType: string; new: RemoteRow | null; old: RemoteRow | null }) {
  if (!cloudAccessAllowed()) return;
  if (!TABLES.includes(change.table as Table)) return;
  const table = change.table as Table;
  const row = change.new;
  if (change.eventType === "DELETE" || row == null || row.deleted_at) return;

  const map = readMap();
  const lid = typeof row.local_id === "string" ? row.local_id : Object.entries(map[table]).find(([, r]) => r === row.id)?.[0];
  if (!lid) return;
  row.local_id = lid;
  writeMap(map);

  const revCat = revFrom(map.categories);
  const revProd = revFrom(map.products);

  APPLYING = true;
  try {
    const usePos = (await import("@/lib/store")).usePos;
    usePos.setState((s: Store) => {
      const putAt = <T extends { id: string }>(cur: T[], local: T | null): T[] => {
        if (!local) return cur;
        const out = new Map(cur.map((x) => [x.id as string, x]));
        out.set(local.id, local);
        return [...out.values()];
      };
      switch (table) {
        case "products": {
          const local = prodLocal(row, revCat);
          if (local.categoryId && !s.categories.some((c) => c.id === local.categoryId)) {
            const mapped = revCat[local.categoryId];
            if (mapped) local.categoryId = mapped;
          }
          const cur = s.products.find((x) => x.id === local.id);
          if (cur && cur.updatedAt >= local.updatedAt) return s;
          const merged = carryPharmacy(local, cur);
          // Batches that waited for this product can name it now.
          const remoteId = typeof row.id === "string" ? row.id : "";
          const batches = remoteId
            ? s.batches.map((b) => (b.productId === remoteId ? { ...b, productId: local.id } : b))
            : s.batches;
          // A batched product's stock comes from its batches, not from the
          // server's products.stock.
          return { ...s, batches, products: deriveStock(putAt(s.products, merged), batches) } as unknown as typeof s;
        }
        case "product_batches": {
          const local = batchLocal(row, revProd);
          const cur = s.batches.find((x) => x.id === local.id);
          if (cur && cur.updatedAt >= local.updatedAt) return s;
          const batches = putAt(s.batches, local);
          return { ...s, batches, products: deriveStock(s.products, batches) } as unknown as typeof s;
        }
        case "recipes": {
          const local = recipeLocal(row, revProd);
          const cur = s.recipes.find((x) => x.id === local.id);
          if (cur && cur.updatedAt >= local.updatedAt) return s;
          const recipes = putAt(s.recipes, local);
          // A recipe that arrived before its menu item kept the server uuid.
          const mapped = revProd[local.productId];
          const fixed =
            mapped && mapped !== local.productId
              ? recipes.map((r) => (r.id === local.id ? { ...r, productId: mapped } : r))
              : recipes;
          return { ...s, recipes: fixed } as unknown as typeof s;
        }
        case "restaurant_tables": {
          const local = tableLocal(row);
          const cur = s.tables.find((x) => x.id === local.id);
          if (cur && cur.updatedAt >= local.updatedAt) return s;
          return { ...s, tables: putAt(s.tables, local) } as unknown as typeof s;
        }
        case "customers": {
          const local = custLocal(row);
          const cur = s.customers.find((x) => x.id === local.id);
          return { ...s, customers: putAt(s.customers, carryAllergies(local, cur)) } as unknown as typeof s;
        }
        case "categories": {
          return { ...s, categories: putAt(s.categories, catLocal(row)) } as unknown as typeof s;
        }
        case "orders": {
          const current = s.orders.find((x) => x.id === String(row.local_id ?? ""));
          const local = ordLocal(row, map, current?.items ?? []) as Order;
          return { ...s, orders: putAt(s.orders, local) } as unknown as typeof s;
        }
        case "stock_moves": {
          return { ...s, stockMoves: putAt(s.stockMoves, mvLocal(row, map)) } as unknown as typeof s;
        }
        case "staff": {
          const local = staffLocal(row);
          const cur = s.staff.find((x) => x.id === local.id);
          if (cur && (cur.updatedAt ?? cur.createdAt) >= (local.updatedAt ?? local.createdAt)) return s;
          return { ...s, staff: putAt(s.staff, local) } as unknown as typeof s;
        }
        default:
          return s;
      }
    });
  } finally {
    APPLYING = false;
  }

  if (typeof row.image_path === "string" && row.image_path.startsWith(CLOUD_IMAGE_PREFIX)) {
    void import("@/lib/cloud-images")
      .then((m) => m.cacheCloudImage(row.image_path as string))
      .catch(() => {});
  }
}

// ---- watcher & arm ---------------------------------------------------------

function fingerprint(s: Store): Map<Table, Map<string, string>> {
  const fp = new Map<Table, Map<string, string>>();
  const set = (t: Table, entries: Array<readonly [string, string]>) => fp.set(t, new Map(entries));
  set("categories", s.categories.map((x): [string, string] => [x.id, `${x.name}|${x.color}`]));
  set(
    "products",
    s.products.map(
      (x): [string, string] => [
        x.id,
        `${x.name}|${x.categoryId}|${x.price}|${x.cost}|${x.stock}|${x.lowStockAt}|${x.unit}|${x.sku}|${x.barcode}|${x.imageUrl}|${x.description}|${x.active}|${x.prescriptionOnly ?? false}|${x.controlled ?? false}|${JSON.stringify(x.packs ?? [])}`,
      ],
    ),
  );
  set("customers", s.customers.map((x): [string, string] => [x.id, `${x.name}|${x.phone}|${x.address}|${x.note}|${x.allergies ?? ""}`]));
  set(
    "orders",
    s.orders.map(
      (x): [string, string] => [
        x.id,
        `${x.status}|${x.payStatus}|${x.payments.length}|${x.total}|${x.subtotal}|${x.discount}|${x.note ?? ""}|${x.customerId}|${x.orderType ?? ""}|${x.tableId ?? ""}|${x.ticketStatus ?? ""}|${JSON.stringify(x.items.map((i) => `${i.productId},${i.qty},${i.price},${i.packName ?? ""},${i.prescriptionRef ?? ""},${i.baseQty ?? ""},${i.variantId ?? ""},${(i.modifierIds ?? []).join("+")},${JSON.stringify(i.batchAllocations ?? [])}`))}`,
      ],
    ),
  );
  set("order_items", []);
  set("stock_moves", s.stockMoves.map((x): [string, string] => [x.id, `${x.productId}|${x.qty}|${x.reason}|${x.ref ?? ""}|${x.batchId ?? ""}`]));
  set(
    "staff",
    s.staff.map((x): [string, string] => [x.id, `${x.name}|${x.role}|${x.phone ?? ""}|${x.photoId ?? ""}|${x.active}`]),
  );
  set("product_batches", s.batches.map((x): [string, string] => [x.id, `${x.batchNo}|${x.expiry}|${x.qty}|${x.cost}`]));
  set(
    "recipes",
    s.recipes.map(
      (x): [string, string] => [
        x.id,
        `${x.productId}|${JSON.stringify(x.lines.map((l) => [l.ingredientProductId, l.qty, l.wastePct ?? 0]))}`,
      ],
    ),
  );
  set(
    "restaurant_tables",
    s.tables.map((x): [string, string] => [x.id, `${x.name}|${x.seats}`]),
  );
  return fp;
}

/** Settings is a singleton document, so it gets its own change fingerprint. */
function settingsFingerprint(s: Settings): string {
  return JSON.stringify([
    s.shopName,
    s.address,
    s.phone,
    s.ownerId,
    s.momoNumber,
    s.momoNetwork,
    s.taxInclusive,
    s.taxRate,
    s.receiptFooter,
    s.theme,
    s.nextOrderNo,
  ]);
}

export async function drainOutbox(): Promise<{ applied: number; failed: number }> {
  if (isDemoMode()) return { applied: 0, failed: 0 };
  if (!cloudAccessAllowed()) return { applied: 0, failed: 0 };
  const { drain } = await import("./outbox");
  const res = await drain();
  return { applied: res.applied, failed: res.failed.length };
}

let watcher: { unsub: () => void; candle: number } | null = null;
let rtOff: (() => void) | null = null;
let timer: number | null = null;

export async function disarmSync() {
  armedOrgId = null;
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
  if (watcher) {
    watcher.unsub();
    watcher = null;
  }
  if (rtOff) {
    rtOff();
    rtOff = null;
  }
}

/**
 * Wire everything for one connection. Idempotent per org.
 */
export async function armSync(conn: SyncConnection) {
  if (isDemoMode()) return;
  if (!cloudAccessAllowed()) {
    await disarmSync();
    return;
  }
  if (armedOrgId === conn.org_id) return;
  await disarmSync();
  armedOrgId = conn.org_id;

  const { usePos } = await import("@/lib/store");

  // 1. one-shot per org: queue every row already stored on this device
  try {
    const pushed = (JSON.parse(window.localStorage.getItem(FIRST_PUSH_KEY) ?? "{}") as Record<string, boolean>)[conn.org_id];
    if (!pushed) {
      const s = await store();
      const { enqueue } = await import("./outbox");
      const asks: [Table, string][] = [
        ...s.categories.map((x) => ["categories", x.id] as [Table, string]),
        ...s.products.map((x) => ["products", x.id] as [Table, string]),
        ...s.batches.map((x) => ["product_batches", x.id] as [Table, string]),
    ...s.recipes.map((x) => ["recipes", x.id] as [Table, string]),
    ...s.tables.map((x) => ["restaurant_tables", x.id] as [Table, string]),
        ...s.recipes.map((x) => ["recipes", x.id] as [Table, string]),
        ...s.tables.map((x) => ["restaurant_tables", x.id] as [Table, string]),
        ...s.customers.map((x) => ["customers", x.id] as [Table, string]),
        ...s.orders.map((x) => ["orders", x.id] as [Table, string]),
        ...s.stockMoves.map((x) => ["stock_moves", x.id] as [Table, string]),
        ...s.staff.map((x) => ["staff", x.id] as [Table, string]),
      ];
      for (const [t, id] of asks) {
        await enqueue({
          op_id: crypto.randomUUID(),
          table: t,
          kind: "upsert",
          row: { id },
          created_at: Date.now(),
        } as unknown as Op);
      }
      const raw = JSON.parse(window.localStorage.getItem(FIRST_PUSH_KEY) ?? "{}") as Record<string, boolean>;
      raw[conn.org_id] = true;
      window.localStorage.setItem(FIRST_PUSH_KEY, JSON.stringify(raw));
    }
  } catch (e) {
    console.warn("sync: first push queue", e);
  }

  // 1b. shop settings ride a singleton document; queue one upsert per arm so
  // edits made before settings were synced (or on another device) reach the
  // cloud and a reinstall can restore them.
  try {
    const { enqueue } = await import("./outbox");
    await enqueue({
      op_id: crypto.randomUUID(),
      table: "settings",
      kind: "upsert",
      row: { id: "settings" },
      created_at: Date.now(),
    } as unknown as Op);
  } catch (e) {
    console.warn("sync: settings queue", e);
  }

  // 1c. every arm: products (and their order snapshots) still carrying "idb:"
  // refs locally — whether pushed by older builds or made before the upload
  // succeeded — are requeued so the images migrate into the bucket. The
  // conditions make this a no-op once everything is migrated.
  try {
    const s = await store();
    const mp = readMap();
    const { enqueue } = await import("./outbox");
    for (const x of s.products) {
      if (!isLocalImageRef(x.imageUrl) || !mp.products[x.id]) continue;
      await enqueue({
        op_id: crypto.randomUUID(),
        table: "products",
        kind: "upsert",
        row: { id: x.id },
        created_at: Date.now(),
      } as unknown as Op);
    }
    for (const o of s.orders) {
      if (!o.items.some((it) => isLocalImageRef(it.imageUrl)) || !mp.orders[o.id]) continue;
      await enqueue({
        op_id: crypto.randomUUID(),
        table: "orders",
        kind: "upsert",
        row: { id: o.id },
        created_at: Date.now(),
      } as unknown as Op);
    }
  } catch (e) {
    console.warn("sync: image migrate queue", e);
  }

  // 2. watch the store for diffs
  let prev = fingerprint(usePos.getState() as unknown as Store);
  let prevSettings = settingsFingerprint((usePos.getState() as unknown as Store).settings);
  watcher = {
    unsub: (usePos.subscribe as unknown as (fn: (s: unknown) => void) => () => void)((raw) => {
      if (APPLYING) return;
      if (isDemoMode()) return;
      const s = raw as unknown as Store;
      const next = fingerprint(s);
      void (async () => {
        const { enqueue } = await import("./outbox");
        for (const t of ["categories", "products", "product_batches", "recipes", "restaurant_tables", "customers", "orders", "stock_moves", "staff"] as Table[]) {
          const before = prev.get(t)!;
          const after = next.get(t)!;
          for (const [id, fp] of after) {
            if (before.get(id) === fp) continue;
            try {
              await enqueue({
                op_id: crypto.randomUUID(),
                table: t,
                kind: "upsert",
                row: { id },
                created_at: Date.now(),
              } as unknown as Op);
            } catch {}
          }
          for (const id of before.keys()) {
            if (!after.has(id) && t !== "orders" && t !== "stock_moves" && remoteId(t, id)) {
              try {
                await enqueue({
                  op_id: crypto.randomUUID(),
                  table: t,
                  kind: "delete",
                  id,
                  created_at: Date.now(),
                } as unknown as Op);
              } catch {}
              forgetId(readMap(), t, id);
            }
          }
        }
        const nextSettings = settingsFingerprint(s.settings);
        if (nextSettings !== prevSettings) {
          prevSettings = nextSettings;
          try {
            await enqueue({
              op_id: crypto.randomUUID(),
              table: "settings",
              kind: "upsert",
              row: { id: "settings" },
              created_at: Date.now(),
            } as unknown as Op);
          } catch {}
        }
        prev = next;
      })();
    }),
    candle: 0,
  };
  void watcher.candle;

  // 3. realtime channel
  try {
    const mod = await import("@/lib/sync/realtime");
    const c = await sb();
    if (c) {
      try {
        await c.realtime.setAuth((await freshToken()) ?? "");
      } catch {}
    }
    rtOff = mod.subscribe(conn.org_id, [...TABLES], (change) => {
      void onRemoteChange(conn, {
        table: change.table,
        eventType: change.eventType,
        new: change.new as RemoteRow,
        old: change.old as RemoteRow,
      });
    });
  } catch (e) {
    console.warn("sync: realtime", e);
    rtOff = null;
  }

  // 4. periodic pull + drain while signed in
  timer = window.setInterval(() => {
    void (async () => {
      if (!(await freshToken())) return;
      try {
        await pullAll(conn);
      } catch (e) {
        console.warn("sync: pull", e);
      }
      try {
        const ops = await (await import("./outbox")).peek();
        if (ops.length > 0) await drainOutbox();
      } catch (e) {
        console.warn("sync: drain", e);
      }
    })();
  }, PULL_INTERVAL);

  // 5. initial handshake — pull, then re-queue anything the server lacks.
  // Covers rows whose ops were dropped after repeated push failures.
  try {
    await pullAll(conn);
    await requeueMissing();
    await drainOutbox();
  } catch (e) {
    console.warn("sync: handshake", e);
  }
}

/** Enqueue every local row that has no server id yet and is not already queued. */
async function requeueMissing(): Promise<number> {
  const s = await store();
  const map = readMap();
  const { enqueue, peek } = await import("./outbox");
  const queued = new Set((await peek()).map((op) => `${op.table}:${op.row?.id ?? op.id}`));
  const rows: [Table, string][] = [
    ...s.categories.map((x) => ["categories", x.id] as [Table, string]),
    ...s.products.map((x) => ["products", x.id] as [Table, string]),
    ...s.batches.map((x) => ["product_batches", x.id] as [Table, string]),
    ...s.customers.map((x) => ["customers", x.id] as [Table, string]),
    ...s.orders.map((x) => ["orders", x.id] as [Table, string]),
    ...s.stockMoves.map((x) => ["stock_moves", x.id] as [Table, string]),
    ...s.staff.map((x) => ["staff", x.id] as [Table, string]),
  ];
  let added = 0;
  for (const [t, id] of rows) {
    if (map[t][id]) continue;
    if (queued.has(`${t}:${id}`)) continue;
    try {
      await enqueue({
        op_id: crypto.randomUUID(),
        table: t,
        kind: "upsert",
        row: { id },
        created_at: Date.now(),
      } as unknown as Op);
      added += 1;
    } catch {
      /* best effort */
    }
  }
  return added;
}

export function lastPullAt(): number {
  if (typeof window === "undefined") return 0;
  return Number(window.localStorage.getItem(LAST_PULL_KEY) ?? 0);
}
