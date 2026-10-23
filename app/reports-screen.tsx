"use client";

import { IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/emptystate";
import { ProductArt } from "@/components/ui/productart";
import { Segmented } from "@/components/ui/segmented";
import { addDays, dateLong, pctDelta, startOfDay } from "@/lib/format";
import { fmtMoney, fmtShort } from "@/lib/money";
import { dueOf, usePos } from "@/lib/store";
import { useNow } from "@/lib/now";
import { cn } from "@/lib/ui";
import { ArrowDownRight, ArrowUpRight, Banknote, ChevronLeft, CreditCard, Smartphone, TriangleAlert, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Period = "today" | "7d" | "30d";
const PERIOD_DAYS: Record<Period, number> = { today: 1, "7d": 7, "30d": 30 };

export default function ReportsScreen() {
  const router = useRouter();
  const orders = usePos((s) => s.orders);
  const products = usePos((s) => s.products);
  const now = useNow();
  const [period, setPeriod] = useState<Period>("today");

  const periodInfo = useMemo(() => {
    const days = PERIOD_DAYS[period];
    const todayStart = startOfDay(now);
    const curStart = startOfDay(addDays(todayStart, -(days - 1)));
    const prevStart = startOfDay(addDays(curStart, -days));
    return { days, curStart, prevStart, curEnd: now, prevEnd: curStart };
  }, [now, period]);

  const sold = useMemo(
    () => orders.filter((o) => o.status !== "refunded" && o.createdAt >= periodInfo.curStart && o.createdAt < periodInfo.curEnd),
    [orders, periodInfo],
  );

  const prevSold = useMemo(
    () => orders.filter((o) => o.status !== "refunded" && o.createdAt >= periodInfo.prevStart && o.createdAt < periodInfo.prevEnd),
    [orders, periodInfo],
  );

  const hero = useMemo(() => {
    const sales = sold.reduce((s, o) => s + o.total, 0);
    const prev = prevSold.reduce((s, o) => s + o.total, 0);
    const pct = prev > 0 ? ((sales - prev) / prev) * 100 : sales > 0 ? 100 : 0;
    return { sales, txns: sold.length, pct, prev };
  }, [sold, prevSold]);

  const chart = useMemo(() => {
    const days = periodInfo.days;
    const todayStart = startOfDay(now);
    const daily: { label: string; sum: number; today: boolean }[] = [];
    for (let i = 0; i < days; i++) {
      const start = addDays(todayStart, i - (days - 1));
      const end = addDays(start, 1);
      const sum = orders
        .filter((o) => o.status !== "refunded" && o.createdAt >= start && o.createdAt < end)
        .reduce((s, o) => s + o.total, 0);
      const d = new Date(start);
      const label =
        days === 1
          ? "Today"
          : days === 7
            ? d.toLocaleDateString("en-GB", { weekday: "narrow" })
            : String(d.getDate()).padStart(2, "0");
      daily.push({ label, sum, today: i === days - 1 });
    }
    if (days <= 14) return daily.map((d) => ({ ...d, label: d.label as string | null }));
    const bucketCount = 10;
    const size = Math.ceil(days / bucketCount);
    const bars: { label: string | null; sum: number; today: boolean }[] = [];
    for (let b = 0; b < bucketCount; b++) {
      const from = b * size;
      const to = Math.min((b + 1) * size, days);
      let sum = 0;
      for (let i = from; i < to; i++) sum += daily[i].sum;
      const showTick = b % 3 === 2 || b === bucketCount - 1;
      const isToday = b === bucketCount - 1;
      const last = new Date(addDays(todayStart, to - days));
      bars.push({
        label: showTick ? (isToday ? "Today" : last.toLocaleDateString("en-GB", { day: "numeric", month: "short" })) : null,
        sum,
        today: isToday,
      });
    }
    return bars;
  }, [orders, now, periodInfo]);

  const mix = useMemo(() => {
    const sums = { cash: 0, momo: 0, card: 0, credit: 0 };
    let total = 0;
    for (const o of sold) {
      for (const p of o.payments) {
        if (p.method in sums) sums[p.method] += p.amount;
        total += p.amount;
      }
      const due = dueOf(o);
      if (due > 0) {
        sums.credit += due;
        total += due;
      }
    }
    const rows = [
      { key: "cash", label: "Cash" },
      { key: "momo", label: "MoMo" },
      { key: "card", label: "Card" },
      { key: "credit", label: "Credit" },
    ].map((r) => ({
      ...r,
      value: sums[r.key as keyof typeof sums],
      pct: total > 0 ? Math.round((sums[r.key as keyof typeof sums] / total) * 100) : 0,
    }));
    return { rows, total };
  }, [sold]);

  const top = useMemo(() => {
    const byProduct = new Map<string, { name: string; imageUrl: string; qty: number; revenue: number }>();
    for (const o of sold) {
      for (const item of o.items) {
        const cur = byProduct.get(item.productId) ?? { name: item.name, imageUrl: item.imageUrl, qty: 0, revenue: 0 };
        cur.qty += item.qty;
        cur.revenue += item.price * item.qty;
        byProduct.set(item.productId, cur);
      }
    }
    const rows = [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    return { rows, max: rows[0]?.revenue ?? 0 };
  }, [sold]);

  const lowStock = useMemo(
    () => products.filter((p) => p.active && p.stock <= p.lowStockAt).sort((a, b) => a.stock - b.stock),
    [products],
  );

  const delta = pctDelta(hero.pct);
  const maxBars = Math.max(...chart.map((b) => b.sum), 1);

  return (
    <div className="anim-fade px-5 pt-4">
      <div className="safe-t" />
      <header className="flex items-center gap-1">
        <IconButton label="Back" onClick={() => router.back()} className="-ml-2 shrink-0 text-ink">
          <ChevronLeft className="size-[24px]" strokeWidth={2.2} />
        </IconButton>
        <h1 className="min-w-0 flex-1 truncate text-[26px]/7 font-bold tracking-[-0.02em] text-ink">
          Reports
        </h1>
      </header>
      <p className="mt-0.5 text-[15px] text-ink3">{now > 0 ? dateLong(now) : ""}</p>

      {/* period filter */}
      <div className="mt-5">
        <Segmented
          value={period}
          onChange={setPeriod}
          options={[
            { value: "today", label: "Today" },
            { value: "7d", label: "7 days" },
            { value: "30d", label: "30 days" },
          ]}
        />
      </div>

      {/* hero */}
      <section className="mt-6">
        <Card className="p-4">
          <div className="text-[15px] font-medium text-ink2">
            Sales · {period === "today" ? "Today" : `Last ${periodInfo.days} days`}
          </div>
          <div className="mt-1 flex items-end justify-between gap-2">
            <span className="tabnum text-[30px]/8 font-extrabold tracking-[-0.03em] text-ink">
              {fmtMoney(hero.sales)}
            </span>
            <span className="pb-2 text-[14px] text-ink3">{hero.txns} transactions</span>
          </div>
          {!delta.flat && hero.prev > 0 && (
            <div
              className={cn(
                "mt-0.5 flex items-center gap-1 text-[14px] font-semibold",
                delta.up ? "text-accent" : "text-danger",
              )}
            >
              {delta.up ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
              {delta.text}
              <span className="font-normal text-ink3">vs {fmtMoney(hero.prev)} before</span>
            </div>
          )}
        </Card>
      </section>

      {/* bar chart */}
      <section className="mt-6">
        <Card className="p-4">
          <div className="text-[15px] font-medium text-ink2">Daily sales</div>
          <div className="mt-3 flex h-28 items-end gap-1 border-b border-line pb-px">
            {chart.map((b, i) => (
              <div key={i} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                <div className="relative mx-auto h-full w-full max-w-7">
                  <div className="absolute inset-0 rounded-[3px] bg-[var(--chart-track)]" />
                  <div
                    className={cn(
                      "absolute inset-x-0 bottom-0 rounded-t-[4px]",
                      b.today ? "bg-accent" : "bg-[var(--chart-bar)]",
                    )}
                    style={{ height: b.sum > 0 ? `${(b.sum / maxBars) * 100}%` : 0 }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-1 text-center text-[12px] text-ink3">
            {chart.map((b, i) => (
              <span key={i} className="min-w-0 flex-1 truncate">
                {b.label ?? ""}
              </span>
            ))}
          </div>
        </Card>
      </section>

      {/* payment mix */}
      <section className="mt-6">
        <Card className="p-4">
          <div className="text-[15px] font-medium text-ink2">Payment mix</div>
          {mix.total > 0 ? (
            <>
              <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-[var(--chart-track)]">
                {mix.rows.map((r) =>
                  r.pct > 0 ? (
                    <span
                      key={r.key}
                      className={cn("h-full", mixBg[r.key])}
                      style={{ width: `${r.pct}%` }}
                    />
                  ) : null,
                )}
              </div>
              <div className="mt-3 space-y-2">
                {mix.rows.map((r) => (
                  <div key={r.key} className="flex items-center gap-2.5 text-[14px]">
                    <span className={cn("size-2.5 shrink-0 rounded-[4px]", mixBg[r.key])} />
                    <MixIcon method={r.key} />
                    <span className="min-w-0 flex-1 text-ink2">{r.label}</span>
                    <span className="tabnum font-semibold text-ink">{fmtShort(r.value)}</span>
                    <span className="tabnum w-10 text-right text-ink3">{r.pct}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-3 text-[14px] text-ink3">No payments collected in this period.</p>
          )}
        </Card>
      </section>

      {/* top products */}
      <section className="mt-6">
        <Card inset>
          <div className="flex items-baseline justify-between gap-2 px-4 pb-1 pt-3.5">
            <h3 className="text-[15px] font-medium text-ink2">Top products</h3>
            <span className="text-[14px] text-ink3">by revenue</span>
          </div>
          {top.rows.length === 0 ? (
            <EmptyState
              icon={<Wallet className="size-7" />}
              title="No sales in this period"
              hint="Make a sale and the top sellers will rank themselves here."
            />
          ) : (
            top.rows.map((r, i) => (
              <div key={r.name} className="flex items-center gap-3 px-4 py-3">
                <span className="tabnum w-6 shrink-0 text-center text-[14px] font-bold text-ink3">
                  {i + 1}
                </span>
                <ProductArt imageUrl={r.imageUrl} name={r.name} className="size-10 shrink-0 rounded-xl" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px] font-semibold leading-tight text-ink">
                    {r.name}
                  </span>
                  <span className="mt-1 block h-1 overflow-hidden rounded-full bg-[var(--chart-track)]">
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{ width: `${top.max > 0 ? Math.max(6, (r.revenue / top.max) * 100) : 0}%` }}
                    />
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <span className="tabnum text-[15px] font-bold text-ink">{fmtMoney(r.revenue)}</span>
                  <span className="tabnum text-[14px] text-ink3">{r.qty} sold</span>
                </span>
              </div>
            ))
          )}
        </Card>
      </section>

      {/* low stock */}
      {lowStock.length > 0 && (
        <section className="mt-6 pb-6">
          <Card inset>
            <div className="flex items-center gap-2 px-4 pb-1 pt-3.5">
              <TriangleAlert className="size-4 text-warn" />
              <h3 className="text-[15px] font-medium text-ink2">Low stock · {lowStock.length}</h3>
            </div>
            {lowStock.map((p) => (
              <Link
                key={p.id}
                href={`/inventory/detail?id=${p.id}`}
                className="press flex items-center gap-3 px-4 py-3 hover:bg-surface2/50"
              >
                <ProductArt imageUrl={p.imageUrl} name={p.name} className="size-10 shrink-0 rounded-xl" />
                <span className="min-w-0 flex-1 truncate text-[17px] font-semibold text-ink">{p.name}</span>
                {p.stock <= 0 ? (
                  <span className="shrink-0 rounded-full bg-ink2/10 px-2.5 py-1 text-[12px] font-semibold text-ink2">
                    Out
                  </span>
                ) : (
                  <span className="tabnum shrink-0 rounded-full bg-warn/10 px-2.5 py-1 text-[12px] font-bold text-warn">
                    {p.stock} left
                  </span>
                )}
              </Link>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}

const mixBg: Record<string, string> = {
  cash: "bg-accent",
  momo: "bg-info",
  card: "bg-violet",
  credit: "bg-warn",
};

function MixIcon({ method }: { method: string }) {
  const icon =
    method === "cash" ? (
      <Banknote className="size-4 text-ink3" />
    ) : method === "momo" ? (
      <Smartphone className="size-4 text-ink3" />
    ) : method === "card" ? (
      <CreditCard className="size-4 text-ink3" />
    ) : (
      <Wallet className="size-4 text-ink3" />
    );
  return <span className="flex size-6 items-center justify-center">{icon}</span>;
}
