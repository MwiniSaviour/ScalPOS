"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  History,
  Plus,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/emptystate";
import { Segmented } from "@/components/ui/segmented";
import { FinanceEntryRow } from "@/components/finance/finance-entry-row";
import { DailyBarChart } from "@/components/finance/daily-bar-chart";
import { addDays, dateLong, pctDelta, startOfDay } from "@/lib/format";
import { fmtMoney, fmtShort } from "@/lib/money";
import { useNow } from "@/lib/now";
import { usePos } from "@/lib/store";
import { cn } from "@/lib/ui";

type Period = "today" | "week" | "30d";
type Kind = "all" | "expense" | "funds";

const PERIOD_DAYS: Record<Period, number> = { today: 1, week: 7, "30d": 30 };

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "30d", label: "30 days" },
];

function periodLabel(period: Period, days: number): string {
  return period === "today" ? "Today" : period === "week" ? "This week" : `Last ${days} days`;
}

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: "all", label: "All" },
  { value: "expense", label: "Expenses" },
  { value: "funds", label: "Funds in" },
];

export default function ActivitiesScreen() {
  const entries = usePos((s) => s.financeEntries);
  const categories = usePos((s) => s.financeCategories);
  const now = useNow();
  const [period, setPeriod] = useState<Period>("today");
  const [kind, setKind] = useState<Kind>("all");

  const info = useMemo(() => {
    const days = PERIOD_DAYS[period];
    let start = startOfDay(addDays(now, -(days - 1)));
    if (period === "week") {
      const day = (new Date(now).getDay() + 6) % 7;
      start = startOfDay(addDays(now, -day));
    }
    return {
      days,
      curStart: start,
      prevStart: startOfDay(addDays(start, -days)),
    };
  }, [now, period]);

  const ranges = useMemo(() => {
    const scoped = entries.filter((entry) => kind === "all" || entry.kind === kind);
    const cur = scoped.filter((entry) => entry.t >= info.curStart && entry.t <= now);
    const prev = scoped.filter(
      (entry) => entry.t >= info.prevStart && entry.t < info.curStart,
    );
    const totals = (rows: typeof cur) => ({
      funds: rows.reduce((sum, entry) => sum + (entry.kind === "funds" ? entry.amount : 0), 0),
      spent: rows.reduce((sum, entry) => sum + (entry.kind === "expense" ? entry.amount : 0), 0),
    });
    return { cur, prev, totals: totals(cur), prevTotals: totals(prev) };
  }, [entries, info, kind, now]);

  const net = ranges.totals.funds - ranges.totals.spent;
  const prevNet = ranges.prevTotals.funds - ranges.prevTotals.spent;
  const netPct = prevNet > 0 ? ((net - prevNet) / prevNet) * 100 : net > 0 ? 100 : 0;
  const delta = pctDelta(netPct);

  const chart = useMemo(() => {
    const daily: { label: string; spent: number; funds: number; today: boolean }[] = [];
    for (let i = 0; i < info.days; i++) {
      const start = startOfDay(addDays(info.curStart, i));
      const end = addDays(start, 1);
      const rows = entries.filter(
        (entry) =>
          (kind === "all" || entry.kind === kind) && entry.t >= start && entry.t < end,
      );
      const d = new Date(start);
      const label =
        info.days === 1
          ? "Today"
          : info.days === 7
            ? d.toLocaleDateString("en-GB", { weekday: "narrow" })
            : String(d.getDate()).padStart(2, "0");
      daily.push({
        label,
        spent: rows.reduce((sum, entry) => sum + (entry.kind === "expense" ? entry.amount : 0), 0),
        funds: rows.reduce((sum, entry) => sum + (entry.kind === "funds" ? entry.amount : 0), 0),
        today: i === info.days - 1,
      });
    }
    return daily;
  }, [entries, info, kind]);

  const maxBars = Math.max(1, ...chart.map((row) => Math.max(row.spent, row.funds)));

  const mix = useMemo(() => {
    const sums: Record<string, number> = {};
    for (const entry of ranges.cur) {
      if (entry.kind !== "expense") continue;
      const key = entry.categoryId ?? "uncategorised";
      sums[key] = (sums[key] ?? 0) + entry.amount;
    }
    const pairs = Object.entries(sums).sort((a, b) => b[1] - a[1]);
    const total = pairs.reduce((sum, [, value]) => sum + value, 0);
    const rows = pairs.map(([id, value], index) => {
      const category = categories.find((row) => row.id === id);
      const previous = pairs
        .slice(0, index)
        .reduce((sum, [, amount]) => sum + (total > 0 ? Math.round((amount / total) * 100) : 0), 0);
      const pct =
        total > 0
          ? index === pairs.length - 1
            ? 100 - previous
            : Math.round((value / total) * 100)
          : 0;
      return {
        id,
        label: category?.name ?? "Uncategorised",
        color: category?.color ?? "#94a3b8",
        value,
        pct,
      };
    });
    return { rows, total };
  }, [ranges.cur, categories]);

  const list = useMemo(
    () => [...ranges.cur].sort((a, b) => b.t - a.t),
    [ranges.cur],
  );

  return (
    <div className="anim-fade overflow-x-hidden px-5 pt-4">
      <div className="safe-t" />
      <header>
        <h1 className="text-[26px]/7 font-bold tracking-[-0.02em] text-ink">Activities</h1>
        <p className="mt-0.5 text-[15px] text-ink3">{now > 0 ? dateLong(now) : ""}</p>
      </header>

      <div className="mt-5">
        <Segmented value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />
      </div>

      <section className="mt-6">
        <Card className="p-4">
          <div className="text-[15px] font-medium text-ink2">
            Net · {periodLabel(period, info.days)}
          </div>
          <div className="mt-1 flex items-end justify-between gap-2">
            <span
              className={cn(
                "tabnum text-[30px]/8 font-extrabold tracking-[-0.03em]",
                net < 0 ? "text-danger" : "text-ink",
              )}
            >
              {fmtMoney(net)}
            </span>
            <span className="pb-2 text-[14px] text-ink3">{ranges.cur.length} activities</span>
          </div>
          {!delta.flat && prevNet > 0 && (
            <div
              className={cn(
                "mt-0.5 flex items-center gap-1 text-[14px] font-semibold",
                delta.up ? "text-accent" : "text-danger",
              )}
            >
              {delta.up ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
              {delta.text}
              <span className="font-normal text-ink3">vs {fmtMoney(prevNet)} before</span>
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line/70 pt-3">
            <div>
              <p className="text-[12px] text-ink3">Money in</p>
              <p className="tabnum mt-0.5 text-[17px] font-semibold text-accent">
                {fmtMoney(ranges.totals.funds)}
              </p>
            </div>
            <div>
              <p className="text-[12px] text-ink3">Spent</p>
              <p className="tabnum mt-0.5 text-[17px] font-semibold text-ink">
                {fmtMoney(ranges.totals.spent)}
              </p>
            </div>
          </div>
        </Card>
      </section>

      <section className="mt-6">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[15px] font-medium text-ink2">Daily movement</span>
            <span className="flex items-center gap-1.5 text-[12px] text-ink3">
              <span className="size-2 rounded-[3px] bg-[var(--chart-bar)]" /> Spent
              <span className="ml-1 size-2 rounded-[3px] bg-accent" /> Money in
            </span>
          </div>
          <DailyBarChart rows={chart} max={maxBars} dual />
          <p className="mt-2 text-[12px] text-ink3">Each day: spent bar beside money-in bar</p>
        </Card>
      </section>

      <section className="mt-6">
        <Card className="p-4">
          <div className="text-[15px] font-medium text-ink2">Spending by category</div>
          {mix.total > 0 ? (
            <>
              <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-[var(--chart-track)]">
                {mix.rows.map((row) =>
                  row.pct > 0 ? (
                    <span
                      key={row.id}
                      className="h-full"
                      style={{ width: `${row.pct}%`, background: row.color }}
                    />
                  ) : null,
                )}
              </div>
              <div className="mt-3 space-y-2">
                {mix.rows.map((row) => (
                  <div key={row.id} className="flex items-center gap-2.5 text-[14px]">
                    <span
                      className="size-2.5 shrink-0 rounded-[4px]"
                      style={{ background: row.color }}
                    />
                    <span className="min-w-0 flex-1 truncate text-ink2">{row.label}</span>
                    <span className="tabnum font-semibold text-ink">{fmtShort(row.value)}</span>
                    <span className="tabnum w-10 text-right text-ink3">{row.pct}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-3 text-[14px] text-ink3">No spending in this period.</p>
          )}
        </Card>
      </section>

      <div className="mt-6">
        <h2 className="mb-2 text-[15px] font-medium text-ink2">Activity type</h2>
        <Segmented value={kind} onChange={setKind} options={KIND_OPTIONS} />
      </div>

      <section className="mt-4 pb-6">
        {list.length === 0 ? (
          <Card>
            <EmptyState
              icon={<History className="size-7" />}
              title={entries.length === 0 ? "No activities yet" : "Nothing in this view"}
              hint={
                entries.length === 0
                  ? "Add the funds you received, then record each expense as it happens."
                  : "Try another period or filter to see the rest of your activity."
              }
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Link
                    href="/expense"
                    className="press inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 text-[14px] font-semibold text-accentink"
                  >
                    <Plus className="size-[18px]" />
                    Add expense
                  </Link>
                  <Link
                    href="/funds"
                    className="press inline-flex h-11 items-center gap-2 rounded-xl border border-line2 bg-surface2 px-4 text-[14px] font-semibold text-ink2"
                  >
                    Add funds
                  </Link>
                </div>
              }
            />
          </Card>
        ) : (
          <Card inset>
            {list.map((entry) => (
              <FinanceEntryRow
                key={entry.id}
                entry={entry}
                category={categories.find((category) => category.id === entry.categoryId)}
                now={now}
              />
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
