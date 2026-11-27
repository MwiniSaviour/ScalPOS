"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, Trash2 } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Confirm } from "@/components/ui/confirm";
import { Select } from "@/components/ui/select";
import { Input, TextArea } from "@/components/ui/input";
import { NumberPad } from "@/components/ui/numberpad";
import { useNow } from "@/lib/now";
import { fmtMoney, parsePrice, CURRENCY_SYMBOL } from "@/lib/money";
import { usePos } from "@/lib/store";
import { cn } from "@/lib/ui";
import {
  appendMoneyKey,
  budgetFor,
  budgetRange,
  FINANCE_METHOD_LABELS,
  inMonth,
} from "@/lib/finance";
import type { FinanceEntry, FinanceMethod } from "@/lib/types";

function toDateInput(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function fromDateInput(value: string, fallback: number): number {
  if (!value) return fallback;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isFinite(parsed.getTime()) ? parsed.getTime() : fallback;
}

function amountInput(amount: number): string {
  return amount.toFixed(2).replace(/\.00$/, "");
}

export function FinanceEntryScreen({ kind }: { kind: "expense" | "funds" }) {
  const params = useSearchParams();
  const entryId = params.get("id");
  const hydrated = usePos((s) => s.hydrated);
  const entry = usePos((s) =>
    entryId ? s.financeEntries.find((row) => row.id === entryId) : undefined,
  );
  const now = useNow();

  if (!hydrated) return null;
  return (
    <EntryForm
      key={`${entryId ?? "new"}-${now > 0 ? "now" : "pending"}`}
      kind={kind}
      entry={entry ?? null}
      now={now}
    />
  );
}

function EntryForm({
  kind,
  entry,
  now,
}: {
  kind: "expense" | "funds";
  entry: FinanceEntry | null;
  now: number;
}) {
  const router = useRouter();
  const entries = usePos((s) => s.financeEntries);
  const categories = usePos((s) => s.financeCategories);
  const budgets = usePos((s) => s.financeBudgets);
  const financeSources = usePos((s) => s.financeSources);
  const upsertFinanceSource = usePos((s) => s.upsertFinanceSource);
  const deleteFinanceSource = usePos((s) => s.deleteFinanceSource);
  const saveFinanceEntry = usePos((s) => s.saveFinanceEntry);
  const deleteFinanceEntry = usePos((s) => s.deleteFinanceEntry);
  const toast = usePos((s) => s.toast);

  const [raw, setRaw] = useState(() => (entry ? amountInput(entry.amount) : ""));
  const [categoryId, setCategoryId] = useState<string | null>(entry?.categoryId ?? null);
  const [source, setSource] = useState(entry?.source || financeSources[0] || "Allowance");
  const [note, setNote] = useState(entry?.note ?? "");
  const [method, setMethod] = useState<FinanceMethod>(entry?.method ?? "cash");
  const [date, setDate] = useState(() =>
    entry ? toDateInput(entry.t) : now > 0 ? toDateInput(now) : "",
  );
  const [deleteOpen, setDeleteOpen] = useState(false);

  const amount = parsePrice(raw);
  const category = categories.find((row) => row.id === categoryId) ?? null;
  const budget = categoryId ? budgetFor(budgets, categoryId, now) : null;
  const spentBefore = categoryId
    ? entries
        .filter((row) => {
          if (row.kind !== "expense" || row.categoryId !== categoryId || row.id === entry?.id) {
            return false;
          }
          const window = budget ? budgetRange(budget, now) : null;
          return window ? row.t >= window.from && row.t < window.to : inMonth(row.t, now);
        })
        .reduce((sum, row) => sum + row.amount, 0)
    : 0;
  const remaining = budget ? budget.amount - spentBefore - amount : null;
  const editing = entry !== null;
  const title =
    kind === "expense" ? (editing ? "Edit expense" : "New expense") : editing ? "Edit funds" : "Add funds";

  function save() {
    if (amount <= 0) {
      toast("Enter an amount first", "warn");
      return;
    }
    if (kind === "expense" && !categoryId) {
      toast("Pick a category", "warn");
      return;
    }
    const saved = saveFinanceEntry({
      ...(entry ? { id: entry.id } : {}),
      kind,
      amount,
      categoryId: kind === "expense" ? categoryId : null,
      source: kind === "funds" ? source : "",
      note,
      method,
      t: fromDateInput(date, entry?.t ?? 0),
    });
    if (!saved) {
      toast("Could not save this activity", "error");
      return;
    }
    toast(kind === "expense" ? "Expense saved" : "Funds added", "ok");
    router.back();
  }

  function remove() {
    if (!entry) return;
    deleteFinanceEntry(entry.id);
    setDeleteOpen(false);
    toast("Activity deleted", "warn");
    router.back();
  }

  return (
    <div className="anim-fade flex min-h-dvh flex-col px-5 pt-4">
      <div className="safe-t" />
      <header className="flex items-center gap-1">
        <IconButton
          label="Back"
          onClick={() => router.back()}
          className="-ml-2 shrink-0 text-ink"
        >
          <ChevronLeft className="size-[24px]" strokeWidth={2.2} />
        </IconButton>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[22px]/7 font-bold tracking-[-0.02em] text-ink">
            {title}
          </h1>
          <p className="truncate text-[13px] text-ink3">
            {kind === "expense" ? "What did you spend on?" : "Money you received"}
          </p>
        </div>
        {entry && (
          <IconButton
            label="Delete activity"
            onClick={() => setDeleteOpen(true)}
            className="shrink-0 text-danger"
          >
            <Trash2 className="size-[19px]" />
          </IconButton>
        )}
      </header>

      <section className="mt-5 rounded-2xl border border-line2 bg-surface px-4 py-5 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink3">
          {kind === "expense" ? "Expense amount" : "Funds amount"}
        </p>
        <p
          className={cn(
            "tabnum mt-2 break-words text-[clamp(34px,11vw,48px)] font-bold leading-none tracking-[-0.03em]",
            amount > 0 ? "text-ink" : "text-ink3",
          )}
        >
          {CURRENCY_SYMBOL}
          {amount.toLocaleString("en-GH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </section>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <NumberPad
          className="col-span-3"
          onDigit={(digit) => setRaw((current) => appendMoneyKey(current, digit))}
          onDelete={() => setRaw((current) => current.slice(0, -1))}
        />
      </div>

      {kind === "expense" ? (
        <section className="mt-5">
          <Select
            label="Category"
            leading={
              category ? (
                <span
                  className="block size-2.5 shrink-0 rounded-full"
                  style={{ background: category.color }}
                />
              ) : undefined
            }
            value={categoryId ?? ""}
            onChange={(next) => setCategoryId(next || null)}
            options={[
              { value: "", label: "Select a category" },
              ...categories.map((row) => ({ value: row.id, label: row.name, color: row.color })),
            ]}
            hint={category ? undefined : "Choose where this money went"}
          />
          {category && (
            <p
              className={cn(
                "mt-2 text-[13px]",
                remaining !== null && remaining < 0 ? "text-danger" : "text-ink3",
              )}
            >
              {budget
                ? remaining !== null && remaining < 0
                  ? `${fmtMoney(Math.abs(remaining))} over the ${category.name} budget`
                  : `${fmtMoney(remaining ?? 0)} left in ${category.name} this month`
                : `No budget set for ${category.name}`}
            </p>
          )}
        </section>
      ) : (
        <section className="mt-5">
          <Select
            label="Source"
            value={source}
            onChange={setSource}
            editable
            options={financeSources.map((row) => ({ value: row, label: row }))}
            onAddOption={(name) => {
              upsertFinanceSource(name);
              toast(`${name} added`, "ok");
            }}
            onRenameOption={(current, name) => {
              upsertFinanceSource(name, current);
              toast("Source updated", "ok");
            }}
            onDeleteOption={(name) => {
              deleteFinanceSource(name);
              toast(`${name} removed`, "warn");
            }}
          />
        </section>
      )}

      <section className="mt-5">
        <Select
          label="Payment method"
            value={method}
            onChange={(next) => setMethod(next as FinanceMethod)}
            options={(Object.keys(FINANCE_METHOD_LABELS) as FinanceMethod[]).map((row) => ({
            value: row,
            label: FINANCE_METHOD_LABELS[row],
          }))}
        />
      </section>

      <section className="mt-5">
        <Card className="px-4 py-4">
          <div className="flex flex-col gap-3.5">
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <TextArea
              label="Note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                kind === "expense"
                  ? "e.g. Hostel fee for the semester"
                  : "e.g. First allowance for the term"
              }
              className="[&_textarea]:min-h-[76px]"
            />
          </div>
        </Card>
      </section>

      <div className="flex-1" />
      <footer className="sticky bottom-0 mt-5 border-t border-line bg-bg2/95 px-0 pt-3 pb-[calc(var(--nova-sab)+12px)] backdrop-blur">
        <Button
          block
          size="lg"
          onClick={save}
          disabled={amount <= 0 || (kind === "expense" && !categoryId)}
        >
          {editing ? "Save changes" : kind === "expense" ? "Save expense" : "Add funds"}
        </Button>
      </footer>

      <Confirm
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={remove}
        tone="danger"
        title="Delete this activity?"
        body="This removes it from your balance and reports. This cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  );
}
