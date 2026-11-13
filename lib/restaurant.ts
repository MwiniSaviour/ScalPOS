import type { CartLine, OrderItem, Product, Recipe, Settings } from "./types";

/**
 * Restaurant helpers — pure functions over recipes, tabs and menu options.
 *
 * Kept free of store/browser imports so they can be unit tested and reused by
 * the sync engine and the desktop.
 */

/** The restaurant setup a shop runs with — see `Settings.restaurantConfig`. */
export type RestaurantSetup = NonNullable<Settings["restaurantConfig"]>;

/**
 * A food vendor is a takeaway-only shop: it has no tables to seat guests, and
 * every order leaves the counter. Same feature set as a restaurant minus
 * `tables` — the kitchen queue, modifiers and recipes all still work.
 */
export function foodVendorSetup(): RestaurantSetup {
  return { tables: false, orderTypes: ["takeaway"] };
}

/** A full restaurant seats guests at tables and also serves takeaway. */
export function restaurantSetup(): RestaurantSetup {
  return { tables: true, orderTypes: ["dine-in", "takeaway"] };
}

/**
 * The setup for a shop — a food vendor is a restaurant with the tables off.
 *
 * A fresh object every call, so a shop's settings never share the config with
 * another shop.
 */
export function restaurantSetupFor(foodVendor: boolean): RestaurantSetup {
  return foodVendor ? foodVendorSetup() : restaurantSetup();
}

/** Is this shop a takeaway-only food vendor? */
export function isFoodVendor(setup?: RestaurantSetup | null): boolean {
  return !!setup && setup.tables === false;
}

/**
 * The ticket number a restaurant calls an order by — "0004" out of
 * "ORD-20261112-0004". The full id stays on the receipt as the reference;
 * this is the short number the staff shouts across the room.
 */
export function ticketNumber(orderId: string): string {
  const parts = (orderId ?? "").trim().split("-");
  return parts[parts.length - 1] || orderId;
}

/**
 * How a service type reads on screen — "dine-in" becomes "Dine-in".
 * An unknown type keeps its own words, just capitalised.
 */
export function orderTypeLabel(orderType?: string | null): string {
  const raw = (orderType ?? "").trim();
  const key = raw.toLowerCase();
  if (!key) return "";
  if (key === "dine-in") return "Dine-in";
  if (key === "takeaway" || key === "take-away" || key === "take away") return "Takeaway";
  if (key === "delivery") return "Delivery";
  return raw.replace(/(^|[\s-])([a-z])/g, (_, p: string, c: string) => p + c.toUpperCase());
}

/**
 * The choices on a menu item line — the size and the extras the customer
 * picked, as they read on a receipt: "Large · Extra plantain".
 */
export function itemChoices(item: {
  variantName?: string;
  modifierNames?: string[];
}): string {
  return [item.variantName, ...(item.modifierNames ?? [])]
    .filter((s): s is string => !!s && !!s.trim())
    .join(" · ");
}

/** Options that make two order lines the same dish. */
export function sameOptions(
  a: { productId: string; variantId?: string; modifierIds?: string[] },
  b: { productId: string; variantId?: string; modifierIds?: string[] },
): boolean {
  if (a.productId !== b.productId) return false;
  if ((a.variantId ?? "") !== (b.variantId ?? "")) return false;
  const am = [...(a.modifierIds ?? [])].sort().join(",");
  const bm = [...(b.modifierIds ?? [])].sort().join(",");
  return am === bm;
}

/**
 * What one order line consumes from the ingredient shelf.
 *
 * A recipe line says "150 g of rice per dish", so a line of 2 dishes with 5%
 * waste takes 2 × 150 × 1.05 = 315 units of rice.
 */
export function itemConsumption(
  item: { productId: string; qty: number },
  recipes: Recipe[],
): { productId: string; qty: number }[] {
  const recipe = recipes.find((r) => r.productId === item.productId);
  if (!recipe) return [];
  const out: { productId: string; qty: number }[] = [];
  for (const line of recipe.lines) {
    // stock is held to three decimals, so the draw is rounded to match
    const qty = Math.round(item.qty * line.qty * (1 + (line.wastePct ?? 0) / 100) * 1000) / 1000;
    if (qty > 0) out.push({ productId: line.ingredientProductId, qty });
  }
  return out;
}

/** Total ingredient draw of a list of order lines. */
export function recipeDraw(
  items: { productId: string; qty: number }[],
  recipes: Recipe[],
): Map<string, number> {
  const out = new Map<string, number>();
  for (const item of items) {
    for (const c of itemConsumption(item, recipes)) {
      out.set(c.productId, (out.get(c.productId) ?? 0) + c.qty);
    }
  }
  return out;
}

/** The ingredient draw that changed between two versions of an order. */
export function recipeDelta(
  before: { productId: string; qty: number }[],
  after: { productId: string; qty: number }[],
  recipes: Recipe[],
): Map<string, number> {
  const a = recipeDraw(before, recipes);
  const b = recipeDraw(after, recipes);
  const out = new Map<string, number>();
  for (const [pid, qty] of b) {
    const d = qty - (a.get(pid) ?? 0);
    if (Math.abs(d) > 1e-9) out.set(pid, d);
  }
  for (const [pid, qty] of a) {
    if (!b.has(pid) && Math.abs(qty) > 1e-9) out.set(pid, -qty);
  }
  return out;
}

/** Does this menu item have a recipe (so its own stock is not counted)? */
export function hasRecipe(productId: string, recipes: Recipe[]): boolean {
  return recipes.some((r) => r.productId === productId);
}

/** Build an order item from a cart line. */
export function itemFromLine(
  line: CartLine,
  product: Product,
): Omit<OrderItem, "baseQty" | "recipeConsumption"> & {
  baseQty: number;
  recipeConsumption?: { productId: string; qty: number }[];
} {
  const factor = 1;
  const price = line.price ?? product.price;
  return {
    productId: product.id,
    name: product.name,
    imageUrl: product.imageUrl,
    qty: line.qty,
    price,
    cost: product.cost * factor,
    baseQty: line.qty * factor,
    ...(line.variantId ? { variantId: line.variantId } : {}),
    ...(line.variantName ? { variantName: line.variantName } : {}),
    ...(line.modifierIds && line.modifierIds.length ? { modifierIds: line.modifierIds } : {}),
    ...(line.modifierNames && line.modifierNames.length
      ? { modifierNames: line.modifierNames }
      : {}),
  };
}

/**
 * Merge a cart into the items already on an open tab.
 *
 * A line already on the tab is adjusted by the difference (so lowering the
 * quantity on screen lowers it on the tab); a line that is not on the tab yet
 * is appended.
 */
export function mergeTabItems(
  existing: OrderItem[],
  cart: CartLine[],
  products: Product[],
  recipes: Recipe[] = [],
): OrderItem[] {
  const out = existing.map((i) => ({ ...i }));
  for (const line of cart) {
    const p = products.find((x) => x.id === line.productId);
    if (!p) continue;
    const idx = out.findIndex((i) => sameOptions(i, line));
    if (idx >= 0) {
      const delta = line.qty - out[idx].qty;
      if (delta !== 0) {
        const next = { ...out[idx], qty: out[idx].qty + delta };
        out[idx] = next;
      }
      if (out[idx].qty <= 0) out.splice(idx, 1);
    } else {
      const built = itemFromLine(line, p);
      out.push(built as OrderItem);
    }
  }
  return out.map((i) => {
    const consumption = itemConsumption(i, recipes);
    return consumption.length > 0 ? { ...i, recipeConsumption: consumption } : i;
  });
}

/**
 * The ingredients a refunded order puts back on the shelf.
 *
 * A refund credits exactly what the sale took — recorded on the order line —
 * so a recipe edited since the sale cannot distort the credit.
 */
export function planRestockIngredients(items: OrderItem[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const i of items) {
    for (const c of i.recipeConsumption ?? []) {
      out.set(c.productId, (out.get(c.productId) ?? 0) + c.qty);
    }
  }
  return out;
}

/**
 * Is a menu item off the menu today?
 *
 * `unavailableUntil` is the **last day** the item is off the menu: it is
 * unavailable on that date and on every date before it. The daily case — a
 * kitchen marks a dish off for today — therefore clears itself the next
 * morning.
 */
export function isUnavailableToday(product: Product, now: number = Date.now()): boolean {
  if (!product.unavailableUntil) return false;
  const until = Date.parse(`${product.unavailableUntil}T00:00:00Z`);
  if (!Number.isFinite(until)) return false;
  const d = new Date(now);
  const todayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return until >= todayStart;
}
