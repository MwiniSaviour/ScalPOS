"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { defaultSettings } from "./seed";
import { id, orderId, startOfDay } from "./format";
import { pruneImages } from "./image-store";
import { readConnection, type SyncConnection } from "./api/bootstrap";
import { notifyLocal } from "./notify";
import { insertLowStockNotification } from "./api/notifications";
import type {
  Category,
  CartLine,
  Customer,
  Order,
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
  addToCart: (productId: string, qty?: number) => void;
  setCartQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  setCartCustomer: (cid: string | null) => void;
  setCartDiscount: (n: number) => void;
  addDraftPayment: (p: CartDraftPayment) => void;
  clearDraftPayments: () => void;

  /* orders */
  placeOrder: (payments: Payment[]) => Order | null;
  addPaymentsToOrder: (oid: string, payments: Array<{ method: PaymentMethod; amount: number; ref?: string }>) => void;
  refundOrder: (oid: string, reason?: string) => void;
  setPendingToCompleted: (oid: string) => void;

  /* inventory */
  upsertProduct: (p: Partial<Product> & { name: string; price: number }) => Product;
  upsertCategory: (c: Partial<Category> & { name: string; color?: string }) => Category;

  adjustStock: (productId: string, qtyDelta: number, reason: StockReason, ref?: string) => void;
  deleteProduct: (pid: string) => void;

  /* customers */
  upsertCustomer: (c: Partial<Customer> & { name: string }) => Customer;
  deleteCustomer: (cid: string) => void;

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
        if (persisted === null) {
          set({ hydrated: true });
          return;
        }
        set({ hydrated: true });
        // a cart left open for hours is not a sale — drop it
        const s = get();
        if (s.cart.length > 0 && Date.now() - s.cartUpdatedAt > 12 * 60 * 60 * 1000) {
          set({ cart: [], cartCustomerId: null, cartDiscount: 0, cartUpdatedAt: 0 });
        }
        // sweep photos no product or order references any more
        const refs = [
          ...s.products.map((p) => p.imageUrl),
          ...s.orders.flatMap((o) => o.items.map((i) => i.imageUrl)),
        ];
        void pruneImages(refs);
      },

      addToCart: (pid, qty = 1) => {
        const p = get().products.find((x) => x.id === pid);
        if (!p) return;
        const cart = [...get().cart];
        const i = cart.findIndex((l) => l.productId === pid);
        const want = (i >= 0 ? cart[i].qty : 0) + qty;
        const capped = Math.min(want, p.stock <= 0 ? 0 : p.stock);
        if (capped <= 0) {
          get().toast("Out of stock", "error");
          return;
        }
        if (capped < want) get().toast(`Only ${p.stock} left`, "warn");
        if (i >= 0) cart[i] = { ...cart[i], qty: capped };
        else cart.push({ productId: pid, qty: capped });
        set({ cart, cartUpdatedAt: Date.now() });
      },

      setCartQty: (pid, qty) => {
        const p = get().products.find((x) => x.id === pid);
        if (!p) return;
        let cart = [...get().cart];
        const i = cart.findIndex((l) => l.productId === pid);
        if (i < 0) return;
        const capped = Math.max(0, Math.min(qty, Math.max(0, p.stock)));
        if (capped === 0) cart = cart.filter((l) => l.productId !== pid);
        else cart[i] = { ...cart[i], qty: capped };
        set({ cart, cartUpdatedAt: Date.now() });
        set({ cart });
      },

      clearCart: () =>
        set({ cart: [], cartDiscount: 0, cartCustomerId: null, draftPayments: [], cartUpdatedAt: 0 }),

      setCartCustomer: (cid) => set({ cartCustomerId: cid, cartUpdatedAt: Date.now() }),

      setCartDiscount: (n) => set({ cartDiscount: Math.max(0, n), cartUpdatedAt: Date.now() }),

      addDraftPayment: (p) => set((s) => ({ draftPayments: [...s.draftPayments, p] })),
      clearDraftPayments: () => set({ draftPayments: [] }),

      placeOrder: (payments) => {
        const s = get();
        if (s.cart.length === 0) return null;
        const now = Date.now();
        const items = s.cart.map((l) => {
          const p = s.products.find((x) => x.id === l.productId)!;
          return { productId: p.id, name: p.name, imageUrl: p.imageUrl, qty: l.qty, price: p.price, cost: p.cost };
        });
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

        // stock moves: one per order line item, count is total sold qty
        const moves: StockMove[] = items.map((i) => ({
          id: id("mv_"),
          productId: i.productId,
          qty: -i.qty,
          reason: "sale",
          ref: order.id,
          t: now,
        }));
        const products = s.products.map((p) => {
          const sold = items.filter((i) => i.productId === p.id).reduce((q, i) => q + i.qty, 0);
          return sold > 0 ? { ...p, stock: Math.max(0, p.stock - sold), updatedAt: now } : p;
        });

        const orderNo = s.settings.nextOrderNo + 1;

        set({
          orders: [order, ...s.orders],
          products,
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
        const moves: StockMove[] = order.items.map((i) => ({
          id: id("mv_"),
          productId: i.productId,
          qty: i.qty,
          reason: "return",
          ref: order.id,
          t: now,
        }));
        const products = s.products.map((p) => {
          const back = order.items.filter((i) => i.productId === p.id).reduce((q, i) => q + i.qty, 0);
          return back > 0 ? { ...p, stock: p.stock + back, updatedAt: now } : p;
        });
        const orders = s.orders.map((o) =>
          o.id === oid ? { ...o, status: "refunded" as const, payStatus: "refunded" as const } : o,
        );
        set({ orders, products, stockMoves: [...moves, ...s.stockMoves] });
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
        if (existing) {
          saved = { ...existing, ...patch, name: patch.name, updatedAt: now } as Product;
          const stockDelta = (patch.stock ?? existing.stock) - existing.stock;
          set({
            products: s.products.map((p) => (p.id === existing.id ? saved : p)),
            stockMoves:
              stockDelta !== 0
                ? [
                    { id: id("mv_"), productId: saved.id, qty: stockDelta, reason: "adjust", ref: "product edit", t: now },
                    ...s.stockMoves,
                  ]
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
        const products = s.products.map((p) =>
          p.id === pid ? { ...p, stock: Math.max(0, p.stock + delta), updatedAt: now } : p,
        );
        set({
          products,
          stockMoves: [{ id: id("mv_"), productId: pid, qty: delta, reason, ref, t: now }, ...s.stockMoves],
        });
        fireLowStockAlerts(s.products, products);
      },

      deleteProduct: (pid) => {
        const s = get();
        set({
          products: s.products.filter((p) => p.id !== pid),
          cart: s.cart.filter((l) => l.productId !== pid),
          cartUpdatedAt: Date.now(),
        });
        get().toast("Product deleted", "ok");
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
    .filter(Boolean) as { productId: string; qty: number; product: Product }[];
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
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
