"use client";

import { useState } from "react";
import { ChevronRight, Plus, ReceiptText, Wallet } from "lucide-react";
import { BudgetBar } from "@/components/finance/budget-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/emptystate";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { dateShort } from "@/lib/format";
import {
  budgetFor,
  budgetKey,
  budgetRange,
  budgetTotal,
  spentInRange,
  spentByCategory,
} from "@/lib/finance";
import { FINANCE_METHOD_LABELS } from "@/lib/finance";
import { fmtMoney, parsePrice } from "@/lib/money";
import { useNow } from "@/lib/now";
import { usePos } from "@/lib/store";
import { cn, TOKEN_COLORS } from "@/lib/ui";
import type { BudgetPeriod, FinanceBudget, FinanceCategory } from "@/lib/types";

const PERIODS: { value: BudgetPeriod; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "custom", label: "Custom" },
];

function toDateInput(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fromDateInput(value: string): number {
  const t = new Date(`${value}T00:00:00`).getTime();
  return Number.isFinite(t) ? t : Date.now();
}

export default function BudgetsScreen() {
  const categories = usePos((s) => s.financeCategories);
  const budgets = usePos((s) => s.financeBudgets);
  const entries = usePos((s) => s.financeEntries);
  const setFinanceBudget = usePos((s) => s.setFinanceBudget);
  const upsertFinanceCategory = usePos((s) => s.upsertFinanceCategory);
  const toast = usePos((s) => s.toast);
  const now = useNow();

  const [selected, setSelected] = useState<FinanceCategory | null>(null);
  const [draft, setDraft] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [period, setPeriod] = useState<BudgetPeriod>("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(TOKEN_COLORS[0].hex);
  const [viewFor, setViewFor] = useState<FinanceBudget | null>(null);

  const spent = spentByCategory(entries, now);
  const planned = budgetTotal(budgets, now, "month");
  const monthCategories = budgets
    .filter((budget) => (budget.period ?? "month") === "month" && budget.month === budgetKey("month", now))
    .map((budget) => budget.categoryId);
  const monthSpent = monthCategories.reduce((sum, categoryId) => sum + (spent[categoryId] ?? 0), 0);
  const left = planned - monthSpent;
  const monthLabel =
    now > 0
      ? new Date(now).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
      : "this month";

  function openBudget(category: FinanceCategory) {
    const budget = budgetFor(budgets, category.id, now);
    setSelected(category);
    setNameDraft(category.name);
    setDraft(budget ? String(budget.amount) : "");
    setPeriod(budget?.period ?? "month");
    setFrom(toDateInput(budget?.from ?? now));
    setTo(toDateInput(budget?.to ?? now));
  }

  function saveBudget() {
    if (!selected) return;
    const amount = parsePrice(draft);
    const name = nameDraft.trim();
    const range =
      period === "custom"
        ? ({ from: fromDateInput(from), to: fromDateInput(to) + 24 * 60 * 60 * 1000 } as { from: number; to: number })
        : ({} as { from?: number; to?: number });
    if (period === "custom" && range.to! <= range.from!) {
      toast("The end date must be after the start date", "warn");
      return;
    }
    if (name && name !== selected.name) {
      upsertFinanceCategory({ id: selected.id, name, color: selected.color });
    }
    setFinanceBudget(selected.id, amount, { period, ...range });
    toast(
      amount > 0
        ? `${name || selected.name} budget saved for ${PERIODS.find((p) => p.value === period)?.label.toLowerCase()}`
        : `${name || selected.name} budget cleared`,
      "ok",
    );
    setSelected(null);
  }

  function saveCategory() {
    const name = newName.trim();
    if (!name) {
      toast("Give the category a name", "warn");
      return;
    }
    upsertFinanceCategory({ name, color: newColor });
    toast("Category added", "ok");
    setNewName("");
    setNewColor(TOKEN_COLORS[0].hex);
    setAddOpen(false);
  }

  const range = viewFor ? budgetRange(viewFor, now) : null;
  const categoryName = viewFor
    ? categories.find((category) => category.id === viewFor.categoryId)?.name ?? "Budget"
    : "";
  const transactions = viewFor
    ? entries
        .filter(
          (entry) =>
            entry.t >= range!.from &&
            entry.t < range!.to &&
            (entry.kind === "funds" || entry.categoryId === viewFor.categoryId),
        )
        .sort((a, b) => b.t - a.t)
    : [];
  const spentInPeriod = viewFor ? spentInRange(entries, range!.from, range!.to, viewFor.categoryId) : 0;

  return (
    <div className="anim-fade overflow-x-hidden px-5 pt-4">
      <div className="safe-t" />
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px]/7 font-bold tracking-[-0.02em] text-ink">Budgets</h1>
          <p className="mt-0.5 text-[15px] text-ink3">Spending envelopes for {monthLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          aria-label="Add category"
          className="press mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-line2 bg-surface text-ink2"
        >
          <Plus className="size-[20px]" />
        </button>
      </header>

      <section className="mt-5" aria-label="Monthly budget">
        <div className="rounded-2xl border border-line2 bg-surface px-4 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink3">
                Budget this month
              </p>
              <p className="tabnum mt-2 break-words text-[clamp(28px,8vw,38px)] font-bold leading-[1.05] tracking-[-0.03em] text-ink">
                {fmtMoney(planned)}
              </p>
            </div>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accentsoft text-accent">
              <Wallet className="size-[21px]" />
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line/70 pt-3">
            <div>
              <p className="text-[12px] text-ink3">Spent</p>
              <p className="tabnum mt-0.5 truncate text-[17px] font-semibold text-ink">
                {fmtMoney(monthSpent)}
              </p>
            </div>
            <div>
              <p className="text-[12px] text-ink3">{left < 0 ? "Over by" : "Left"}</p>
              <p
                className={cn(
                  "tabnum mt-0.5 truncate text-[17px] font-semibold",
                  left < 0 ? "text-danger" : "text-ink",
                )}
              >
                {fmtMoney(Math.abs(left))}
              </p>
            </div>
          </div>
          <BudgetBar spent={monthSpent} budget={planned} className="mt-3" />
        </div>
      </section>

      <section className="mt-6 pb-6">
        <h2 className="text-[15px] font-medium text-ink2">Categories</h2>
        <Card inset className="mt-2.5">
          {categories.map((category) => {
            const budget = budgetFor(budgets, category.id, now);
            const budgetWindow = budget ? budgetRange(budget, now) : null;
            const spentHere = budgetWindow
              ? spentInRange(entries, budgetWindow.from, budgetWindow.to, category.id)
              : spent[category.id] ?? 0;
            const remaining = budget ? budget.amount - spentHere : null;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => openBudget(category)}
                className="press flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-surface2/50"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: category.color }}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <span className="truncate text-[17px] font-semibold text-ink">
                      {category.name}
                    </span>
                    <span className="tabnum shrink-0 text-[14px] font-medium text-ink2">
                      {budget
                        ? `${fmtMoney(spentHere)} / ${fmtMoney(budget.amount)}`
                        : fmtMoney(spentHere)}
                    </span>
                  </span>
                  {budget ? (
                    <>
                      <BudgetBar spent={spentHere} budget={budget.amount} className="mt-2" />
                      <span
                        className={cn(
                          "mt-1.5 block text-[12px]",
                          remaining !== null && remaining < 0 ? "text-danger" : "text-ink3",
                        )}
                      >
                        {remaining !== null && remaining < 0
                          ? `${fmtMoney(Math.abs(remaining))} over budget`
                          : `${fmtMoney(remaining ?? 0)} left · ${PERIODS.find((p) => p.value === (budget.period ?? "month"))?.label ?? "Month"}`}
                      </span>
                    </>
                  ) : (
                    <span className="mt-0.5 block text-[13px] text-ink3">
                      Tap to set a budget
                    </span>
                  )}
                </span>
                <ChevronRight className="size-4 shrink-0 text-ink3" />
              </button>
            );
          })}
        </Card>
      </section>

      <Sheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.name} budget` : "Budget"}
        height="tall"
        footer={
          <Button block onClick={saveBudget}>
            Save budget
          </Button>
        }
      >
        <div className="space-y-4 pb-2">
          {selected && (
            <>
              {(() => {
                const current = budgetFor(budgets, selected.id, now);
                const window = current ? budgetRange(current, now) : { from: now, to: now };
                const used = current ? spentInRange(entries, window.from, window.to, selected.id) : 0;
                const balance = current ? current.amount - used : 0;
                return (
                  <div className="rounded-2xl border border-line2 bg-surface px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink3">
                      Available | balance
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[12px] text-ink3">Used</p>
                        <p className="tabnum mt-0.5 truncate text-[19px] font-bold text-ink">
                          {fmtMoney(used)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[12px] text-ink3">Balance</p>
                        <p
                          className={cn(
                            "tabnum mt-0.5 truncate text-[19px] font-bold",
                            balance < 0 ? "text-danger" : "text-accent",
                          )}
                        >
                          {fmtMoney(balance)}
                        </p>
                      </div>
                    </div>
                    {current && (
                      <button
                        onClick={() => setViewFor(current)}
                        className="press mt-3 inline-flex items-center gap-2 text-[14px] font-semibold text-accent"
                      >
                        <ReceiptText className="size-[17px]" />
                        View transactions
                      </button>
                    )}
                  </div>
                );
              })()}
              <Input
                label="Budget name"
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                placeholder="e.g. Academic"
              />
            </>
          )}
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-ink2">Duration</p>
            <Segmented value={period} onChange={setPeriod} options={PERIODS} />
          </div>
          {period === "custom" ? (
            <div className="grid grid-cols-2 gap-2.5">
              <Input
                label="From"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
              <Input
                label="To"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </div>
          ) : (
            <p className="text-[13px] text-ink3">
              {period === "week"
                ? "Resets every Monday."
                : period === "month"
                  ? `Resets each month · ${monthLabel}`
                  : "Resets each year."}
            </p>
          )}
          <Input
            label={`${PERIODS.find((p) => p.value === period)?.label ?? "Budget"} amount`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="0.00"
            inputMode="decimal"
            money
            leading={<span className="text-[15px] font-semibold text-ink2">₵</span>}
            autoFocus
          />
          <p className="text-[13px] text-ink3">Enter 0 to clear this budget.</p>
        </div>
      </Sheet>

      <Sheet
        open={viewFor !== null}
        onClose={() => setViewFor(null)}
        title={`${categoryName} transactions`}
        height="tall"
      >
        <div className="space-y-3 pb-2">
          <p className="text-[13px] text-ink3">
            {fmtMoney(spentInPeriod)} spent · {viewFor ? fmtMoney(viewFor.amount) : ""} budget ·{" "}
            {range ? `${dateShort(range.from)} – ${dateShort(range.to)}` : ""}
          </p>
          {transactions.length === 0 ? (
            <EmptyState
              icon={<ReceiptText className="size-7" />}
              title="No transactions yet"
              hint="Spending and funds-in recorded in this period will appear here."
            />
          ) : (
            <Card inset>
              {transactions.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-ink">
                      {entry.note || entry.source || FINANCE_METHOD_LABELS[entry.method]}
                    </span>
                    <span className="block truncate text-[12px] text-ink3">
                      {dateShort(entry.t)} ·{" "}
                      {entry.kind === "funds" ? "Funds in" : "Spending"}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "tabnum shrink-0 text-[15px] font-bold",
                      entry.kind === "funds" ? "text-accent" : "text-ink",
                    )}
                  >
                    {entry.kind === "funds" ? "+" : "−"}
                    {fmtMoney(entry.amount)}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </div>
      </Sheet>

      <Sheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="New category"
        footer={
          <Button block onClick={saveCategory}>
            Add category
          </Button>
        }
      >
        <div className="space-y-4 pb-2">
          <Input
            label="Category name"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="e.g. Laundry"
          />
          <div>
            <p className="mb-2 text-[13px] font-medium text-ink2">Colour</p>
            <div className="flex flex-wrap gap-2.5">
              {TOKEN_COLORS.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  aria-label={color.name}
                  aria-pressed={newColor === color.hex}
                  onClick={() => setNewColor(color.hex)}
                  className={cn(
                    "press size-9 rounded-full border-2",
                    newColor === color.hex ? "border-ink" : "border-transparent",
                  )}
                  style={{ background: color.hex }}
                />
              ))}
            </div>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
