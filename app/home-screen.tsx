"use client";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/emptystate";
import { QuickTile } from "@/components/ui/quicktile";
import { StatusPill } from "@/components/ui/statuspill";
import { timeAgo, startOfDay, greeting } from "@/lib/format";
import { fmtMoney } from "@/lib/money";
import { usePos } from "@/lib/store";
import { useNow } from "@/lib/now";
import { cn } from "@/lib/ui";
import {
  ChevronRight,
  Receipt,
  Scan,
  ShoppingCart,
  SquarePlus,
  TriangleAlert,
  Users,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

export default function HomeScreen() {
  const router = useRouter();
  const products = usePos((s) => s.products);
  const orders = usePos((s) => s.orders);
  const customers = usePos((s) => s.customers);
  const settings = usePos((s) => s.settings);
  const now = useNow();
  const dayStart = startOfDay(now);

  const kpis = useMemo(() => {
    const today = orders.filter((o) => o.createdAt >= dayStart && o.status !== "refunded");
    const sales = today.reduce((s, o) => s + o.total, 0);
    const pending = orders.filter((o) => o.status === "pending").length;
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.lowStockAt).length;
    const out = products.filter((p) => p.stock <= 0).length;
    return { sales, txn: today.length, pending, lowStock: lowStock + out, out, customers: customers.length };
  }, [orders, products, customers, dayStart]);

  const recent = useMemo(() => orders.slice(0, 4), [orders]);

  return (
    <div className="anim-fade">
      <header className="safe-t h-2" />

      {/* greeting hero */}
      <section className="px-4 pt-1 pb-2">
        <p className="text-[13px] font-medium text-ink3">{greeting(now)}</p>
        <div className="mt-0.5 flex items-start gap-3">
          <h1 className="min-w-0 flex-1 text-[24px]/8 font-bold tracking-[-0.025em] break-words text-ink">
            {settings.shopName}
          </h1>
          <Link
            href="/sell"
            className="press flex h-11 shrink-0 items-center gap-2 rounded-xl bg-accent px-3.5 font-semibold text-accentink"
          >
            <ShoppingCart className="size-[17px]" />
            <span className="text-[14px]">New sale</span>
          </Link>
        </div>
      </section>

      {/* today's sales — the one primary figure */}
      <section className="px-4 pt-2">
        <Link href="/reports" className="press block">
          <p className="text-[12px] font-semibold uppercase tracking-[.06em] text-ink3">Today&apos;s sales</p>
          <p className="tabnum mt-1 text-[30px]/8 font-extrabold tracking-[-0.03em] text-ink">
            {fmtMoney(kpis.sales)}
          </p>
          <p className="mt-1 text-[12px] text-ink3">
            {kpis.txn} transaction{kpis.txn === 1 ? "" : "s"}
          </p>
        </Link>
      </section>

      {/* secondary figures — one divided block, no per-cell cards */}
      <section className="px-4 pt-4">
        <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-line2 bg-surface">
          <StatCell
            label="Pending"
            value={kpis.pending}
            href="/orders?filter=pending"
            alert={kpis.pending > 0}
            className="border-r border-b border-line"
          />
          <StatCell
            label="Low stock"
            value={kpis.lowStock}
            href="/inventory?filter=low"
            alert={kpis.lowStock > 0}
            className="border-b border-line"
          />
          <StatCell
            label="Customers"
            value={kpis.customers}
            href="/customers"
            className="border-r border-line"
          />
          <StatCell label="Transactions" value={kpis.txn} href="/reports" />
        </div>
      </section>

      {/* quick actions */}
      <section className="px-4 pt-6">
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[.06em] text-ink3">Quick actions</h2>
        <div className="flex gap-2">
          <QuickTile icon={<SquarePlus className="size-[22px]" />} label="Add item" onClick={() => router.push("/inventory/edit")} tone="accent" />
          <QuickTile icon={<Scan className="size-[22px]" />} label="Sell" onClick={() => router.push("/sell")} tone="info" />
          <QuickTile icon={<Users className="size-[22px]" />} label="Customers" onClick={() => router.push("/customers")} tone="violet" />
          <QuickTile icon={<Warehouse className="size-[22px]" />} label="Stock" onClick={() => router.push("/stock")} tone="warn" />
        </div>
      </section>

      {/* recent orders */}
      <section className="px-4 pt-6 pb-4">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-[12px] font-semibold uppercase tracking-[.06em] text-ink3">Recent orders</h2>
          <Link href="/orders" className="press flex items-center gap-0.5 text-[13px] font-semibold text-accent">
            View all <ChevronRight className="size-4" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            icon={<Receipt className="size-7" />}
            title="No orders yet"
            hint="Start a sale from the Sell tab and it will appear here."
            action={<Button onClick={() => router.push("/sell")}>Start selling</Button>}
          />
        ) : (
          <Card inset>
            {recent.map((o) => {
              const c = customers.find((x) => x.id === o.customerId);
              const refunded = o.status === "refunded";
              const pay = refunded
                ? "refunded"
                : o.payStatus === "partial"
                  ? "partial"
                  : o.payStatus === "unpaid"
                    ? "unpaid"
                    : "paid";
              const settled = pay === "paid";
              const qty = o.items.reduce((s, i) => s + i.qty, 0);
              const itemSummary = `${qty} item${qty === 1 ? "" : "s"}${o.items.length ? ` · ${o.items[0]?.name ?? ""}` : ""}${o.items.length > 1 ? `, +${o.items.length - 1} more` : ""}`;
              return (
                <Link
                  key={o.id}
                  href={`/orders/detail?id=${o.id}`}
                  className="press flex items-start gap-3 px-4 py-3.5 hover:bg-surface2/50"
                >
                  <Avatar name={c?.name ?? "Walk-in customer"} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold leading-snug break-words text-ink">
                      {c?.name ?? "Walk-in"}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-ink3">
                      {`${timeAgo(o.createdAt, now)} · ${itemSummary}`}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="tabnum text-[15px] font-bold text-ink">{fmtMoney(o.total)}</span>
                    {settled ? (
                      <span className="text-[11px] font-medium text-ink3">Paid</span>
                    ) : (
                      <StatusPill status={pay} />
                    )}
                  </span>
                </Link>
              );
            })}
          </Card>
        )}
      </section>

      {kpis.lowStock > 0 && (
        <section className="px-4 pb-4">
          <Link
            href="/inventory?filter=low"
            className="press flex items-center gap-2.5 border-t border-line pt-3"
          >
            <TriangleAlert className="size-4 shrink-0 text-warn" />
            <span className="min-w-0 flex-1 text-[12px] font-medium text-ink2">
              {kpis.lowStock} item{kpis.lowStock === 1 ? "" : "s"} running low — check stock
            </span>
            <ChevronRight className="size-4 shrink-0 text-ink3" />
          </Link>
        </section>
      )}
    </div>
  );
}

/** One figure inside the divided block: value first, label second. */
function StatCell({
  label,
  value,
  href,
  alert,
  className,
}: {
  label: string;
  value: number;
  href: string;
  alert?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "press flex flex-col items-start gap-0.5 px-3.5 py-3 hover:bg-surface2/50",
        className,
      )}
    >
      <span className="tabnum text-[18px]/6 font-bold text-ink">{value}</span>
      <span
        className={cn(
          "text-[11px] font-semibold uppercase tracking-[.06em]",
          alert ? "text-warn" : "text-ink3",
        )}
      >
        {label}
      </span>
    </Link>
  );
}
