"use client";

import { useState } from "react";
import { ChevronRight, Plus, Wallet } from "lucide-react";
import { BudgetBar } from "@/components/finance/budget-bar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { budgetFor, budgetTotal, spentByCategory } from "@/lib/finance";
import { fmtMoney, parsePrice } from "@/lib/money";
import { useNow } from "@/lib/now";
import { usePos } from "@/lib/store";
import { cn, TOKEN_COLORS } from "@/lib/ui";
import type { FinanceCategory } from "@/lib/types";

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
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(TOKEN_COLORS[0].hex);

  const spent = spentByCategory(entries, now);
  const planned = budgetTotal(budgets, now);
  const monthSpent = Object.values(spent).reduce((sum, value) => sum + value, 0);
  const left = planned - monthSpent;
  const monthLabel =
    now > 0
      ? new Date(now).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
      : "this month";

  function openBudget(category: FinanceCategory) {
    const budget = budgetFor(budgets, category.id, now);
    setSelected(category);
    setDraft(budget ? String(budget.amount) : "");
  }

  function saveBudget() {
    if (!selected) return;
    const amount = parsePrice(draft);
    setFinanceBudget(selected.id, amount);
    toast(amount > 0 ? `${selected.name} budget updated` : `${selected.name} budget cleared`, "ok");
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

  return (
    <div className="anim-fade overflow-x-hidden px-5 pt-4">
      <div className="safe-t" />
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px]/7 font-bold tracking-[-0.02em] text-ink">Budgets</h1>
          <p className="mt-0.5 text-[15px] text-ink3">Monthly envelopes for {monthLabel}</p>
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
            const spentHere = spent[category.id] ?? 0;
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
                      {budget ? `${fmtMoney(spentHere)} / ${fmtMoney(budget.amount)}` : fmtMoney(spentHere)}
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
                          : `${fmtMoney(remaining ?? 0)} left`}
                      </span>
                    </>
                  ) : (
                    <span className="mt-0.5 block text-[13px] text-ink3">
                      Tap to set a monthly budget
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
        footer={
          <Button block onClick={saveBudget}>
            Save budget
          </Button>
        }
      >
        <div className="space-y-4 pb-2">
          <p className="text-[14px] leading-5 text-ink3">
            Set the most you want to spend on {selected?.name.toLowerCase()} each month.
            Enter 0 to clear it.
          </p>
          <Input
            label={`${monthLabel} budget`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="0.00"
            inputMode="decimal"
            money
            leading={<span className="text-[15px] font-semibold text-ink2">₵</span>}
            autoFocus
          />
          {selected && (
            <p className="text-[13px] text-ink3">
              Already spent this month: {fmtMoney(spent[selected.id] ?? 0)}
            </p>
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
            onChange={(e) => setNewName(e.target.value)}
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
                    newColor === color.hex ? "border-ink" : "border-line2",
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
