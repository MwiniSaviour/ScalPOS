"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { History, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/emptystate";
import { FinanceEntryRow } from "@/components/finance/finance-entry-row";
import { financeSummary, inMonth } from "@/lib/finance";
import { fmtMoney } from "@/lib/money";
import { useNow } from "@/lib/now";
import { usePos } from "@/lib/store";

type Filter = "all" | "expense" | "funds";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "expense", label: "Expenses" },
  { value: "funds", label: "Funds in" },
];

export default function ActivitiesScreen() {
  const entries = usePos((s) => s.financeEntries);
  const categories = usePos((s) => s.financeCategories);
  const now = useNow();
  const [filter, setFilter] = useState<Filter>("all");

  const summary = financeSummary(entries, now);
  const monthCount = entries.filter(
    (entry) => entry.kind === "expense" && inMonth(entry.t, now),
  ).length;
  const list = useMemo(
    () =>
      entries
        .filter((entry) => filter === "all" || entry.kind === filter)
        .sort((a, b) => b.t - a.t),
    [entries, filter],
  );

  return (
    <div className="anim-fade overflow-x-hidden px-5 pt-4">
      <div className="safe-t" />
      <header>
        <h1 className="text-[26px]/7 font-bold tracking-[-0.02em] text-ink">Activities</h1>
        <p className="mt-0.5 text-[15px] text-ink3">Every expense and top-up, newest first</p>
      </header>

      <section className="mt-5" aria-label="Activity totals">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="min-w-0 rounded-2xl border border-line2 bg-surface px-3.5 py-3">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-ink3">
              Spent this month
            </p>
            <p className="tabnum mt-2 break-words text-[clamp(19px,5.2vw,27px)] font-bold leading-[1.08] tracking-[-0.02em] text-ink">
              {fmtMoney(summary.monthSpent)}
            </p>
            <p className="mt-1.5 truncate text-[12px] text-ink3">
              {monthCount} expense{monthCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="min-w-0 rounded-2xl border border-line2 bg-surface px-3.5 py-3">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-ink3">
              Funds in this month
            </p>
            <p className="tabnum mt-2 break-words text-[clamp(19px,5.2vw,27px)] font-bold leading-[1.08] tracking-[-0.02em] text-accent">
              {fmtMoney(summary.monthFunds)}
            </p>
            <p className="mt-1.5 truncate text-[12px] text-ink3">money received</p>
          </div>
        </div>
      </section>

      <section className="mt-5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {FILTERS.map((row) => (
            <Chip key={row.value} active={filter === row.value} onClick={() => setFilter(row.value)}>
              {row.label}
            </Chip>
          ))}
        </div>
      </section>

      <section className="mt-4 pb-6">
        {list.length === 0 ? (
          <Card>
            <EmptyState
              icon={<History className="size-7" />}
              title={entries.length === 0 ? "No activities yet" : "Nothing in this view"}
              hint={
                entries.length === 0
                  ? "Add the funds you received, then record each expense as it happens."
                  : "Try another filter to see the rest of your activity."
              }
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
