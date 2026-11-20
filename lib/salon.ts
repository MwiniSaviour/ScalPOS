import type { Customer, Order, OrderItem, Package, Product } from "./types";
import type { Staff } from "./staff";

/**
 * Salon helpers — pure functions over visits, package credits and commissions.
 *
 * Kept free of store/browser imports so they can be unit tested and reused by
 * the sync engine and the desktop.
 */

/**
 * How many credits of one package a client still owns.
 *
 * Credits live on the customer row — one entry per package bought — so a
 * client who bought the same package twice owns the sum of both.
 */
export function creditsOf(
  customer: Customer | null | undefined,
  packageId: string,
): number {
  if (!customer) return 0;
  let total = 0;
  for (const c of customer.packageCredits ?? []) {
    if (c.packageId === packageId) total += Math.max(0, c.remaining);
  }
  return total;
}

/**
 * Spend credits from a client's package entries.
 *
 * The oldest entry of a package is spent first, and a balance never goes
 * below zero — what the client did not own was priced normally at sale time.
 */
export function spendCredits(
  entries: { packageId: string; remaining: number }[],
  spend: Map<string, number>,
): { packageId: string; remaining: number }[] {
  const left = new Map(spend);
  return entries.map((e) => {
    const take = Math.min(Math.max(0, e.remaining), left.get(e.packageId) ?? 0);
    if (take <= 0) return e;
    left.set(e.packageId, (left.get(e.packageId) ?? 0) - take);
    return { ...e, remaining: e.remaining - take };
  });
}

/**
 * Give credits back to a client — a refunded visit returns what it used.
 *
 * The credits land on the client's oldest entry of that package, or on a new
 * entry when the package was fully consumed already.
 */
export function restoreCredits(
  entries: { packageId: string; remaining: number }[],
  restore: Map<string, number>,
): { packageId: string; remaining: number }[] {
  const out = entries.map((e) => ({ ...e }));
  for (const [packageId, amount] of restore) {
    if (amount <= 0) continue;
    const entry = out.find((e) => e.packageId === packageId);
    if (entry) entry.remaining += amount;
    else out.push({ packageId, remaining: amount });
  }
  return out;
}

/**
 * Void the credits of a package that was bought and then refunded.
 *
 * Credits already spent stay spent — only what is left is thrown away.
 */
export function voidCredits(
  entries: { packageId: string; remaining: number }[],
  packageId: string,
): { packageId: string; remaining: number }[] {
  return entries.map((e) => (e.packageId === packageId ? { ...e, remaining: 0 } : e));
}

/**
 * Void the credits granted by one purchase.
 *
 * Credits live on the client as entries, one per purchase. Refunding a
 * package purchase must only throw away what that purchase granted — an
 * earlier purchase of the same package keeps its credits. Entries carry the
 * order that granted them; when the order is older than that bookkeeping
 * (or the entry was edited), every remaining credit of the package goes.
 */
export function voidCreditsFrom(
  entries: { packageId: string; remaining: number; sourceOrderId?: string }[],
  packageId: string,
  sourceOrderId?: string,
): { packageId: string; remaining: number; sourceOrderId?: string }[] {
  if (!sourceOrderId) return voidCredits(entries, packageId);
  const granted = entries.some(
    (e) => e.packageId === packageId && e.sourceOrderId === sourceOrderId,
  );
  if (!granted) return voidCredits(entries, packageId);
  return entries.map((e) =>
    e.packageId === packageId && e.sourceOrderId === sourceOrderId
      ? { ...e, remaining: 0 }
      : e,
  );
}

/**
 * The staff member who served most of the lines — the visit's owner.
 *
 * Ties go to the first one seen, so the stamp is stable for a given order.
 */
export function primaryStaffOf(items: OrderItem[]): string | undefined {
  const counts = new Map<string, number>();
  for (const i of items) {
    if (!i.serviceStaffId) continue;
    counts.set(i.serviceStaffId, (counts.get(i.serviceStaffId) ?? 0) + i.qty);
  }
  let best: string | undefined;
  let bestCount = 0;
  for (const [sid, n] of counts) {
    if (n > bestCount) {
      best = sid;
      bestCount = n;
    }
  }
  return best;
}

/**
 * What one line earns its staff member.
 *
 * The commission is on the whole line (price × qty), not on one unit — a
 * stylist who does two braids earns on both.
 */
export function commissionOf(
  line: { price: number; qty: number; serviceStaffId?: string },
  staff: Staff[],
): number {
  if (!line.serviceStaffId) return 0;
  const member = staff.find((s) => s.id === line.serviceStaffId);
  const pct = member?.commissionPct ?? 0;
  if (pct <= 0) return 0;
  return Math.round(((line.price * line.qty * pct) / 100) * 100) / 100;
}

/** Is this order line a service — something that never touches stock? */
export function isServiceLine(line: OrderItem): boolean {
  return line.kind === "service";
}

/**
 * The initials a receipt shows for the person who served a line.
 *
 * "Akua Mensah" becomes "AM", a single name becomes its first two letters.
 */
export function staffInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * What a package credit paid for on a line.
 *
 * The credits cover whole units of a service, so the value served is the
 * catalogue price of the covered units — the money the client did not pay.
 */
export function creditValueOf(
  line: { useCredit?: boolean; creditedQty?: number },
  cataloguePrice: number,
): number {
  if (!line.useCredit || !line.creditedQty) return 0;
  return Math.round(cataloguePrice * line.creditedQty * 100) / 100;
}

/**
 * What a package holds, in words — "4 × Manicure, 2 × Pedicure".
 *
 * Used on receipts so the client sees what they bought, not just a name.
 */
export function packageContents(
  pkg: Pick<Package, "credits">,
  products: Pick<Product, "id" | "name">[],
): string {
  return pkg.credits
    .map((c) => {
      const name = products.find((p) => p.id === c.productId)?.name ?? "Service";
      return `${c.qty} × ${name}`;
    })
    .join(", ");
}

/** What a receipt and the order detail say about one line. */
export type LineLabels = {
  /** the initials of the person who served the line */
  staffInitials?: string;
  /** the line was paid for with package credits */
  credit: boolean;
  /** what a package purchase holds */
  packageSummary?: string;
};

/**
 * The labels one order line carries on a receipt.
 *
 * A service line names the stylist who served it, a credit line is tagged as
 * paid for by a package, and a package purchase lists what it holds.
 */
export function lineLabels(
  item: OrderItem,
  ctx: {
    staff: Pick<Staff, "id" | "name">[];
    packages?: Pick<Package, "id" | "credits">[];
    products?: Pick<Product, "id" | "name">[];
  },
): LineLabels {
  const member = item.serviceStaffId
    ? ctx.staff.find((s) => s.id === item.serviceStaffId)
    : undefined;
  // only a package *purchase* lists what the package holds — a line paid for
  // with credits already names the service it paid for
  const pkg =
    item.packageId && !item.useCredit ? ctx.packages?.find((p) => p.id === item.packageId) : undefined;
  return {
    staffInitials: member ? staffInitials(member.name) : undefined,
    credit: !!item.useCredit,
    packageSummary:
      pkg && ctx.products
        ? packageContents(pkg, ctx.products)
        : undefined,
  };
}

/** One stylist's earnings over a period. */
export type CommissionRow = {
  staffId: string;
  name: string;
  /** the visits this stylist served */
  visits: number;
  /** what the clients were charged for the work */
  revenue: number;
  /** what package credits covered */
  creditValue: number;
  /** the commission earned */
  commission: number;
};

export type CommissionReport = {
  rows: CommissionRow[];
  totals: { visits: number; revenue: number; creditValue: number; commission: number };
};

/**
 * What every stylist earned over a set of orders.
 *
 * Visits are counted per order, revenue is what the clients were charged for
 * the lines the stylist served, and the credit value is the part of that work
 * package credits paid for — the two together are the full value of the work.
 * Commission comes from the amount stamped on the line at sale time, so a
 * later rate change never rewrites past earnings.
 */
export function commissionReport(
  orders: Order[],
  staff: Pick<Staff, "id" | "name">[],
  products: Pick<Product, "id" | "price">[],
): CommissionReport {
  const byStaff = new Map<string, CommissionRow & { orderIds: Set<string> }>();
  for (const order of orders) {
    if (order.status === "refunded") continue;
    for (const item of order.items) {
      if (!item.serviceStaffId) continue;
      const member = staff.find((s) => s.id === item.serviceStaffId);
      const row = byStaff.get(item.serviceStaffId) ?? {
        staffId: item.serviceStaffId,
        name: member?.name ?? "Unknown",
        visits: 0,
        revenue: 0,
        creditValue: 0,
        commission: 0,
        orderIds: new Set<string>(),
      };
      row.orderIds.add(order.id);
      row.revenue += item.price * item.qty;
      row.creditValue += creditValueOf(
        item,
        products.find((p) => p.id === item.productId)?.price ?? 0,
      );
      row.commission += item.commissionAmt ?? 0;
      byStaff.set(item.serviceStaffId, row);
    }
  }
  const rows = [...byStaff.values()]
    .map(({ orderIds, ...row }) => ({ ...row, visits: orderIds.size }))
    .sort((a, b) => b.commission - a.commission || b.revenue - a.revenue);
  const totals = rows.reduce(
    (acc, r) => ({
      visits: acc.visits + r.visits,
      revenue: acc.revenue + r.revenue,
      creditValue: acc.creditValue + r.creditValue,
      commission: acc.commission + r.commission,
    }),
    { visits: 0, revenue: 0, creditValue: 0, commission: 0 },
  );
  return { rows, totals };
}

/**
 * What a credit line costs.
 *
 * A credit pays for as much of the line as the client still owns; the rest is
 * priced normally.
 */
export function creditPrice(
  normalPrice: number,
  qty: number,
  covered: number,
): number {
  if (covered <= 0) return normalPrice;
  if (covered >= qty) return 0;
  return Math.round((normalPrice * (qty - covered)) / qty * 100) / 100;
}

/** The bits of a cart line that decide what one unit of it costs. */
export type CreditPricedLine = {
  qty: number;
  /** the line's own unit price (pack or variant override), if any */
  price?: number;
  useCredit?: boolean;
  packageId?: string;
  /** the product's shelf price — what the uncovered part costs */
  normalPrice: number;
};

/**
 * The unit price of every cart line once package credits are applied.
 *
 * Mirrors `placeOrder`: a line marked `useCredit` spends the client's oldest
 * credits of that package first, qty by qty, so two credit lines can never
 * claim the same credit. Whatever the credits do not cover is priced
 * normally. Without a client, or without a package on the line, the line is
 * priced as usual.
 */
export function creditAwareUnitPrices(
  lines: CreditPricedLine[],
  customer: Customer | null | undefined,
): number[] {
  const balances = new Map<string, number>();
  for (const c of customer?.packageCredits ?? []) {
    balances.set(c.packageId, (balances.get(c.packageId) ?? 0) + Math.max(0, c.remaining));
  }
  return lines.map((l) => {
    const normal = l.price ?? l.normalPrice;
    if (!l.useCredit || !l.packageId) return normal;
    const balance = balances.get(l.packageId) ?? 0;
    const covered = Math.min(balance, l.qty);
    if (covered <= 0) return normal;
    balances.set(l.packageId, balance - covered);
    return creditPrice(l.normalPrice, l.qty, covered);
  });
}
