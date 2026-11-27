"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ChevronRight,
  PiggyBank,
  Plus,
  Settings2,
  Target,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/emptystate";
import { Confirm } from "@/components/ui/confirm";
import { Input, TextArea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { dateShort, startOfDay } from "@/lib/format";
import { fmtMoney } from "@/lib/money";
import { useNow } from "@/lib/now";
import { usePos } from "@/lib/store";
import { cn, hueColor, hueSoft, TOKEN_COLORS } from "@/lib/ui";
import type { FinanceGoal } from "@/lib/types";

type GoalTone = "accent" | "warn" | "danger" | "neutral";

function percent(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function toDateInput(value: number | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function fromDateInput(value: string): number | null {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isFinite(parsed.getTime()) ? parsed.getTime() : null;
}

function daysBetween(from: number, to: number): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / 86400000);
}

function goalStatus(goal: FinanceGoal, now: number): { label: string; line: string; tone: GoalTone } {
  const shortfall = goal.target - goal.balance;
  if (shortfall <= 0) {
    const extra = Math.abs(shortfall);
    return {
      label: extra > 0 ? "Reached" : "Complete",
      line: extra > 0 ? `Goal reached and exceeded by ${fmtMoney(extra)}` : "Goal reached",
      tone: "accent",
    };
  }
  if (!(now > 0) || !goal.endDate) {
    return {
      label: `${fmtMoney(shortfall)} to go`,
      line: `${fmtMoney(shortfall)} left to reach this goal.`,
      tone: "neutral",
    };
  }
  const days = daysBetween(now, goal.endDate);
  if (days < 0) {
    const overdue = Math.abs(days);
    return {
      label: `Overdue ${overdue}d`,
      line: `${fmtMoney(shortfall)} left — overdue by ${overdue} day${overdue === 1 ? "" : "s"}. Extend the date to keep this goal on track.`,
      tone: "danger",
    };
  }
  if (days === 0) {
    return {
      label: "Due today",
      line: `${fmtMoney(shortfall)} left — the projected date is today.`,
      tone: "warn",
    };
  }
  if (days <= 7) {
    return {
      label: `Due in ${days}d`,
      line: `${fmtMoney(shortfall)} left — due in ${days} day${days === 1 ? "" : "s"}.`,
      tone: "warn",
    };
  }
  return {
    label: `Due ${dateShort(goal.endDate)}`,
    line: `${fmtMoney(shortfall)} left to reach this goal by ${dateShort(goal.endDate)}.`,
    tone: "neutral",
  };
}

const TONE_CLASS: Record<GoalTone, string> = {
  accent: "bg-accentsoft text-accent",
  warn: "bg-warn/10 text-warn",
  danger: "bg-danger/10 text-danger",
  neutral: "bg-surface3 text-ink3",
};

const STATUS_LINE_CLASS: Record<GoalTone, string> = {
  accent: "text-accent",
  warn: "text-warn",
  danger: "text-danger",
  neutral: "text-ink3",
};

export default function SavingsScreen() {
  const goals = usePos((s) => s.financeGoals);
  const financeSources = usePos((s) => s.financeSources);
  const upsertFinanceSource = usePos((s) => s.upsertFinanceSource);
  const deleteFinanceSource = usePos((s) => s.deleteFinanceSource);
  const entries = usePos((s) => s.financeEntries);
  const upsertFinanceGoal = usePos((s) => s.upsertFinanceGoal);
  const deleteFinanceGoal = usePos((s) => s.deleteFinanceGoal);
  const saveFinanceEntry = usePos((s) => s.saveFinanceEntry);
  const toast = usePos((s) => s.toast);
  const now = useNow();

  const [goalOpen, setGoalOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceGoal | null>(null);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [color, setColor] = useState<string>(TOKEN_COLORS[0].hex);
  const [goalNote, setGoalNote] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [payFor, setPayFor] = useState<FinanceGoal | null>(null);
  const [removing, setRemoving] = useState<FinanceGoal | null>(null);
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("Allowance");
  const [contributionNote, setContributionNote] = useState("");

  const total = goals.reduce((sum, goal) => sum + goal.balance, 0);
  const targetTotal = goals.reduce((sum, goal) => sum + goal.target, 0);

  const segments = useMemo(() => {
    const rows = goals.filter((goal) => goal.balance > 0);
    return rows.map((goal, index) => {
      const start = rows
        .slice(0, index)
        .reduce((sum, row) => sum + percent(row.balance, total), 0);
      const share = index === rows.length - 1 ? 100 - start : percent(goal.balance, total);
      return { ...goal, start, share };
    });
  }, [goals, total]);

  const contributions = useMemo(
    () =>
      entries
        .filter((entry) => entry.kind === "funds" && entry.goalId)
        .sort((a, b) => b.t - a.t)
        .slice(0, 6),
    [entries],
  );

  const donut =
    segments.length === 0
      ? "conic-gradient(var(--chart-track) 0 100%)"
      : `conic-gradient(${segments
          .map((goal) => `${hueColor(goal.color)} ${goal.start}% ${goal.start + goal.share}%`)
          .join(", ")})`;

  function openGoal(goal?: FinanceGoal) {
    setEditing(goal ?? null);
    setName(goal?.name ?? "");
    setTarget(goal ? String(goal.target) : "");
    setColor(goal?.color ?? TOKEN_COLORS[0].hex);
    setGoalNote(goal?.note ?? "");
    setStartDate(toDateInput(goal?.startDate));
    setEndDate(toDateInput(goal?.endDate));
    setGoalOpen(true);
  }

  function saveGoal() {
    const value = Number(target);
    if (!name.trim() || !Number.isFinite(value) || value <= 0) {
      toast("Give the goal a name and a target", "warn");
      return;
    }
    const start = fromDateInput(startDate);
    const end = fromDateInput(endDate);
    if (start && end && end < start) {
      toast("The end date must be after the start date", "warn");
      return;
    }
    upsertFinanceGoal({
      id: editing?.id,
      name: name.trim(),
      target: value,
      color,
      note: goalNote.trim(),
      startDate: start,
      endDate: end,
    });
    toast(editing ? "Goal updated" : "Savings goal created", "ok");
    setGoalOpen(false);
  }

  function addMoney() {
    const value = Number(amount);
    if (!payFor || !Number.isFinite(value) || value <= 0) {
      toast("Enter an amount to add", "warn");
      return;
    }
    saveFinanceEntry({
      kind: "funds",
      amount: value,
      goalId: payFor.id,
      source,
      note: contributionNote.trim() || `Added to ${payFor.name}`,
    });
    upsertFinanceGoal({
      id: payFor.id,
      name: payFor.name,
      target: payFor.target,
      color: payFor.color,
      balance: payFor.balance + value,
      note: payFor.note,
      startDate: payFor.startDate,
      endDate: payFor.endDate,
    });
    toast(`${fmtMoney(value)} added to ${payFor.name}`, "ok");
    setAmount("");
    setContributionNote("");
    setPayFor(null);
  }

  const payStatus = payFor ? goalStatus(payFor, now) : null;

  return (
    <div className="anim-fade overflow-x-hidden px-5 pt-4">
      <div className="safe-t" />
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px]/7 font-bold tracking-[-0.02em] text-ink">Savings</h1>
          <p className="mt-0.5 text-[15px] text-ink3">Grow your money towards real goals</p>
        </div>
        <Link
          href="/more"
          aria-label="More settings"
          className="press mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-full border border-line2 bg-surface text-ink2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Settings2 className="size-[19px]" />
        </Link>
      </header>

      <section className="mt-5">
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div
              className="relative size-32 shrink-0 rounded-full"
              style={{ background: donut }}
              role="img"
              aria-label="Savings allocation by goal"
            >
              <div className="absolute inset-[14px] flex flex-col items-center justify-center rounded-full bg-surface text-center">
                <PiggyBank className="size-6 text-accent" />
                <span className="mt-1 text-[12px] font-medium text-ink3">All goals</span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink3">
                Total saved
              </p>
              <p className="tabnum mt-1.5 break-words text-[clamp(20px,5.5vw,28px)] font-bold leading-[1.1] tracking-[-0.02em] text-ink">
                {fmtMoney(total)}
              </p>
              <p className="mt-1 text-[13px] text-ink3">of {fmtMoney(targetTotal)} planned</p>
              <p className="mt-2 text-[12px] text-ink3">{goals.length} active goals</p>
            </div>
          </div>
          {segments.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-line/70 pt-3">
              {segments.map((goal) => (
                <div key={goal.id} className="flex items-center gap-2 text-[12px]">
                  <span
                    className="size-2 shrink-0 rounded-[3px]"
                    style={{ background: hueColor(goal.color) }}
                  />
                  <span className="min-w-0 flex-1 truncate text-ink3">{goal.name}</span>
                  <span className="tabnum font-semibold text-ink">{goal.share}%</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-medium text-ink2">Your goals</h2>
          {goals.length > 0 && (
            <Button size="sm" variant="secondary" onClick={() => openGoal()} icon={<Plus className="size-4" />}>
              New goal
            </Button>
          )}
        </div>
        {goals.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Target className="size-7" />}
              title="No savings goals yet"
              hint="Set a target for something you want — a laptop, a trip, or an emergency fund."
              action={
                <Button className="mt-2" onClick={() => openGoal()} icon={<Plus className="size-[18px]" />}>
                  Create a goal
                </Button>
              }
            />
          </Card>
        ) : (
          <Card inset>
            {goals.map((goal) => {
              const progress = Math.min(100, percent(goal.balance, goal.target));
              const status = goalStatus(goal, now);
              return (
                <button
                  key={goal.id}
                  onClick={() => {
                    setPayFor(goal);
                    setAmount("");
                    setSource(financeSources[0] ?? "Allowance");
                    setContributionNote("");
                  }}
                  className="press w-full rounded-xl px-4 py-3 text-left hover:bg-surface2/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: hueSoft(goal.color), color: hueColor(goal.color) }}
                    >
                      <Target className="size-[19px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px] font-semibold text-ink">
                        {goal.name}
                      </span>
                      <span className="tabnum mt-0.5 block text-[13px] text-ink3">
                        SAVED {fmtMoney(goal.balance)} · TARGET {fmtMoney(goal.target)}
                      </span>
                      <span
                        className={cn(
                          "mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          TONE_CLASS[status.tone],
                        )}
                      >
                        {status.label}
                      </span>
                      {goal.note && (
                        <span className="mt-1 block truncate text-[12px] text-ink3">{goal.note}</span>
                      )}
                    </span>
                    <span className="tabnum shrink-0 text-[15px] font-bold text-ink">{progress}%</span>
                    <ChevronRight className="size-4 shrink-0 text-ink3" />
                  </div>
                  <span className="mt-2.5 block h-1.5 overflow-hidden rounded-full bg-[var(--chart-track)]">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${progress}%`, background: hueColor(goal.color) }}
                    />
                  </span>
                </button>
              );
            })}
          </Card>
        )}
      </section>

      <section className="mt-6 pb-6">
        <h2 className="mb-2 text-[15px] font-medium text-ink2">Recent contributions</h2>
        {contributions.length === 0 ? (
          <Card>
            <EmptyState
              icon={<ArrowDownLeft className="size-7" />}
              title="Nothing saved yet"
              hint="Add money to a goal and every contribution will show up here."
              action={
                goals.length > 0 ? undefined : (
                  <Button className="mt-2" onClick={() => openGoal()} icon={<Plus className="size-[18px]" />}>
                    Create a goal
                  </Button>
                )
              }
            />
          </Card>
        ) : (
          <Card inset>
            {contributions.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accentsoft text-accent">
                  <ArrowDownLeft className="size-[17px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-ink">{entry.source}</span>
                  <span className="block truncate text-[12px] text-ink3">
                    {entry.note || "Added to savings"} · {new Date(entry.t).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                </span>
                <span className="tabnum shrink-0 text-[15px] font-bold text-accent">
                  +{fmtMoney(entry.amount)}
                </span>
              </div>
            ))}
          </Card>
        )}
      </section>

      <Sheet
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        title={editing ? "Edit goal" : "New savings goal"}
        footer={
          <div className="flex items-center gap-2">
            {editing && (
              <Button
                variant="danger"
                icon={<Trash2 className="size-[18px]" />}
                onClick={() => {
                  setRemoving(editing);
                  setGoalOpen(false);
                }}
              >
                Delete
              </Button>
            )}
            <Button block onClick={saveGoal}>
              {editing ? "Save changes" : "Create goal"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 pt-1">
          <Input
            label="Goal name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Emergency fund"
          />
          <Input
            label="Target amount"
            type="number"
            inputMode="decimal"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            placeholder="0.00"
            money
          />
          <Input
            label="Start date (optional)"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
          <Input
            label="Projected end date (optional)"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            hint="We'll warn you when this date is close, due or overdue."
          />
          <TextArea
            label="Note (optional)"
            value={goalNote}
            onChange={(event) => setGoalNote(event.target.value)}
            placeholder="e.g. For my final year at school"
            className="[&_textarea]:min-h-[72px]"
          />
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-ink2">Colour</p>
            <div className="flex flex-wrap gap-2">
              {TOKEN_COLORS.map((token) => (
                <button
                  key={token.hex}
                  onClick={() => setColor(token.hex)}
                  aria-label={`Use ${token.name} colour`}
                  aria-pressed={color === token.hex}
                  className={cn(
                    "size-9 rounded-full border-2 transition-transform",
                    color === token.hex ? "scale-110 border-ink" : "border-line2",
                  )}
                  style={{ background: token.hex }}
                />
              ))}
            </div>
          </div>
        </div>
      </Sheet>

      <Confirm
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) {
            deleteFinanceGoal(removing.id);
            toast("Goal deleted", "warn");
          }
          setRemoving(null);
        }}
        tone="danger"
        title="Delete this goal?"
        body={`This removes ${removing ? fmtMoney(removing.balance) : ""} recorded in ${removing?.name ?? "this goal"}. Contributions stay in your activity.`}
        confirmLabel="Delete goal"
      />

      <Sheet
        open={payFor !== null}
        onClose={() => setPayFor(null)}
        title={payFor ? `Add to ${payFor.name}` : "Add money"}
        footer={
          <Button block onClick={addMoney} icon={<Plus className="size-[18px]" />}>
            Add money
          </Button>
        }
      >
        <div className="space-y-4 pt-1">
          {payFor && payStatus && (
            <div className="rounded-xl border border-line2 bg-surface2 p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink3">
                    Goal insight
                  </p>
                  <p className="mt-1 truncate text-[15px] font-semibold text-ink">{payFor.name}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    TONE_CLASS[payStatus.tone],
                  )}
                >
                  {payStatus.label}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <p className="text-[12px] text-ink3">Target</p>
                  <p className="tabnum mt-0.5 truncate text-[16px] font-semibold text-ink">
                    {fmtMoney(payFor.target)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] text-ink3">Saved so far</p>
                  <p className="tabnum mt-0.5 truncate text-[16px] font-semibold text-accent">
                    {fmtMoney(payFor.balance)}
                  </p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--chart-track)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, percent(payFor.balance, payFor.target))}%`,
                    background: hueColor(payFor.color),
                  }}
                />
              </div>
              <p className={cn("mt-2 text-[13px] leading-5", STATUS_LINE_CLASS[payStatus.tone])}>
                {payStatus.line}
              </p>
              {payFor.note && <p className="mt-1 text-[12px] text-ink3">{payFor.note}</p>}
            </div>
          )}
          <Input
            label="Amount"
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
            money
          />
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
          <TextArea
            label="Note (optional)"
            value={contributionNote}
            onChange={(event) => setContributionNote(event.target.value)}
            placeholder="e.g. Allowance for the term"
            className="[&_textarea]:min-h-[72px]"
          />
        </div>
      </Sheet>
    </div>
  );
}
