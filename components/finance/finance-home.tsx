"use client";

import Link from "next/link";
import { ArrowDownLeft, CalendarDays, CircleUserRound, Plus, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StaffAvatar } from "@/app/account-screen";
import { BudgetBar } from "./budget-bar";
import { FinanceEntryRow } from "./finance-entry-row";
import { dateLong } from "@/lib/format";
import { fmtMoney } from "@/lib/money";
import { useCurrentStaff } from "@/lib/staff";
import { useNow } from "@/lib/now";
import { usePos } from "@/lib/store";
import {
  budgetTotal,
  financeSummary,
  inMonth,
  monthKey,
  spentByCategory,
} from "@/lib/finance";

function daysLeftInMonth(now: number): number {
  if (!(now > 0)) return 1;
  const d = new Date(now);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Math.max(1, last - d.getDate() + 1);
}

export function FinanceHome() {
  const settings = usePos((s) => s.settings);
  const entries = usePos((s) => s.financeEntries);
  const budgets = usePos((s) => s.financeBudgets);
  const categories = usePos((s) => s.financeCategories);
  const now = useNow();
  const me = useCurrentStaff();

  const summary = financeSummary(entries, now);
  const spentMap = spentByCategory(entries, now);
  const planned = budgetTotal(budgets, now);
  const left = planned - summary.monthSpent;
  const daysLeft = daysLeftInMonth(now);
  const daily = planned > 0 ? Math.max(0, left) / daysLeft : 0;
  const monthExpenses = entries.filter(
    (entry) => entry.kind === "expense" && inMonth(entry.t, now),
  ).length;

  const monthBudgets = budgets
    .filter((budget) => budget.month === monthKey(now))
    .map((budget) => {
      const category = categories.find((row) => row.id === budget.categoryId);
      const spent = spentMap[budget.categoryId] ?? 0;
      return category
        ? { budget, category, spent, ratio: spent / budget.amount }
        : null;
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 3);

  const recent = [...entries].sort((a, b) => b.t - a.t).slice(0, 3);

  return (
    <div className="anim-fade overflow-x-hidden px-5 pt-4">
      <div className="safe-t" />
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-[22px]/7 font-bold tracking-[-0.02em] text-ink sm:text-[26px]/8">
            {settings.shopName}
          </h1>
          <p className="mt-0.5 text-[15px] text-ink3">{now > 0 ? dateLong(now) : ""}</p>
        </div>
        <Link href="/more" aria-label="My account" className="press mt-0.5 shrink-0">
          {me ? (
            <StaffAvatar staff={me} size={40} />
          ) : (
            <span className="flex size-10 items-center justify-center rounded-full border border-line2 bg-surface text-ink2">
              <CircleUserRound className="size-[23px]" />
            </span>
          )}
        </Link>
      </header>

      <section className="mt-5" aria-label="Available balance">
        <div className="rounded-2xl border border-line2 bg-surface px-4 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink3">
                Available balance
              </p>
              <p
                className={`tabnum mt-2 break-words text-[clamp(28px,8vw,38px)] font-bold leading-[1.05] tracking-[-0.03em] ${
                  summary.balance < 0 ? "text-danger" : "text-ink"
                }`}
              >
                {fmtMoney(summary.balance)}
              </p>
            </div>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accentsoft text-accent">
              <Wallet className="size-[21px]" />
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line/70 pt-3">
            <div className="min-w-0">
              <p className="text-[12px] text-ink3">Funds in</p>
              <p className="tabnum mt-0.5 truncate text-[17px] font-semibold text-ink">
                {fmtMoney(summary.funds)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[12px] text-ink3">Spent</p>
              <p className="tabnum mt-0.5 truncate text-[17px] font-semibold text-ink">
                {fmtMoney(summary.spent)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-3 flex flex-col gap-2" aria-label="Quick actions">
        <Link
          href="/expense"
          className="press flex h-14 w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-accent px-4 text-[16px] font-semibold text-accentink"
        >
          <Plus className="size-[19px]" />
          Add expense
        </Link>
        <Link
          href="/funds"
          className="press flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-line2 bg-surface2 px-4 text-[15px] font-semibold text-ink"
        >
          <ArrowDownLeft className="size-[18px]" />
          Add funds
        </Link>
      </section>

      <section className="mt-6" aria-label="This month">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-medium text-ink2">This month</h2>
          <Link href="/activities" className="press text-[15px] font-medium text-accent">
            View activity
          </Link>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <div className="min-w-0 rounded-2xl border border-line2 bg-surface px-3.5 py-3">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-ink3">
              Spent
            </p>
            <p className="tabnum mt-2 break-words text-[clamp(19px,5.2vw,27px)] font-bold leading-[1.08] tracking-[-0.02em] text-ink">
              {fmtMoney(summary.monthSpent)}
            </p>
            <p className="mt-1.5 truncate text-[12px] text-ink3">
              {monthExpenses} expense{monthExpenses === 1 ? "" : "s"}
            </p>
          </div>
          <div className="min-w-0 rounded-2xl border border-line2 bg-surface px-3.5 py-3">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-ink3">
              Funds in
            </p>
            <p className="tabnum mt-2 break-words text-[clamp(19px,5.2vw,27px)] font-bold leading-[1.08] tracking-[-0.02em] text-ink">
              {fmtMoney(summary.monthFunds)}
            </p>
            <p className="mt-1.5 truncate text-[12px] text-ink3">money added</p>
          </div>
          <Link
            href="/budgets"
            className="press min-w-0 rounded-2xl border border-line2 bg-surface px-3.5 py-3"
          >
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-ink3">
              Budget left
            </p>
            <p
              className={`tabnum mt-2 break-words text-[clamp(19px,5.2vw,27px)] font-bold leading-[1.08] tracking-[-0.02em] ${
                planned > 0 && left < 0 ? "text-danger" : "text-ink"
              }`}
            >
              {planned > 0 ? fmtMoney(left) : "Set budget"}
            </p>
            <p className="mt-1.5 truncate text-[12px] text-ink3">
              {planned > 0 ? `of ${fmtMoney(planned)}` : "plan your month"}
            </p>
          </Link>
          <div className="min-w-0 rounded-2xl border border-line2 bg-surface px-3.5 py-3">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-ink3">
              Daily allowance
            </p>
            <p className="tabnum mt-2 break-words text-[clamp(19px,5.2vw,27px)] font-bold leading-[1.08] tracking-[-0.02em] text-ink">
              {planned > 0 ? fmtMoney(daily) : "—"}
            </p>
            <p className="mt-1.5 truncate text-[12px] text-ink3">
              {daysLeft} day{daysLeft === 1 ? "" : "s"} left
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6" aria-label="Budget watch">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-medium text-ink2">Budget watch</h2>
          <Link href="/budgets" className="press text-[15px] font-medium text-accent">
            Manage
          </Link>
        </div>
        {monthBudgets.length === 0 ? (
          <Card className="mt-2.5 px-4 py-5">
            <p className="text-[14px] leading-5 text-ink3">
              Set a monthly envelope for food, transport or hostel fees and see how
              much is left before you spend it.
            </p>
            <Link
              href="/budgets"
              className="press mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-accent/10 px-3.5 text-[13px] font-semibold text-accent"
            >
              <CalendarDays className="size-4" />
              Set monthly budgets
            </Link>
          </Card>
        ) : (
          <Card inset className="mt-2.5">
            {monthBudgets.map(({ budget, category, spent }) => {
              const remaining = budget.amount - spent;
              return (
                <Link
                  key={budget.id}
                  href="/budgets"
                  className="press block px-4 py-3.5 hover:bg-surface2/50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: category.color }}
                      />
                      <span className="truncate text-[16px] font-semibold text-ink">
                        {category.name}
                      </span>
                    </span>
                    <span className="tabnum shrink-0 text-[14px] font-medium text-ink2">
                      {fmtMoney(spent)} / {fmtMoney(budget.amount)}
                    </span>
                  </div>
                  <BudgetBar spent={spent} budget={budget.amount} className="mt-2.5" />
                  <p
                    className={`mt-1.5 text-[12px] ${
                      remaining < 0 ? "text-danger" : "text-ink3"
                    }`}
                  >
                    {remaining < 0
                      ? `${fmtMoney(Math.abs(remaining))} over budget`
                      : `${fmtMoney(remaining)} left`}
                  </p>
                </Link>
              );
            })}
          </Card>
        )}
      </section>

      <section className="mt-6 pb-6" aria-label="Recent activities">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-medium text-ink2">Recent activities</h2>
          <Link href="/activities" className="press text-[15px] font-medium text-accent">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <Card className="mt-2.5 px-4 py-6 text-center">
            <p className="text-[14px] leading-5 text-ink3">
              No activities yet — add the money you received, then record what you spend.
            </p>
          </Card>
        ) : (
          <Card inset className="mt-2.5">
            {recent.map((entry) => (
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
