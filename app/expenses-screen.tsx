"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Plus, ReceiptText, Settings2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/emptystate";
import { Segmented } from "@/components/ui/segmented";
import { FinanceEntryRow } from "@/components/finance/finance-entry-row";
import { addDays, dateLong, pctDelta, startOfDay } from "@/lib/format";
import { fmtMoney } from "@/lib/money";
import { useNow } from "@/lib/now";
import { usePos } from "@/lib/store";
import { cn } from "@/lib/ui";

type Period = "today" | "week" | "7d" | "30d";

const PERIOD_DAYS: Record<Period, number> = { today: 1, week: 7, "7d": 7, "30d": 30 };
const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

function periodLabel(period: Period, days: number): string {
  return period === "today" ? "Today" : period === "week" ? "This week" : `Last ${days} days`;
}

export default function ExpensesScreen() {
  const entries = usePos((s) => s.financeEntries);
  const categories = usePos((s) => s.financeCategories);
  const now = useNow();
  const [period, setPeriod] = useState<Period>("today");

  const info = useMemo(() => {
    const days = PERIOD_DAYS[period];
    let start = startOfDay(addDays(now, -(days - 1)));
    if (period === "week") {
      const day = (new Date(now).getDay() + 6) % 7;
      start = startOfDay(addDays(now, -day));
    }
    return { days, curStart: start, prevStart: startOfDay(addDays(start, -days)) };
  }, [now, period]);

  const report = useMemo(() => {
    const cur = entries.filter(
      (entry) => entry.kind === "expense" && entry.t >= info.curStart && entry.t <= now,
    );
    const prev = entries.filter(
      (entry) => entry.kind === "expense" && entry.t >= info.prevStart && entry.t < info.curStart,
    );
    const spent = cur.reduce((sum, entry) => sum + entry.amount, 0);
    const before = prev.reduce((sum, entry) => sum + entry.amount, 0);
    const pct = before > 0 ? ((spent - before) / before) * 100 : spent > 0 ? 100 : 0;
    return { cur, spent, before, delta: pctDelta(pct) };
  }, [entries, info, now]);

  const chart = useMemo(() => {
    const daily: { label: string; spent: number; today: boolean }[] = [];
    for (let i = 0; i < info.days; i++) {
      const start = startOfDay(addDays(info.curStart, i));
      const end = addDays(start, 1);
      const spent = entries
        .filter((entry) => entry.kind === "expense" && entry.t >= start && entry.t < end)
        .reduce((sum, entry) => sum + entry.amount, 0);
      const d = new Date(start);
      const label =
        info.days === 1
          ? "Today"
          : info.days === 7
            ? d.toLocaleDateString("en-GB", { weekday: "narrow" })
            : String(d.getDate()).padStart(2, "0");
      daily.push({ label, spent, today: i === info.days - 1 });
    }
    const step = info.days > 14 ? 5 : 1;
    return daily.map((row, i) => ({
      ...row,
      label: i % step === 0 || i === info.days - 1 ? row.label : null,
    }));
  }, [entries, info]);

  const maxBars = Math.max(1, ...chart.map((row) => row.spent));

  const mix = useMemo(() => {
    const sums: Record<string, number> = {};
    for (const entry of report.cur) {
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
  }, [report.cur, categories]);

  const list = useMemo(
    () => [...report.cur].sort((a, b) => b.t - a.t),
    [report.cur],
  );

  return (
    <div className="anim-fade overflow-x-hidden px-5 pt-4">
      <div className="safe-t" />
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px]/7 font-bold tracking-[-0.02em] text-ink">Expense</h1>
          <p className="mt-0.5 text-[15px] text-ink3">{now > 0 ? dateLong(now) : ""}</p>
        </div>
        <div className="mt-0.5 flex shrink-0 gap-1.5">
          <Link
            href="/more"
            aria-label="More settings"
            className="press flex size-10 items-center justify-center rounded-full border border-line2 bg-surface text-ink2"
          >
            <Settings2 className="size-[19px]" />
          </Link>
        </div>
      </header>

      <div className="mt-5">
        <Segmented value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />
      </div>

      <section className="mt-6">
        <Card className="p-4">
          <div className="text-[15px] font-medium text-ink2">
            Spent · {periodLabel(period, info.days)}
          </div>
          <div className="mt-1 flex items-end justify-between gap-2">
            <span className="tabnum text-[30px]/8 font-extrabold tracking-[-0.03em] text-ink">
              {fmtMoney(report.spent)}
            </span>
            <span className="pb-2 text-[14px] text-ink3">{report.cur.length} expenses</span>
          </div>
          {!report.delta.flat && report.before > 0 && (
            <div
              className={cn(
                "mt-0.5 flex items-center gap-1 text-[14px] font-semibold",
                report.delta.up ? "text-danger" : "text-accent",
              )}
            >
              {report.delta.up ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
              {report.delta.text}
              <span className="font-normal text-ink3">vs {fmtMoney(report.before)} before</span>
            </div>
          )}
        </Card>
      </section>

      <section className="mt-6">
        <Card className="p-4">
          <div className="text-[15px] font-medium text-ink2">Daily spending</div>
          <div className="mt-3 flex h-28 items-end gap-1 border-b border-line pb-px">
            {chart.map((row, i) => (
              <div key={i} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                <div className="relative mx-auto h-full w-full max-w-7">
                  <div className="absolute inset-0 rounded-[3px] bg-[var(--chart-track)]" />
                  <div
                    className={cn(
                      "absolute inset-x-0 bottom-0 rounded-t-[4px] bg-[var(--chart-bar)]",
                      row.today && "bg-accent",
                    )}
                    style={{ height: row.spent > 0 ? `${(row.spent / maxBars) * 100}%` : 0 }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-1 text-center text-[12px] text-ink3">
            {chart.map((row, i) => (
              <span key={i} className="min-w-0 flex-1 truncate">
                {row.label ?? ""}
              </span>
            ))}
          </div>
        </Card>
      </section>

      {mix.total > 0 && (
        <section className="mt-6">
          <Card className="p-4">
            <div className="text-[15px] font-medium text-ink2">Where it went</div>
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
                  <span className="size-2.5 shrink-0 rounded-[4px]" style={{ background: row.color }} />
                  <span className="min-w-0 flex-1 truncate text-ink2">{row.label}</span>
                  <span className="tabnum font-semibold text-ink">{fmtMoney(row.value)}</span>
                  <span className="tabnum w-10 text-right text-ink3">{row.pct}%</span>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      <section className="mt-6 pb-6">
        <h2 className="mb-2 text-[15px] font-medium text-ink2">Recent expenses</h2>
        {list.length === 0 ? (
          <Card>
            <EmptyState
              icon={<ReceiptText className="size-7" />}
              title="No expenses in this period"
              hint="Record an expense to see it here and in your reports."
              action={
                <Link
                  href="/expense"
                  className="press inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 text-[14px] font-semibold text-accentink"
                >
                  <Plus className="size-[18px]" />
                  Add expense
                </Link>
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
