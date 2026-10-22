"use client";

import { Card } from "@/components/ui/card";
import { ChevronRight, CircleUserRound } from "lucide-react";
import { dateLong, timeAgo } from "@/lib/format";
import { fmtMoney } from "@/lib/money";
import { paidOf, usePos } from "@/lib/store";
import { useNow } from "@/lib/now";
import { cn } from "@/lib/ui";
import Link from "next/link";
import { useMemo } from "react";

function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export default function HomeScreen() {
  const orders = usePos((s) => s.orders);
  const products = usePos((s) => s.products);
  const customers = usePos((s) => s.customers);
  const settings = usePos((s) => s.settings);
  const now = useNow();
  const dayStart = startOfDay(now);

  const kpis = useMemo(() => {
    const today = orders.filter((o) => o.createdAt >= dayStart && o.status !== "refunded");
    const sales = today.reduce((s, o) => s + o.total, 0);
    const collected = today.reduce((s, o) => s + paidOf(o), 0);
    const pending = orders.filter((o) => o.status === "pending").length;
    const out = products.filter((p) => p.stock <= 0).length;
    const low = products.filter((p) => p.stock > 0 && p.stock <= p.lowStockAt).length;
    return { sales, collected, unpaid: Math.max(sales - collected, 0), txn: today.length, pending, lowStock: low + out };
  }, [orders, products, dayStart]);

  const attention = kpis.pending > 0 || kpis.lowStock > 0;
  const recent = orders.slice(0, 3);

  return (
    <div className="anim-fade px-5 pt-4">
      <div className="safe-t" />
      {/* header — shop name, date, owner avatar */}
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[26px]/7 font-bold tracking-[-0.02em] break-words text-ink">{settings.shopName}</h1>
          <p className="mt-0.5 text-[15px] text-ink3">{now > 0 ? dateLong(now) : ""}</p>
        </div>
        {/* account — switches to the uploaded profile photo once accounts/roles land */}
        <Link href="/more" aria-label="My account" className="press mt-0.5 shrink-0">
          <span className="flex size-10 items-center justify-center rounded-full border border-line2 bg-surface text-ink2">
            <CircleUserRound className="size-[23px]" />
          </span>
        </Link>
      </header>

      {/* today's sales */}
      <Link href="/reports" className="press mt-5 block">
        <Card>
          <div className="flex items-center justify-between px-4 pt-3.5">
            <span className="text-[15px] font-semibold text-ink">Today&rsquo;s sales</span>
            <span className="text-[14px] text-ink3">
              {kpis.txn} sale{kpis.txn === 1 ? "" : "s"}
            </span>
          </div>
          <p className="tabnum px-4 pt-1 pb-4 text-[34px] font-extrabold leading-[44px] tracking-[-0.03em] text-ink">
            {fmtMoney(kpis.sales)}
          </p>
          <div className="grid grid-cols-2 border-t border-line">
            <div className="border-r border-line px-4 py-3">
              <p className="text-[14px] text-ink2">Collected</p>
              <p className="tabnum text-[16px] font-medium text-ink">{fmtMoney(kpis.collected)}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[14px] text-ink2">Unpaid</p>
              <p className={cn("tabnum text-[16px] font-medium", kpis.unpaid > 0 ? "text-warn" : "text-ink")}>
                {fmtMoney(kpis.unpaid)}
              </p>
            </div>
          </div>
        </Card>
      </Link>

      {/* needs attention */}
      {attention && (
        <section className="mt-6">
          <h2 className="text-[15px] font-medium text-ink2">Needs attention</h2>
          <Card inset className="mt-2.5">
            {kpis.pending > 0 && (
              <Link
                href="/orders?filter=pending"
                className="press flex items-center gap-3 px-4 py-3.5 hover:bg-surface2/50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-semibold text-ink">Pending orders</span>
                  <span className="block text-[14px] text-ink3">Waiting to be fulfilled</span>
                </span>
                <span className="tabnum text-[17px] font-bold text-ink">{kpis.pending}</span>
                <ChevronRight className="size-4 shrink-0 text-ink3" />
              </Link>
            )}
            {kpis.lowStock > 0 && (
              <Link
                href="/inventory?filter=low"
                className="press flex items-center gap-3 px-4 py-3.5 hover:bg-surface2/50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-semibold text-ink">Low stock</span>
                  <span className="block text-[14px] text-ink3">Items running low</span>
                </span>
                <span className="tabnum text-[17px] font-bold text-ink">{kpis.lowStock}</span>
                <ChevronRight className="size-4 shrink-0 text-ink3" />
              </Link>
            )}
          </Card>
        </section>
      )}

      {/* recent orders */}
      <section className="mt-6 pb-6">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-medium text-ink2">Recent orders</h2>
          <Link href="/orders" className="press whitespace-nowrap text-[15px] font-medium text-accent">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <Card className="mt-2.5 px-4 py-6 text-center">
            <p className="text-[14px] text-ink3">
              No orders yet — tap <span className="font-semibold text-ink">New sale</span> to start.
            </p>
          </Card>
        ) : (
          <Card inset className="mt-2.5">
            {recent.map((o) => {
              const c = customers.find((x) => x.id === o.customerId);
              const first = o.items[0];
              const qty = o.items.reduce((s, i) => s + i.qty, 0);
              const summary =
                o.items.length === 1 ? `${first?.name ?? "Item"} × ${first?.qty ?? 1}` : `${qty} item${qty === 1 ? "" : "s"}`;
              const unpaid = o.payStatus === "unpaid" || o.payStatus === "partial";
              return (
                <Link
                  key={o.id}
                  href={`/orders/detail?id=${o.id}`}
                  className="press flex items-center gap-3 px-4 py-3.5 hover:bg-surface2/50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] font-semibold leading-tight text-ink">
                      {c?.name ?? "Walk-in"}
                    </span>
                    <span className="mt-1 block truncate text-[14px] text-ink3">
                      {`${timeAgo(o.createdAt, now)} · ${summary}`}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="tabnum text-[17px] font-bold text-ink">{fmtMoney(o.total)}</span>
                    {unpaid ? (
                      <span className="flex items-center gap-1.5 text-[14px] font-medium text-warn">
                        <span className="size-1.5 rounded-full bg-warn" /> Unpaid
                      </span>
                    ) : (
                      <span className="text-[14px] text-ink3">Paid</span>
                    )}
                  </span>
                </Link>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}
