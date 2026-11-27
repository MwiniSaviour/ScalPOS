import type {
  BudgetPeriod,
  FinanceBudget,
  FinanceCategory,
  FinanceEntry,
  FinanceMethod,
} from "./types.ts";

export const FINANCE_METHOD_LABELS: Record<FinanceMethod, string> = {
  cash: "Cash",
  momo: "Mobile money",
  bank: "Bank",
  other: "Other",
};

export const FUNDING_SOURCES = ["Allowance", "Salary", "Grant", "Gift", "Other"] as const;

const CATEGORY_SEED: Array<[string, string]> = [
  ["Hostel / rent", "#4c8dff"],
  ["Food", "#34d399"],
  ["Transport", "#f5a524"],
  ["Academic", "#a78bfa"],
  ["Data & airtime", "#06b6d4"],
  ["Personal", "#ec4899"],
  ["Health", "#f4586e"],
  ["Savings", "#f6c453"],
  ["Other", "#94a3b8"],
];

export function defaultFinanceCategories(now = Date.now()): FinanceCategory[] {
  return CATEGORY_SEED.map(([name, color], index) => ({
    id: `fin_cat_${index + 1}`,
    name,
    color,
    createdAt: now,
    updatedAt: now,
  }));
}

export function monthKey(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthStart(t: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export function nextMonthStart(t: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
}

export function inMonth(t: number, now: number): boolean {
  return t >= monthStart(now) && t < nextMonthStart(now);
}

export function sumEntries(
  entries: FinanceEntry[],
  kind: FinanceEntry["kind"],
  from = -Infinity,
  to = Infinity,
): number {
  return entries.reduce(
    (sum, entry) =>
      entry.kind === kind && entry.t >= from && entry.t < to ? sum + entry.amount : sum,
    0,
  );
}

export type FinanceSummary = {
  balance: number;
  monthFunds: number;
  monthSpent: number;
  monthBalance: number;
  funds: number;
  spent: number;
};

export function financeSummary(entries: FinanceEntry[], now: number): FinanceSummary {
  const from = monthStart(now);
  const to = nextMonthStart(now);
  const funds = sumEntries(entries, "funds");
  const spent = sumEntries(entries, "expense");
  const monthFunds = sumEntries(entries, "funds", from, to);
  const monthSpent = sumEntries(entries, "expense", from, to);
  return {
    balance: funds - spent,
    monthFunds,
    monthSpent,
    monthBalance: monthFunds - monthSpent,
    funds,
    spent,
  };
}

export function spentByCategory(entries: FinanceEntry[], now: number): Record<string, number> {
  const from = monthStart(now);
  const to = nextMonthStart(now);
  const out: Record<string, number> = {};
  for (const entry of entries) {
    if (entry.kind !== "expense" || !entry.categoryId) continue;
    if (entry.t < from || entry.t >= to) continue;
    out[entry.categoryId] = (out[entry.categoryId] ?? 0) + entry.amount;
  }
  return out;
}

export function budgetKey(period: BudgetPeriod, now: number, from?: number, to?: number): string {
  if (period === "custom") return `custom:${from ?? 0}:${to ?? 0}`;
  if (period === "year") return String(new Date(now).getFullYear());
  if (period === "week") {
    const d = new Date(now);
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
    return `week:${monday.getTime()}`;
  }
  return monthKey(now);
}

export function budgetRange(budget: FinanceBudget, now: number): { from: number; to: number } {
  const period = budget.period ?? "month";
  if (period === "custom") {
    return {
      from: budget.from ?? -Infinity,
      to: budget.to ?? Infinity,
    };
  }
  if (period === "year") {
    const year = new Date(now).getFullYear();
    return {
      from: new Date(year, 0, 1).getTime(),
      to: new Date(year + 1, 0, 1).getTime(),
    };
  }
  if (period === "week") {
    const d = new Date(now);
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
    return {
      from: monday.getTime(),
      to: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7).getTime(),
    };
  }
  return { from: monthStart(now), to: nextMonthStart(now) };
}

export function budgetFor(
  budgets: FinanceBudget[],
  categoryId: string,
  now: number,
  period?: BudgetPeriod,
): FinanceBudget | null {
  return (
    budgets.find(
      (budget) =>
        budget.categoryId === categoryId &&
        (period ? (budget.period ?? "month") === period : true) &&
        budget.month === budgetKey(budget.period ?? "month", now, budget.from, budget.to),
    ) ?? null
  );
}

export function budgetTotal(
  budgets: FinanceBudget[],
  now: number,
  period?: BudgetPeriod,
): number {
  return budgets
    .filter(
      (budget) =>
        (period ? (budget.period ?? "month") === period : true) &&
        budget.month === budgetKey(budget.period ?? "month", now, budget.from, budget.to),
    )
    .reduce((sum, budget) => sum + budget.amount, 0);
}

export function spentInRange(
  entries: FinanceEntry[],
  from: number,
  to: number,
  categoryId?: string,
): number {
  return entries.reduce(
    (sum, entry) =>
      entry.kind === "expense" &&
      entry.t >= from &&
      entry.t < to &&
      (!categoryId || entry.categoryId === categoryId)
        ? sum + entry.amount
        : sum,
    0,
  );
}

export function appendMoneyKey(current: string, key: string): string {
  if (!/^[0-9.]$/.test(key)) return current;
  if (key === ".") {
    if (current.includes(".")) return current;
    return current === "" ? "0." : `${current}.`;
  }
  if (current === "0") return key;
  if (current.includes(".") && current.split(".")[1].length >= 2) return current;
  const next = `${current}${key}`;
  const whole = next.split(".")[0].replace(/^0+(?=\d)/, "");
  if (whole.length > 9) return current;
  return next;
}
