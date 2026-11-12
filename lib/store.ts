"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { defaultSettings } from "./seed";
import { isDemoMode } from "./demo";
import {
  batchesOf,
  batchStock,
  cartLineKey,
  packFactor,
  planRestock,
  planSale,
} from "./batches";
import { id, orderId, startOfDay } from "./format";
import { pruneImages } from "./image-store";
import { readConnection, type SyncConnection } from "./api/bootstrap";
import { notifyLocal } from "./notify";
import { insertLowStockNotification } from "./api/notifications";
import type { Staff } from "./staff";
import type {
  Batch,
  Category,
  CartLine,
  Customer,
  Order,
  OrderItem,
  Payment,
  PaymentMethod,
  Product,
  Settings,
  StockMove,
  StockReason,
} from "./types";

/* ------------------------------ derived helpers ------------------------------ */

export type PayStatusCalc = "unpaid" | "partial" | "paid";

export function paidOf(o: Order): number {
  if (o.payments.length === 0) return 0;
  return o.payments.reduce((s, p) => s + p.amount, 0);
}

export function dueOf(o: Order): number {
  return Math.max(0, o.total - paidOf(o));
}

export function payStatusOf(o: Order): PayStatusCalc {
  const total = o.total;
  if (total <= 0) return "paid";
  const paid = paidOf(o);
  if (paid <= 0) return "unpaid";
  return paid + 1e-9 >= total ? "paid" : "partial";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

type ProductLike = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  lowStockAt: number;
};

function fireLowStockAlerts(prev: ProductLike[], next: ProductLike[]): void {
  const crossed = next.filter((p) => {
    const before = prev.find((q) => q.id === p.id);
    return before != null && p.stock <= p.lowStockAt && before.stock > before.lowStockAt;
  });
  if (crossed.length === 0) return;
  const conn = readConnection();
  if (!conn) {
    for (const c of crossed) {
      void notifyLocal(`Low stock: ${c.name}`, `Only ${c.stock} ${c.unit} left`, `low:${c.id}`);
    }
    return;
  }
  for (const c of crossed) {
    void insertLowStockNotification(conn as SyncConnection, c.name, c.stock, c.unit, c.id);
  }
}

/**
 * Tax on a net amount (subtotal after discount).
 * `taxRate` is a percentage — 15 means 15%. A rate of 0 means no tax at all,
 * which is the default so existing registers behave exactly as before.
 */
export function taxAmount(net: number, taxRate: number): number {
  if (!Number.isFinite(net) || !Number.isFinite(taxRate) || taxRate <= 0) return 0;
  return round2((net * taxRate) / 100);
}

/* ------------------------------ pharmacy helpers ------------------------------ */

/** Apply a stock delta to the earliest-expiring batch of a product. */
function applyToEarliestBatch(
  batches: Batch[],
  productId: string,
  delta: number,
): { batches: Batch[]; applied: number; batchId: string | null } {
  const ordered = batchesOf(batches, productId);
  const target = ordered.find((b) => b.qty > 0) ?? ordered[0];
  if (!target) return { batches, applied: 0, batchId: null };
  return {
    batches: batches.map((b) =>
      b.id === target.id ? { ...b, qty: b.qty + delta, updatedAt: Date.now() } : b,
    ),
    applied: delta,
    batchId: target.id,
  };
}

/* --------------------------------- staff --------------------------------- */

const OWNER_ID = "st_owner";
const LEGACY_STAFF_KEY = "nova-pos-staff-v1";
const LEGACY_CURRENT_STAFF_KEY = "nova-pos-current-staff";

function seedOwner(): Staff {
  return { id: OWNER_ID, name: "Owner", role: "owner", createdAt: 0, active: true, updatedAt: 0 };
}

function isLegacyStaff(v: unknown): v is Staff {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    typeof s.name === "string" &&
    (s.role === "owner" || s.role === "supervisor" || s.role === "cashier") &&
    typeof s.createdAt === "number"
  );
}

/** One-time import of the pre-store staff keys (see rehydrate). */
function legacyStaff(): { members: Staff[]; currentStaffId: string | null } {
  if (typeof window === "undefined") return { members: [], currentStaffId: null };
  let members: Staff[] = [];
  try {
    const raw = window.localStorage.getItem(LEGACY_STAFF_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        members = parsed
          .filter(isLegacyStaff)
          .map((s) => ({ ...s, active: s.active ?? true, phone: s.phone ?? "" }));
      }
    }
  } catch {
    /* corrupt legacy list — fall through to seeding an owner */
  }
  let currentStaffId: string | null = null;
  try {
    currentStaffId = window.localStorage.getItem(LEGACY_CURRENT_STAFF_KEY);
  } catch {
    /* storage unavailable */
  }
  try {
    window.localStorage.removeItem(LEGACY_STAFF_KEY);
    window.localStorage.removeItem(LEGACY_CURRENT_STAFF_KEY);
  } catch {
    /* storage unavailable */
  }
  return { members, currentStaffId };
}

/* --------------------------------- store -------------------------------- */

type Toast = { id: string; msg: string; kind: "ok" | "warn" | "error" };

export type CartDraftPayment = { method: PaymentMethod; amount: number };

type PosState = {
  hydrated: boolean;
  products: Product[];
  categories: Category[];
  orders: Order[];
  customers: Customer[];
  stockMoves: StockMove[];
  batches: Batch[];
  staff: Staff[];
  currentStaffId: string | null;
  settings: Settings;
  cart: CartLine[];
  cartUpdatedAt: number;
  cartCustomerId: string | null;
  cartDiscount: number;
  draftPayments: CartDraftPayment[];
  toasts: Toast[];

  /* lifecycle */
  rehydrate: () => void;

  /* register */
  addToCart: (productId: string, qty?: number, opts?: { packIdx?: number; price?: number }) => void;
  setCartQty: (key: string, qty: number) => void;
  clearCart: () => void;
  setCartCustomer: (cid: string | null) => void;
  setCartDiscount: (n: number) => void;
  addDraftPayment: (p: CartDraftPayment) => void;
  clearDraftPayments: () => void;

  /* orders */
  placeOrder: (payments: Payment[], opts?: { prescriptionRef?: string }) => Order | null;
  addPaymentsToOrder: (oid: string, payments: Array<{ method: PaymentMethod; amount: number; ref?: string }>) => void;
  refundOrder: (oid: string, reason?: string) => void;
  setPendingToCompleted: (oid: string) => void;

  /* inventory */
  upsertProduct: (p: Partial<Product> & { name: string; price: number }) => Product;
  upsertCategory: (c: Partial<Category> & { name: string; color?: string }) => Category;

  adjustStock: (productId: string, qtyDelta: number, reason: StockReason, ref?: string) => void;
  deleteProduct: (pid: string) => void;

  /* batches (pharmacy) */
  upsertBatch: (b: Partial<Batch> & { productId: string; qty: number }) => Batch;
  deleteBatch: (id: string) => void;

  /* customers */
  upsertCustomer: (c: Partial<Customer> & { name: string }) => Customer;
  deleteCustomer: (cid: string) => void;

  /* staff */
  upsertStaff: (staff: Staff) => void;
  deleteStaff: (sid: string) => void;
  setCurrentStaff: (sid: string) => void;

  /* settings */
  updateSettings: (patch: Partial<Settings>) => void;

  /* feedback */
  toast: (msg: string, kind?: Toast["kind"]) => void;
  dismissToast: (tid: string) => void;
};

export const usePos = create<PosState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      products: [],
      categories: [],
      orders: [],
      customers: [],
      stockMoves: [],
      batches: [],
      staff: [],
      currentStaffId: null,
      settings: defaultSettings(),
      cart: [],
      cartUpdatedAt: 0,
      cartCustomerId: null,
      cartDiscount: 0,
      draftPayments: [],
      toasts: [],

      rehydrate: () => {
        const persisted =
          typeof window !== "undefined" ? window.localStorage.getItem("nova-pos-v1") : null;
        set({ hydrated: true });

        // One-time migration off the pre-store staff keys. Reading the legacy
        // keys also removes them, so this is a no-op after the first boot.
        const legacy = legacyStaff();
        if (get().staff.length === 0 && legacy.members.length > 0) {
          set({ staff: legacy.members, currentStaffId: legacy.currentStaffId ?? null });
        }
        // A register must always have a staff list — seed the owner row.
        if (get().staff.length === 0) set({ staff: [seedOwner()] });

        if (persisted === null) return;

        // a cart left open for hours is not a sale — drop it
        const s = get();
        if (!s.settings.businessType) {
          set({ settings: { ...s.settings, businessType: "retail" } });
        }
        if (s.cart.length > 0 && Date.now() - s.cartUpdatedAt > 12 * 60 * 60 * 1000) {
          set({ cart: [], cartCustomerId: null, cartDiscount: 0, cartUpdatedAt: 0 });
        }
        // sweep photos no product or order references any more
        const refs = [
          ...s.products.map((p) => p.imageUrl),
          ...s.orders.flatMap((o) => o.items.map((i) => i.imageUrl)),
        ];
        if (!isDemoMode()) void pruneImages(refs);
      },

      addToCart: (pid, qty = 1, opts) => {
        const p = get().products.find((x) => x.id === pid);
        if (!p) return;
        const cart = [...get().cart];
        const packIdx = opts?.packIdx;
        const key = cartLineKey({ productId: pid, packIdx });
        const i = cart.findIndex((l) => cartLineKey(l) === key);
        const factor = packFactor(p, packIdx);
        const want = (i >= 0 ? cart[i].qty : 0) + qty;
        // stock is held in base units — a pack line can only take whole packs
        const available = p.stock <= 0 ? 0 : Math.floor(p.stock / factor);
        const capped = Math.min(want, available);
        if (capped <= 0) {
          get().toast(p.stock <= 0 ? "Out of stock" : "Not enough stock for a full pack", "error");
          return;
        }
        if (capped < want) get().toast(`Only ${available} left`, "warn");
        const line: CartLine = {
          productId: pid,
          qty: capped,
          ...(packIdx === undefined ? {} : { packIdx }),
          ...(opts?.price === undefined ? {} : { price: opts.price }),
        };
        if (i >= 0) cart[i] = { ...cart[i], ...line };
        else cart.push(line);
        set({ cart, cartUpdatedAt: Date.now() });
      },

      setCartQty: (key, qty) => {
        const s = get();
        let cart = [...s.cart];
        const i = cart.findIndex((l) => cartLineKey(l) === key);
        if (i < 0) return;
        const line = cart[i];
        const p = s.products.find((x) => x.id === line.productId);
        const factor = packFactor(p, line.packIdx);
        const available = p && p.stock > 0 ? Math.floor(p.stock / factor) : 0;
        const capped = Math.max(0, Math.min(qty, available));
        if (capped === 0) cart = cart.filter((l) => cartLineKey(l) !== key);
        else cart[i] = { ...line, qty: capped };
        set({ cart, cartUpdatedAt: Date.now() });
      },

      clearCart: () =>
        set({ cart: [], cartDiscount: 0, cartCustomerId: null, draftPayments: [], cartUpdatedAt: 0 }),

      setCartCustomer: (cid) => set({ cartCustomerId: cid, cartUpdatedAt: Date.now() }),

      setCartDiscount: (n) => set({ cartDiscount: Math.max(0, n), cartUpdatedAt: Date.now() }),

      addDraftPayment: (p) => set((s) => ({ draftPayments: [...s.draftPayments, p] })),
      clearDraftPayments: () => set({ draftPayments: [] }),

      placeOrder: (payments, opts) => {
        const s = get();
        if (s.cart.length === 0) return null;
        const now = Date.now();
        const rxRef = opts?.prescriptionRef?.trim();

        // Work out the lines and the batch allocations (FEFO) up front.
        const plan = planSale(s.cart, s.products, s.batches);
        if (plan.lines.length === 0) return null;
        if (plan.shortfall > 0) {
          get().toast(`Not enough stock for ${plan.shortageProduct ?? "an item"}`, "error");
          return null;
        }

        const items: OrderItem[] = plan.lines.map((pl) => ({
          productId: pl.product.id,
          name: pl.product.name,
          imageUrl: pl.product.imageUrl,
          qty: pl.line.qty,
          price: pl.line.price ?? pl.product.price,
          cost: round2(pl.product.cost * pl.factor),
          baseQty: pl.baseQty,
          ...(pl.allocations.length > 0 ? { batchAllocations: pl.allocations } : {}),
          ...(pl.packName ? { packName: pl.packName } : {}),
          ...(rxRef && pl.product.prescriptionOnly ? { prescriptionRef: rxRef } : {}),
        }));

        const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
        const net = Math.max(0, subtotal - s.cartDiscount);
        const tax = taxAmount(net, s.settings.taxRate);
        // taxRate 0 → tax 0 → total is exactly the old subtotal - discount
        const total = tax > 0 && !s.settings.taxInclusive ? round2(net + tax) : net;
        const paid = payments.reduce((sum, p) => sum + p.amount, 0);
        const credit = Math.max(0, total - paid);
        const status = credit > 0 ? "pending" : "completed";
        const order: Order = {
          id: orderId(s.settings.nextOrderNo, now),
          items,
          customerId: s.cartCustomerId,
          subtotal,
          discount: s.cartDiscount,
          total,
          tax,
          status,
          payments,
          payStatus: credit > 0 ? (paid > 0 ? "partial" : "unpaid") : "paid",
          createdAt: now,
          completedAt: credit > 0 ? null : now,
        };

        // stock moves: one per order line, split per batch when the line was
        // allocated from batches. Counts are base units.
        const moves: StockMove[] = [];
        for (const pl of plan.lines) {
          if (pl.allocations.length > 0) {
            for (const a of pl.allocations) {
              moves.push({
                id: id("mv_"),
                productId: pl.product.id,
                qty: -a.qty,
                reason: "sale",
                ref: order.id,
                t: now,
                batchId: a.batchId,
              });
            }
          } else {
            moves.push({
              id: id("mv_"),
              productId: pl.product.id,
              qty: -pl.baseQty,
              reason: "sale",
              ref: order.id,
              t: now,
            });
          }
        }

        const batches = s.batches.map((b) => {
          const used = plan.batchDraw.get(b.id);
          return used ? { ...b, qty: b.qty - used, updatedAt: now } : b;
        });
        const products = s.products.map((p) => {
          const isBatched = batches.some((b) => b.productId === p.id);
          if (isBatched) {
            // a batched product's stock is derived from its batches
            const derived = batchStock(batches, p.id);
            return derived === p.stock ? p : { ...p, stock: derived, updatedAt: now };
          }
          const sold = plan.productSold.get(p.id) ?? 0;
          return sold > 0 ? { ...p, stock: Math.max(0, p.stock - sold), updatedAt: now } : p;
        });

        const orderNo = s.settings.nextOrderNo + 1;

        set({
          orders: [order, ...s.orders],
          products,
          batches,
          stockMoves: [...moves, ...s.stockMoves],
          settings: { ...s.settings, nextOrderNo: orderNo },
          cart: [],
          cartCustomerId: null,
          cartDiscount: 0,
          cartUpdatedAt: 0,
          draftPayments: [],
        });

        fireLowStockAlerts(s.products, products);

        if (credit > 0) {
          get().toast(credit === total ? "On credit — collect due later" : "Part-paid — balance due", "warn");
        }
        return order;
      },

      addPaymentsToOrder: (oid, inputs) => {
        const s = get();
        const orderIdx = s.orders.findIndex((o) => o.id === oid);
        if (orderIdx < 0) return;
        const order = s.orders[orderIdx];
        if (inputs.length === 0) return;
        const now = Date.now();
        const payments: Payment[] = inputs.map((p) => ({ id: id("pay_"), method: p.method, amount: p.amount, ref: p.ref, t: now }));
        const merged: Order = {
          ...order,
          payments: [...order.payments, ...payments],
        };
        const prevPay = payStatusOf(order);
        const nextPay = payStatusOf(merged);
        merged.payStatus = nextPay;
        if (nextPay === "paid" && prevPay !== "paid") {
          merged.status = "completed";
          merged.completedAt = now;
        } else if (nextPay === "partial" && merged.status === "pending") {
          merged.status = "pending";
        }
        const orders = [...s.orders];
        orders[orderIdx] = merged;
        set({ orders });

        if (nextPay === "paid" && prevPay !== "paid") get().toast("Fully paid", "ok");
      },

      refundOrder: (oid) => {
        const s = get();
        const order = s.orders.find((o) => o.id === oid);
        if (!order || order.status === "refunded") return;
        const now = Date.now();
        const plan = planRestock(order.items);
        const moves: StockMove[] = [];
        for (const i of order.items) {
          const allocations = i.batchAllocations ?? [];
          if (allocations.length > 0) {
            // restock into the exact batches the sale came out of
            for (const a of allocations) {
              moves.push({
                id: id("mv_"),
                productId: i.productId,
                qty: a.qty,
                reason: "return",
                ref: order.id,
                t: now,
                batchId: a.batchId,
              });
            }
          } else {
            const qty = i.baseQty ?? i.qty;
            moves.push({
              id: id("mv_"),
              productId: i.productId,
              qty,
              reason: "return",
              ref: order.id,
              t: now,
            });
          }
        }
        const batches = s.batches.map((b) => {
          const back = plan.batchBack.get(b.id);
          return back ? { ...b, qty: b.qty + back, updatedAt: now } : b;
        });
        const products = s.products.map((p) => {
          const isBatched = batches.some((b) => b.productId === p.id);
          if (isBatched) {
            const derived = batchStock(batches, p.id);
            return derived === p.stock ? p : { ...p, stock: derived, updatedAt: now };
          }
          const back = plan.productBack.get(p.id) ?? 0;
          return back > 0 ? { ...p, stock: p.stock + back, updatedAt: now } : p;
        });
        const orders = s.orders.map((o) =>
          o.id === oid ? { ...o, status: "refunded" as const, payStatus: "refunded" as const } : o,
        );
        set({ orders, products, batches, stockMoves: [...moves, ...s.stockMoves] });
        get().toast("Order refunded", "ok");
      },

      setPendingToCompleted: (oid) => {
        const s = get();
        set({
          orders: s.orders.map((o) =>
            o.id === oid ? { ...o, status: "completed", completedAt: Date.now() } : o,
          ),
        });
      },

      upsertProduct: (patch) => {
        const s = get();
        const now = Date.now();
        const existing = patch.id ? s.products.find((p) => p.id === patch.id) : undefined;
        let saved: Product;
        let batches = s.batches;
        let extraMoves: StockMove[] = [];
        if (existing) {
          saved = { ...existing, ...patch, name: patch.name, updatedAt: now } as Product;
          const stockDelta = (patch.stock ?? existing.stock) - existing.stock;
          // A batched product owns its stock through its batches — a stock
          // edit lands on the earliest-expiring batch so the derived total
          // stays truthful.
          const isBatched = batches.some((b) => b.productId === existing.id);
          if (isBatched) {
            if (stockDelta !== 0) {
              const r = applyToEarliestBatch(batches, existing.id, stockDelta);
              batches = r.batches;
              extraMoves = [
                {
                  id: id("mv_"),
                  productId: saved.id,
                  qty: stockDelta,
                  reason: "adjust",
                  ref: "product edit",
                  t: now,
                  ...(r.batchId ? { batchId: r.batchId } : {}),
                },
              ];
            }
            // derived stock for a batched product
            saved = { ...saved, stock: batchStock(batches, saved.id) };
          } else if (stockDelta !== 0) {
            extraMoves = [
              { id: id("mv_"), productId: saved.id, qty: stockDelta, reason: "adjust", ref: "product edit", t: now },
            ];
          }
          set({
            products: s.products.map((p) => (p.id === existing.id ? saved : p)),
            batches,
            stockMoves:
              stockDelta !== 0
                ? [...extraMoves, ...s.stockMoves]
                : s.stockMoves,
          });
        } else {
          const openingStock = patch.stock ?? 0;
          saved = {
            unit: "pcs",
            categoryId: null,
            cost: 0,
            lowStockAt: 5,
            sku: "",
            barcode: "",
            imageUrl: "",
            description: "",
            createdAt: now,
            updatedAt: now,
            active: true,
            ...patch,
            stock: openingStock,
            name: patch.name,
            id: patch.id ?? id("p_"),
          } as Product;
          set({
            products: [saved, ...s.products],
            stockMoves:
              openingStock > 0
                ? [
                    { id: id("mv_"), productId: saved.id, qty: openingStock, reason: "opening", ref: "created", t: now },
                    ...s.stockMoves,
                  ]
                : s.stockMoves,
          });
        }
        get().toast(existing ? "Product updated" : "Product added", "ok");
        return saved;
      },

      upsertCategory: (patch) => {
        const s = get();
        const existing = patch.id ? s.categories.find((c) => c.id === patch.id) : undefined;
        if (existing) {
          const saved = { ...existing, ...patch } as Category;
          set({ categories: s.categories.map((c) => (c.id === existing.id ? saved : c)) });
          get().toast("Category updated", "ok");
          return saved;
        }
        const c: Category = {
          id: patch.id ?? id("c_"),
          name: patch.name,
          
          color: patch.color ?? "#059669",
        };
        set({ categories: [c, ...s.categories] });
        get().toast("Category added", "ok");
        return c;
      },

      adjustStock: (pid, delta, reason, ref) => {
        const s = get();
        const now = Date.now();
        const isBatched = s.batches.some((b) => b.productId === pid);
        let batches = s.batches;
        let batchId: string | undefined;
        if (isBatched) {
          const r = applyToEarliestBatch(batches, pid, delta);
          batches = r.batches;
          batchId = r.batchId ?? undefined;
        }
        const products = s.products.map((p) => {
          if (p.id !== pid) return p;
          if (isBatched) {
            const derived = batchStock(batches, pid);
            return derived === p.stock ? p : { ...p, stock: derived, updatedAt: now };
          }
          return { ...p, stock: Math.max(0, p.stock + delta), updatedAt: now };
        });
        set({
          products,
          batches,
          stockMoves: [
            {
              id: id("mv_"),
              productId: pid,
              qty: delta,
              reason,
              ref,
              t: now,
              ...(batchId ? { batchId } : {}),
            },
            ...s.stockMoves,
          ],
        });
        fireLowStockAlerts(s.products, products);
      },

      deleteProduct: (pid) => {
        const s = get();
        set({
          products: s.products.filter((p) => p.id !== pid),
          batches: s.batches.filter((b) => b.productId !== pid),
          cart: s.cart.filter((l) => l.productId !== pid),
          cartUpdatedAt: Date.now(),
        });
        get().toast("Product deleted", "ok");
      },

      /* ---------------- batches (pharmacy) ---------------- */

      upsertBatch: (patch) => {
        const s = get();
        const now = Date.now();
        const existing = patch.id ? s.batches.find((b) => b.id === patch.id) : undefined;
        const saved: Batch = existing
          ? ({ ...existing, ...patch, updatedAt: now } as Batch)
          : {
              id: patch.id ?? id("b_"),
              productId: patch.productId,
              batchNo: patch.batchNo ?? "",
              expiry: patch.expiry ?? "",
              qty: patch.qty,
              cost: patch.cost ?? 0,
              createdAt: now,
              updatedAt: now,
            };
        const batches = existing
          ? s.batches.map((b) => (b.id === saved.id ? saved : b))
          : [saved, ...s.batches];
        // a batched product's stock is derived from its batches
        const prevStock = s.products.find((p) => p.id === saved.productId)?.stock ?? 0;
        const derived = batchStock(batches, saved.productId);
        const products = s.products.map((p) => {
          if (p.id !== saved.productId) return p;
          return derived === p.stock ? p : { ...p, stock: derived, updatedAt: now };
        });
        // The move records the change in stock, not the change in the batch —
        // otherwise a product opened with stock and then given its first batch
        // would count the same units twice.
        const delta = derived - prevStock;
        const moves: StockMove[] =
          delta !== 0
            ? [
                {
                  id: id("mv_"),
                  productId: saved.productId,
                  qty: delta,
                  reason: existing ? "adjust" : delta > 0 ? "purchase" : "adjust",
                  ref: saved.batchNo ? `batch ${saved.batchNo}` : "batch",
                  t: now,
                  batchId: saved.id,
                },
              ]
            : [];
        set({ batches, products, stockMoves: [...moves, ...s.stockMoves] });
        get().toast(existing ? "Batch updated" : "Batch added", "ok");
        return saved;
      },

      deleteBatch: (bid) => {
        const s = get();
        const b = s.batches.find((x) => x.id === bid);
        if (!b) return;
        const now = Date.now();
        const batches = s.batches.filter((x) => x.id !== bid);
        const prevStock = s.products.find((p) => p.id === b.productId)?.stock ?? 0;
        const derived = batchStock(batches, b.productId);
        const products = s.products.map((p) => {
          if (p.id !== b.productId) return p;
          return derived === p.stock ? p : { ...p, stock: derived, updatedAt: now };
        });
        const delta = derived - prevStock;
        const moves: StockMove[] =
          delta !== 0
            ? [
                {
                  id: id("mv_"),
                  productId: b.productId,
                  qty: delta,
                  reason: "adjust",
                  ref: b.batchNo ? `batch ${b.batchNo}` : "batch",
                  t: now,
                  batchId: b.id,
                },
              ]
            : [];
        set({ batches, products, stockMoves: [...moves, ...s.stockMoves] });
        get().toast("Batch deleted", "ok");
      },

      upsertCustomer: (patch) => {
        const s = get();
        const existing = patch.id ? s.customers.find((c) => c.id === patch.id) : undefined;
        if (existing) {
          const saved = { ...existing, ...patch, name: patch.name ?? existing.name } as Customer;
          set({ customers: s.customers.map((c) => (c.id === existing.id ? saved : c)) });
          return saved;
        }
        const c: Customer = {
          id: patch.id ?? id("k_"),
          name: patch.name,
          phone: patch.phone ?? "",
          address: patch.address ?? "",
          note: patch.note ?? "",
          createdAt: patch.createdAt ?? Date.now(),
        };
        set({ customers: [c, ...s.customers] });
        return c;
      },

      deleteCustomer: (cid) => {
        const s = get();
        set({ customers: s.customers.filter((c) => c.id !== cid) });
        get().toast("Customer deleted", "ok");
      },

      upsertStaff: (staff) => {
        const s = get();
        const saved: Staff = { ...staff, updatedAt: Date.now() };
        const exists = s.staff.some((x) => x.id === saved.id);
        set({ staff: exists ? s.staff.map((x) => (x.id === saved.id ? saved : x)) : [...s.staff, saved] });
      },

      deleteStaff: (sid) => {
        const s = get();
        set({ staff: s.staff.filter((x) => x.id !== sid) });
      },

      setCurrentStaff: (sid) => set({ currentStaffId: sid }),

      updateSettings: (patch) => {
        set((s) => ({ settings: { ...s.settings, ...patch } }));
        if (patch.theme) {
          if (typeof document !== "undefined") {
            document.documentElement.dataset.theme = patch.theme;
            document.documentElement.style.colorScheme = patch.theme;
          }
          // tiny mirror key so the pre-paint script can pick the theme up
          // without parsing the whole persisted store
          try {
            localStorage.setItem("nova-pos-theme", patch.theme);
          } catch {
            /* storage unavailable */
          }
        }
      },

      toast: (msg, kind = "ok") => {
        const t = { id: id("t_"), msg, kind };
        set((s) => ({ toasts: [...s.toasts, t] }));
        setTimeout(() => get().dismissToast(t.id), 2600);
      },

      dismissToast: (tid) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== tid) })),
    }),
    {
      name: "nova-pos-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        products: s.products,
        categories: s.categories,
        orders: s.orders,
        customers: s.customers,
        stockMoves: s.stockMoves,
        batches: s.batches,
        staff: s.staff,
        currentStaffId: s.currentStaffId,
        settings: s.settings,
        // an in-progress sale must survive a reload (a power cut must not lose it)
        cart: s.cart,
        cartCustomerId: s.cartCustomerId,
        cartDiscount: s.cartDiscount,
        cartUpdatedAt: s.cartUpdatedAt,
      }),
      onRehydrateStorage: () => (state) => {
        state?.rehydrate();
      },
    },
  ),
);

/* ------------------------------ convenience hooks ------------------------------ */

export function useSettings() {
  return usePos((s) => s.settings);
}

/** computes cart totals from current cart+products+discount */
export function useCartTotals() {
  const cart = usePos((s) => s.cart);
  const products = usePos((s) => s.products);
  const discount = usePos((s) => s.cartDiscount);
  const settings = usePos((s) => s.settings);
  const lines = cart
    .map((l) => {
      const p = products.find((x) => x.id === l.productId);
      return p ? { ...l, product: p } : null;
    })
    .filter(Boolean) as (CartLine & { product: Product })[];
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + (l.price ?? l.product.price) * l.qty, 0);
  const net = Math.max(0, subtotal - discount);
  const tax = taxAmount(net, settings.taxRate);
  // taxRate 0 → tax 0 → total is exactly the old subtotal - discount
  const total = tax > 0 && !settings.taxInclusive ? round2(net + tax) : net;
  return { lines, count, subtotal, discount, tax, total };
}

export function todayRange(now = Date.now()) {
  const start = startOfDay(now);
  return { start, end: now };
}
