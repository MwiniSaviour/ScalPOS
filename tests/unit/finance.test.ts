import test from "node:test";
import assert from "node:assert/strict";
import {
  appendMoneyKey,
  budgetFor,
  budgetTotal,
  financeSummary,
  monthKey,
  spentByCategory,
} from "../../lib/finance.ts";
import type { FinanceBudget, FinanceEntry } from "../../lib/types.ts";

const now = new Date(2026, 0, 15, 12).getTime();

function entry(partial: Partial<FinanceEntry> & Pick<FinanceEntry, "kind" | "amount" | "t">): FinanceEntry {
  return {
    id: partial.id ?? `fin_${partial.kind}_${partial.t}`,
    kind: partial.kind,
    amount: partial.amount,
    categoryId: partial.categoryId ?? null,
    source: partial.source ?? "",
    note: partial.note ?? "",
    method: partial.method ?? "cash",
    t: partial.t,
    createdAt: partial.createdAt ?? partial.t,
  };
}

test("monthKey uses local calendar months", () => {
  assert.equal(monthKey(now), "2026-01");
  assert.equal(monthKey(new Date(2026, 11, 31, 23).getTime()), "2026-12");
});

test("financeSummary separates this month from all time", () => {
  const entries = [
    entry({ kind: "funds", amount: 500, t: new Date(2026, 0, 2, 12).getTime() }),
    entry({ kind: "funds", amount: 100, t: new Date(2025, 11, 31, 12).getTime() }),
    entry({ kind: "expense", amount: 120, t: new Date(2026, 0, 5, 12).getTime() }),
    entry({ kind: "expense", amount: 40, t: new Date(2025, 11, 30, 12).getTime() }),
  ];
  const summary = financeSummary(entries, now);
  assert.equal(summary.balance, 440);
  assert.equal(summary.monthFunds, 500);
  assert.equal(summary.monthSpent, 120);
  assert.equal(summary.monthBalance, 380);
});

test("spentByCategory only counts this month's expenses", () => {
  const entries = [
    entry({ kind: "expense", amount: 50, categoryId: "food", t: now }),
    entry({ kind: "expense", amount: 20, categoryId: "food", t: new Date(2025, 11, 30, 12).getTime() }),
    entry({ kind: "expense", amount: 30, categoryId: "transport", t: now }),
    entry({ kind: "funds", amount: 100, categoryId: "food", t: now }),
  ];
  assert.deepEqual(spentByCategory(entries, now), { food: 50, transport: 30 });
});

test("budgetFor and budgetTotal match the current month", () => {
  const budgets: FinanceBudget[] = [
    { id: "b1", categoryId: "food", amount: 200, month: "2026-01", createdAt: 1, updatedAt: 1 },
    { id: "b2", categoryId: "food", amount: 300, month: "2025-12", createdAt: 1, updatedAt: 1 },
    { id: "b3", categoryId: "transport", amount: 100, month: "2026-01", createdAt: 1, updatedAt: 1 },
  ];
  assert.equal(budgetFor(budgets, "food", now)?.amount, 200);
  assert.equal(budgetFor(budgets, "savings", now), null);
  assert.equal(budgetTotal(budgets, now), 300);
});

test("appendMoneyKey builds two-decimal amounts safely", () => {
  assert.equal(appendMoneyKey("", "5"), "5");
  assert.equal(appendMoneyKey("0", "5"), "5");
  assert.equal(appendMoneyKey("5", "."), "5.");
  assert.equal(appendMoneyKey("", "."), "0.");
  assert.equal(appendMoneyKey("5.2", "5"), "5.25");
  assert.equal(appendMoneyKey("5.25", "9"), "5.25");
  assert.equal(appendMoneyKey("5.2", "."), "5.2");
});
