import type { Customer, OrderItem } from "./types";
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
