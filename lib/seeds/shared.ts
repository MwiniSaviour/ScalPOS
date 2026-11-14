import type {
  Appointment,
  Batch,
  Category,
  Customer,
  Order,
  OrderItem,
  Package,
  Product,
  Recipe,
  RestaurantTable,
  Settings,
  StockMove,
} from "../types";
import type { Staff } from "../staff";

export const DAY = 86400000;
export const H = 3600000;

/**
 * Everything one business type needs to demo itself — the shop it sells in,
 * what it sells, who buys it and what it already sold.
 */
export type SeedBundle = {
  settings: Settings;
  categories: Category[];
  products: Product[];
  customers: Customer[];
  orders: Order[];
  stockMoves: StockMove[];
  batches: Batch[];
  recipes: Recipe[];
  tables: RestaurantTable[];
  staff: Staff[];
  appointments: Appointment[];
  packages: Package[];
};

/** The date part of a timestamp — "2026-11-13". A batch expiry is a plain date. */
export function isoDay(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** A timestamp `days` from now — negative days are in the past. */
export function daysFromNow(days: number, now: number): number {
  return now + days * DAY;
}

/** An order line for a product, priced from the product itself. */
export function line(
  product: Product,
  qty: number,
  extra?: Partial<OrderItem>,
): OrderItem {
  return {
    productId: product.id,
    name: product.name,
    imageUrl: product.imageUrl,
    qty,
    price: product.price,
    cost: product.cost,
    ...extra,
  };
}

export type PaymentSpec = {
  method: Order["payments"][0]["method"];
  amount: number;
  /** how long before now the payment landed; defaults to the order's own age */
  ago?: number;
  ref?: string;
};

/** Builds one seeded order from its parts — prices, totals and pay status. */
export function makeOrder(spec: {
  n: number;
  now: number;
  ago: number;
  items: OrderItem[];
  pay?: PaymentSpec[];
  status: Order["status"];
  customerId?: string | null;
  discount?: number;
  extra?: Partial<Order>;
}): Order {
  const pay = spec.pay ?? [];
  const discount = spec.discount ?? 0;
  const subtotal = spec.items.reduce((s, i) => s + i.price * i.qty, 0) - discount;
  const total = subtotal;
  const paid = pay.reduce((s, p) => s + p.amount, 0);
  return {
    id: `ORD${String(spec.n).padStart(7, "0")}`,
    items: spec.items,
    customerId: spec.customerId ?? null,
    subtotal: total,
    discount,
    total,
    // seed settings carry taxRate 0, so seeded sales carry no tax
    tax: 0,
    status: spec.status,
    payments: pay.map((p) => ({
      id: `py_${spec.n}_${p.method}`,
      method: p.method,
      amount: p.amount,
      t: spec.now - (p.ago ?? spec.ago),
      ref: p.ref,
    })),
    payStatus:
      spec.status === "refunded"
        ? "refunded"
        : paid >= total
          ? "paid"
          : pay.length && pay[0].amount > 0
            ? "partial"
            : "unpaid",
    createdAt: spec.now - spec.ago,
    completedAt: spec.status === "completed" ? spec.now - spec.ago : null,
    ...spec.extra,
  };
}

/** Finds a seeded product by id — the seeds know their own products. */
export function productOf(products: Product[], id: string): Product {
  const p = products.find((x) => x.id === id);
  if (!p) throw new Error(`seed product missing: ${id}`);
  return p;
}
