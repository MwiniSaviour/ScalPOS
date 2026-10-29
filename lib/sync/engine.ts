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
import type { Category, Customer, Order, Product, StockMove } from "@/lib/types";
import type { Op } from "./types";

const IDMAP_KEY = "nova-pos-idmap-v1";
const FIRST_PUSH_KEY = "nova-pos-first-push-v1";
const LAST_PULL_KEY = "nova-pos-last-pull";
const PULL_INTERVAL = 30_000;

const TABLES = ["categories", "products", "customers", "orders", "order_items", "stock_moves"] as const;
type Table = (typeof TABLES)[number];

type IdMap = Record<Table, Record<string, string>>;

let APPLYING = false;
let armedOrgId: string | null = null;

function emptyMap(): IdMap {
  return { categories: {}, products: {}, customers: {}, orders: {}, order_items: {}, stock_moves: {} };
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

type RemoteRow = Record<string, unknown>;

type Store = {
  categories: Category[];
  products: Product[];
  customers: Customer[];
  orders: Order[];
  stockMoves: StockMove[];
};

async function store(): Promise<Store> {
  return (await import("@/lib/store")).usePos.getState() as unknown as Store;
}

async function sb(): Promise<ReturnType<typeof getSupabase>> {
  return getSupabase((await freshToken()) ?? undefined);
}

// ---- push ------------------------------------------------------------------

export async function pushLocalRow(table: Table, localId: string): Promise<void> {
  const conn = readConnection();
  if (!conn?.org_id) throw new Error("not connected");
  const c = await sb();
  if (!c) throw new Error("server not ready");
  const s = await store();
  const map = readMap();
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
        catId = readMap().categories[x.categoryId];
      }
    }
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
      image_path: x.imageUrl,
      description: x.description,
      active: x.active,
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
      productId = readMap().products[x.productId];
    }
    // A move whose product no longer exists locally cannot be attached to
    // anything on the server; let the op retire instead of failing forever.
    if (!productId) return;
    await put(table, {
      ...(map.stock_moves[x.id] ? { id: map.stock_moves[x.id] } : {}),
      org_id,
      local_id: x.id,
      product_id: productId,
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
      created_at: iso(x.createdAt) ?? undefined,
      updated_at: upd,
      deleted_at: null,
    });
    const revProductIds = revFrom(map.products);
    for (let i = 0; i < x.items.length; i++) {
      const it = x.items[i];
      const itLocal = `${x.id}#${i}`;
      await put("order_items", {
        ...(map.order_items[itLocal] ? { id: map.order_items[itLocal] } : {}),
        org_id,
        order_id: orderRemoteId,
        local_id: itLocal,
        product_id: map.products[it.productId] ?? (revProductIds[it.productId] ? it.productId : null),
        name: it.name,
        image_path: it.imageUrl,
        qty: it.qty,
        price: it.price,
        cost: it.cost,
        position: i,
        updated_at: upd,
        deleted_at: null,
      });
    }
    return;
  }
}

export async function softDeleteRemote(table: Table, localId: string): Promise<void> {
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

function custLocal(r: RemoteRow): Customer {
  return {
    id: String(r.local_id ?? ""),
    name: String(r.name ?? ""),
    phone: String(r.phone ?? ""),
    address: String(r.address ?? ""),
    note: String(r.note ?? ""),
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
  };
}

function mvLocal(r: RemoteRow, map: IdMap): StockMove {
  const revProd = revFrom(map.products);
  return {
    id: String(r.local_id ?? ""),
    productId: typeof r.product_id === "string" ? revProd[r.product_id] ?? "" : "",
    qty: n(r.qty),
    reason: (["purchase", "sale", "adjust", "damage", "return", "count", "opening"].includes(String(r.reason)) ? r.reason : "adjust") as StockMove["reason"],
    ref: typeof r.ref === "string" ? r.ref : undefined,
    t: ms(r.occurred_at) ?? ms(r.created_at) ?? Date.now(),
  };
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
    case "customers": return n(row.createdAt);
    case "orders": return n((row.completedAt as number | null) ?? row.createdAt);
    case "stock_moves": return n(row.t);
    default: return 0;
  }
}

function remoteStamp(table: Table, r: RemoteRow): number {
  switch (table) {
    case "products": return ms(r.updated_at) ?? 0;
    case "customers": return ms(r.created_at) ?? 0;
    case "orders": return ms(r.completed_at) ?? ms(r.created_at) ?? 0;
    case "stock_moves": return ms(r.occurred_at) ?? ms(r.created_at) ?? 0;
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
      const products = mergeLocal(
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
        return cid === row.categoryId ? p : ({ ...p, categoryId: cid } as unknown as typeof p);
      });
      const prodIds = new Set((products as unknown as Product[]).map((x) => x.id));
      const customers = mergeLocal(
        "customers",
        s.customers as unknown as (Record<string, unknown> & { id: string })[],
        (rows.customers ?? []).map(custLocal) as unknown as (Record<string, unknown> & { id: string })[],
      );
      const custIds = new Set((customers as unknown as Customer[]).map((c) => c.id));
      const pulledOrders = (rows.orders ?? []).map((r) => {
        const localOrder = ordLocal(r, { ...map, products: map.products }, [] as Order["items"]);
        localOrder.customerId = typeof r.customer_id === "string" ? revCust[r.customer_id] ?? r.customer_id : null;
        localOrder.items = itemsByOrder.get(String(r.local_id)) ?? [];
        return localOrder as unknown as Record<string, unknown> & { id: string };
      });
      const orders = mergeLocal(
        "orders",
        s.orders as unknown as (Record<string, unknown> & { id: string })[],
        pulledOrders,
      ).map((o) => {
        const row = o as unknown as Order;
        if (!row.customerId) return o;
        const mapped = custIds.has(row.customerId) ? row.customerId : revCust[row.customerId];
        const next = mapped && custIds.has(mapped) ? mapped : null;
        return next === row.customerId ? o : ({ ...o, customerId: next } as unknown as typeof o);
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
      return { ...s, categories, products, customers, orders, stockMoves } as unknown as typeof s;
    });

    window.localStorage.setItem(LAST_PULL_KEY, String(Date.now()));
  } finally {
    APPLYING = false;
  }
  return count;
}

// ---- realtime --------------------------------------------------------------

export async function onRemoteChange(conn: SyncConnection, change: { table: string; eventType: string; new: RemoteRow | null; old: RemoteRow | null }) {
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
          return { ...s, products: putAt(s.products, local) } as unknown as typeof s;
        }
        case "customers": {
          return { ...s, customers: putAt(s.customers, custLocal(row)) } as unknown as typeof s;
        }
        case "categories": {
          return { ...s, categories: putAt(s.categories, catLocal(row)) } as unknown as typeof s;
        }
        case "orders": {
          const local = ordLocal(row, map, []) as Order;
          return { ...s, orders: putAt(s.orders, local) } as unknown as typeof s;
        }
        case "stock_moves": {
          return { ...s, stockMoves: putAt(s.stockMoves, mvLocal(row, map)) } as unknown as typeof s;
        }
        default:
          return s;
      }
    });
  } finally {
    APPLYING = false;
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
        `${x.name}|${x.categoryId}|${x.price}|${x.cost}|${x.stock}|${x.lowStockAt}|${x.unit}|${x.sku}|${x.barcode}|${x.imageUrl}|${x.description}|${x.active}`,
      ],
    ),
  );
  set("customers", s.customers.map((x): [string, string] => [x.id, `${x.name}|${x.phone}|${x.address}|${x.note}`]));
  set(
    "orders",
    s.orders.map(
      (x): [string, string] => [
        x.id,
        `${x.status}|${x.payStatus}|${x.payments.length}|${x.total}|${x.subtotal}|${x.discount}|${x.note ?? ""}|${x.customerId}|${JSON.stringify(x.items.map((i) => `${i.productId},${i.qty},${i.price}`))}`,
      ],
    ),
  );
  set("order_items", []);
  set("stock_moves", s.stockMoves.map((x): [string, string] => [x.id, `${x.productId}|${x.qty}|${x.reason}|${x.ref ?? ""}`]));
  return fp;
}

export async function drainOutbox(): Promise<{ applied: number; failed: number }> {
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
        ...s.customers.map((x) => ["customers", x.id] as [Table, string]),
        ...s.orders.map((x) => ["orders", x.id] as [Table, string]),
        ...s.stockMoves.map((x) => ["stock_moves", x.id] as [Table, string]),
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

  // 2. watch the store for diffs
  let prev = fingerprint(usePos.getState() as unknown as Store);
  watcher = {
    unsub: (usePos.subscribe as unknown as (fn: (s: unknown) => void) => () => void)((raw) => {
      if (APPLYING) return;
      const s = raw as unknown as Store;
      const next = fingerprint(s);
      void (async () => {
        const { enqueue } = await import("./outbox");
        for (const t of ["categories", "products", "customers", "orders", "stock_moves"] as Table[]) {
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
    ...s.customers.map((x) => ["customers", x.id] as [Table, string]),
    ...s.orders.map((x) => ["orders", x.id] as [Table, string]),
    ...s.stockMoves.map((x) => ["stock_moves", x.id] as [Table, string]),
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
