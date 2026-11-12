import type { Batch, BatchAllocation, CartLine, OrderItem, Product } from "./types";

/**
 * Pharmacy helpers — pure functions over batches, packs and cart lines.
 *
 * Kept free of store/browser imports so they can be unit tested and reused by
 * the sync engine.
 */

/**
 * Cart line identity. A base-unit line is keyed by product id; a pack line is
 * keyed by product id + pack index so the same product can sit in the cart
 * once per pack size.
 */
export function cartLineKey(l: { productId: string; packIdx?: number }): string {
  return l.packIdx === undefined ? l.productId : `${l.productId}#${l.packIdx}`;
}

/** How many base units one sold unit of this line consumes. */
export function packFactor(product: Product | undefined, packIdx: number | undefined): number {
  if (packIdx === undefined || !product?.packs) return 1;
  const f = product.packs[packIdx]?.factor;
  return typeof f === "number" && Number.isFinite(f) && f > 0 ? f : 1;
}

/** The pack size (name) sold on this line, if any. */
export function linePackName(
  product: Product | undefined,
  packIdx: number | undefined,
): string | undefined {
  if (packIdx === undefined || !product?.packs) return undefined;
  return product.packs[packIdx]?.name;
}

/** Batches of one product, earliest expiry first (no expiry sorts last). */
export function batchesOf(batches: Batch[], productId: string): Batch[] {
  return batches
    .filter((b) => b.productId === productId)
    .sort((a, b) => {
      const ea = a.expiry || "9999-12-31";
      const eb = b.expiry || "9999-12-31";
      if (ea !== eb) return ea < eb ? -1 : 1;
      return a.createdAt - b.createdAt;
    });
}

/** Derived stock of a batched product = sum of its batches. */
export function batchStock(batches: Batch[], productId: string): number {
  return batches.filter((b) => b.productId === productId).reduce((s, b) => s + b.qty, 0);
}

/**
 * FEFO allocation: take `qty` base units from the earliest-expiring batches
 * that still hold stock.
 */
export function feofAllocate(
  batches: Batch[],
  productId: string,
  qty: number,
): { allocations: BatchAllocation[]; taken: number } {
  const allocations: BatchAllocation[] = [];
  let left = Math.max(0, qty);
  for (const b of batchesOf(batches, productId)) {
    if (left <= 0) break;
    if (b.qty <= 0) continue;
    const take = Math.min(left, b.qty);
    allocations.push({ batchId: b.id, qty: take });
    left -= take;
  }
  return { allocations, taken: Math.max(0, qty - left) };
}

/** Days from today until an expiry date; negative when already expired. */
export function daysToExpiry(expiry: string, now: number = Date.now()): number | null {
  if (!expiry) return null;
  const t = Date.parse(`${expiry}T00:00:00Z`);
  if (!Number.isFinite(t)) return null;
  const today = Date.UTC(
    new Date(now).getUTCFullYear(),
    new Date(now).getUTCMonth(),
    new Date(now).getUTCDate(),
  );
  return Math.round((t - today) / 86400000);
}

/** Expiry buckets used by the pharmacy expiry report. */
export type ExpiryBucket = "expired" | "soon30" | "soon90" | "later";

export function expiryBucket(expiry: string, now: number = Date.now()): ExpiryBucket {
  const days = daysToExpiry(expiry, now);
  if (days === null) return "later";
  if (days < 0) return "expired";
  if (days <= 30) return "soon30";
  if (days <= 90) return "soon90";
  return "later";
}

/* ------------------------------- sale planning ------------------------------- */

export type CartLinePlan = {
  line: CartLine;
  product: Product;
  /** base units this line consumes (packs multiply by their factor) */
  baseQty: number;
  factor: number;
  allocations: BatchAllocation[];
  packName?: string;
};

export type SalePlan = {
  lines: CartLinePlan[];
  /** base units drawn from each batch */
  batchDraw: Map<string, number>;
  /** base units sold per product that has no batches */
  productSold: Map<string, number>;
  /** base units that could not be covered by stock */
  shortfall: number;
  /** the product that ran short, for the error message */
  shortageProduct?: string;
};

/**
 * Work out what a sale takes off the shelf.
 *
 * A product that owns batches is filled FEFO — the earliest-expiring batch
 * first — whatever the shop type is, so the derived stock of a batched
 * product can never drift from its batches. Every other product is sold from
 * its own stock count.
 */
export function planSale(
  cart: CartLine[],
  products: Product[],
  batches: Batch[],
): SalePlan {
  const lines: CartLinePlan[] = [];
  const batchDraw = new Map<string, number>();
  const productSold = new Map<string, number>();
  let shortfall = 0;
  let shortageProduct: string | undefined;

  for (const l of cart) {
    const p = products.find((x) => x.id === l.productId);
    if (!p) continue;
    const factor = packFactor(p, l.packIdx);
    const baseQty = l.qty * factor;
    const isBatched = batches.some((b) => b.productId === p.id);
    let allocations: BatchAllocation[] = [];
    if (isBatched) {
      const r = feofAllocate(batches, p.id, baseQty);
      allocations = r.allocations;
      if (r.taken < baseQty) {
        shortfall += baseQty - r.taken;
        shortageProduct ??= p.name;
      }
      for (const a of allocations) {
        batchDraw.set(a.batchId, (batchDraw.get(a.batchId) ?? 0) + a.qty);
      }
    } else {
      productSold.set(p.id, (productSold.get(p.id) ?? 0) + baseQty);
    }
    const packName = linePackName(p, l.packIdx);
    lines.push({
      line: l,
      product: p,
      baseQty,
      factor,
      allocations,
      ...(packName ? { packName } : {}),
    });
  }

  return { lines, batchDraw, productSold, shortfall, ...(shortageProduct ? { shortageProduct } : {}) };
}

export type RestockPlan = {
  /** base units returned to each batch */
  batchBack: Map<string, number>;
  /** base units returned to products without batches */
  productBack: Map<string, number>;
};

/**
 * Work out where a refund puts the stock back: into the exact batches the
 * sale came out of, or onto the product itself.
 */
export function planRestock(items: OrderItem[]): RestockPlan {
  const batchBack = new Map<string, number>();
  const productBack = new Map<string, number>();
  for (const i of items) {
    const allocations = i.batchAllocations ?? [];
    if (allocations.length > 0) {
      for (const a of allocations) {
        batchBack.set(a.batchId, (batchBack.get(a.batchId) ?? 0) + a.qty);
      }
    } else {
      const qty = i.baseQty ?? i.qty;
      productBack.set(i.productId, (productBack.get(i.productId) ?? 0) + qty);
    }
  }
  return { batchBack, productBack };
}
