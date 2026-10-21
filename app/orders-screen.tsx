"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/emptystate";
import { Input, SearchBar } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";

import { Receipt } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { addDays, startOfDay, timeAgo } from "@/lib/format";
import { fmtMoney } from "@/lib/money";
import { useNow } from "@/lib/now";
import { usePos } from "@/lib/store";
import type { Order } from "@/lib/types";
import { cn } from "@/lib/ui";

type Filter = "all" | "pending" | "completed" | "refunded" | "unpaid";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "refunded", label: "Refunded" },
  { value: "unpaid", label: "Unpaid" },
];

/** Date presets. Everything but "custom" is derived from the clock, so the
 *  window rolls over at midnight on its own. */
type Period = "today" | "yesterday" | "7d" | "30d" | "all" | "custom";

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom…" },
];

type DayPair = { from: string; to: string };

const NO_RANGE: DayPair = { from: "", to: "" };

export default function OrdersScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const orders = usePos((s) => s.orders);
  const customers = usePos((s) => s.customers);
  const now = useNow(60_000);

  const rawFilter = params.get("filter");
  const filter = (FILTERS.some((f) => f.value === rawFilter) ? rawFilter : "all") as Filter;

  /* The period lives in the URL (?period=7d&from=YYYY-MM-DD&to=YYYY-MM-DD) so
     the view is shareable, survives back/forward, and the back button walks
     back through the periods the user picked. */
  const urlFrom = params.get("from") ?? "";
  const urlTo = params.get("to") ?? "";
  const period = readPeriod(params.get("period"), urlFrom, urlTo);
  /** the applied custom range */
  const applied = useMemo<DayPair>(
    () => (period === "custom" ? { from: urlFrom, to: urlTo } : NO_RANGE),
    [period, urlFrom, urlTo],
  );

  const [query, setQuery] = useState("");
  /** the sheet's working copy — nothing filters until Apply */
  const [draft, setDraft] = useState<DayPair>(NO_RANGE);
  const [sheetOpen, setSheetOpen] = useState(false);

  const writeUrl = (next: URLSearchParams, push: boolean) => {
    const qs = next.toString();
    const href = qs ? `/orders?${qs}` : "/orders";
    if (push) router.push(href, { scroll: false });
    else router.replace(href, { scroll: false });
  };

  const setFilter = (f: Filter) => {
    const next = new URLSearchParams(Array.from(params.entries()));
    if (f === "all") next.delete("filter");
    else next.set("filter", f);
    writeUrl(next, false);
  };

  /** Pushed, not replaced — the back button restores the previous period. */
  const setPeriod = (p: Period, range: DayPair) => {
    const next = new URLSearchParams(Array.from(params.entries()));
    if (p === "today") next.delete("period");
    else next.set("period", p);
    if (p === "custom") {
      if (range.from) next.set("from", range.from);
      else next.delete("from");
      if (range.to) next.set("to", range.to);
      else next.delete("to");
    } else {
      next.delete("from");
      next.delete("to");
    }
    writeUrl(next, true);
  };

  const choosePeriod = (p: Period) => {
    if (p === "custom") {
      setDraft(applied);
      setSheetOpen(true);
      return;
    }
    setPeriod(p, NO_RANGE);
  };

  /** The clock is the only source of "today", and it arrives a tick after
   *  mount. Until then the day window is unknown — so hold the list back
   *  instead of flashing the whole history for a frame. */
  const settling = period !== "all" && period !== "custom" && !(now > 0);

  /** the day window the list is cut to — `to` is exclusive */
  const bounds = useMemo<{ from: number | null; to: number | null }>(() => {
    if (period === "all") return { from: null, to: null };
    if (period === "custom") {
      const f = applied.from ? parseDay(applied.from) : NaN;
      const t = applied.to ? parseDay(applied.to) : NaN;
      return {
        from: Number.isFinite(f) ? startOfDay(f) : null,
        // the end day is counted whole — it runs to 23:59:59
        to: Number.isFinite(t) ? addDays(startOfDay(t), 1) : null,
      };
    }
    // no clock yet (first paint) — don't cut the list by a window we can't know
    if (!(now > 0)) return { from: null, to: null };
    const todayStart = startOfDay(now);
    switch (period) {
      case "yesterday":
        return { from: addDays(todayStart, -1), to: todayStart };
      case "7d":
        return { from: addDays(todayStart, -6), to: addDays(todayStart, 1) };
      case "30d":
        return { from: addDays(todayStart, -29), to: addDays(todayStart, 1) };
      default:
        return { from: todayStart, to: addDays(todayStart, 1) };
    }
  }, [period, applied, now]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders
      .filter((o) => {
        if (!statusMatches(o, filter)) return false;
        if (bounds.from !== null && o.createdAt < bounds.from) return false;
        if (bounds.to !== null && o.createdAt >= bounds.to) return false;
        if (!q) return true;
        return searchHay(o, customers).includes(q);
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [orders, customers, filter, query, bounds]);

  const summary = useMemo(() => {
    // a refunded order is history, not money in — it stays in the count
    // but never adds to the period's takings
    let total = 0;
    for (const o of list) if (o.status !== "refunded") total += o.total;
    return { count: list.length, total };
  }, [list]);

  const periodLabel = useMemo(() => {
    switch (period) {
      case "today":
        return "Today";
      case "yesterday":
        return "Yesterday";
      case "7d":
        return "Last 7 days";
      case "30d":
        return "Last 30 days";
      case "all":
        return "All time";
      case "custom":
        return customLabel(applied);
    }
  }, [period, applied]);

  /** Which knob emptied the list — relax one at a time to find out, so the
   *  empty state can name the real reason instead of guessing. */
  const culprit = useMemo<"" | "query" | "period" | "filter" | "none">(() => {
    if (list.length > 0) return "";
    if (orders.length === 0) return "none";
    const q = query.trim().toLowerCase();
    const inWindow = (o: Order) =>
      (bounds.from === null || o.createdAt >= bounds.from) &&
      (bounds.to === null || o.createdAt < bounds.to);
    const matchesQuery = (o: Order) => !q || searchHay(o, customers).includes(q);
    if (orders.some((o) => inWindow(o) && statusMatches(o, filter) && !matchesQuery(o))) return "query";
    if (orders.some((o) => statusMatches(o, filter) && matchesQuery(o) && !inWindow(o))) return "period";
    if (orders.some((o) => inWindow(o) && matchesQuery(o) && !statusMatches(o, filter))) return "filter";
    return "none";
  }, [list, orders, customers, query, bounds, filter]);

  const draftError = useMemo(() => {
    const f = draft.from ? parseDay(draft.from) : NaN;
    const t = draft.to ? parseDay(draft.to) : NaN;
    if (Number.isFinite(f) && Number.isFinite(t) && f > t) return "The start date is after the end date.";
    return "";
  }, [draft.from, draft.to]);

  const applyCustom = () => {
    setPeriod("custom", draft);
    setSheetOpen(false);
  };

  /** Reset drops the custom range entirely — the list goes back to all time. */
  const resetCustom = () => {
    setDraft(NO_RANGE);
    setSheetOpen(false);
    if (period === "custom") setPeriod("all", NO_RANGE);
  };

  const hasQuery = query.trim() !== "";
  const emptyHint =
    culprit === "query"
      ? "No order matches your search."
      : culprit === "period"
        ? "No orders in this period."
        : culprit === "filter"
          ? "Nothing with this filter."
          : period !== "all"
            ? "No orders in this period."
            : filter !== "all"
              ? "Nothing with this filter."
              : "Try a wider period.";

  return (
    <>
      <div className="anim-fade px-5 pt-4">
        <header>
          <h1 className="text-[26px]/7 font-bold tracking-[-0.02em] break-words text-ink">Orders</h1>
          <p className="mt-0.5 text-[14px] text-ink3">
            {settling
              ? ""
              : `${summary.count} order${summary.count === 1 ? "" : "s"} · ${fmtMoney(summary.total)} total · ${periodLabel}`}
          </p>
        </header>

        {/* date filter */}
        <div className="edge-fade no-scrollbar -mx-5 mt-3 overflow-x-auto px-5">
          <div className="flex w-max gap-1.5">
            {PERIODS.map((p) => (
              <Chip key={p.value} active={period === p.value} onClick={() => choosePeriod(p.value)}>
                {p.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <SearchBar value={query} onChange={setQuery} placeholder="Order # or customer…" />
        </div>

        {/* status filter */}
        <div className="edge-fade no-scrollbar -mx-5 mt-2 overflow-x-auto px-5">
          <div className="flex w-max gap-1.5">
            {FILTERS.map((f) => (
              <Chip key={f.value} active={filter === f.value} onClick={() => setFilter(f.value)}>
                {f.label}
              </Chip>
            ))}
          </div>
        </div>

        {settling ? (
          <section className="mt-3 pb-6" />
        ) : list.length === 0 ? (
          <section className="mt-8 pb-6">
            {orders.length === 0 ? (
              <EmptyState
                icon={<Receipt className="size-7" />}
                title="No orders yet"
                hint="Start a sale from the Sell tab and it will appear here."
                action={<Button onClick={() => router.push("/sell")}>Start selling</Button>}
              />
            ) : (
              <EmptyState
                icon={<Receipt className="size-7" />}
                title="No orders found"
                hint={emptyHint}
                action={
                  hasQuery ? (
                    <Button variant="secondary" onClick={() => setQuery("")}>
                      Clear search
                    </Button>
                  ) : period !== "all" ? (
                    <Button variant="secondary" onClick={() => setPeriod("all", NO_RANGE)}>
                      Show all time
                    </Button>
                  ) : filter !== "all" ? (
                    <Button variant="secondary" onClick={() => setFilter("all")}>
                      Show all orders
                    </Button>
                  ) : null
                }
              />
            )}
          </section>
        ) : (
          <section className="mt-3 pb-6">
            <Card inset>
              {list.map((o) => {
                const c = customers.find((x) => x.id === o.customerId);
                const refunded = o.status === "refunded";
                const unpaid = !refunded && (o.payStatus === "unpaid" || o.payStatus === "partial");
                const qty = o.items.reduce((s, i) => s + i.qty, 0);
                return (
                  <Link
                    key={o.id}
                    href={`/orders/detail?id=${o.id}`}
                    className="press flex items-center gap-3 px-4 py-3.5 hover:bg-surface2/50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[17px] font-semibold leading-tight text-ink">
                        {c?.name ?? "Walk-in"}
                      </span>
                      <span className="mt-1 block truncate text-[14px] text-ink3">
                        {`${timeAgo(o.createdAt, now)} · ${qty} item${qty === 1 ? "" : "s"} · #${o.id.slice(-4)}`}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-0.5">
                      <span
                        className={cn(
                          "tabnum text-[17px] font-bold",
                          refunded ? "text-ink3" : unpaid ? "text-warn" : "text-ink",
                        )}
                      >
                        {fmtMoney(o.total)}
                      </span>
                      {refunded ? (
                        <span className="text-[14px] text-ink3">Refunded</span>
                      ) : unpaid ? (
                        <span className="flex items-center gap-1.5 text-[14px] font-medium text-warn">
                          <span className="size-1.5 rounded-full bg-warn" />
                          {o.payStatus === "partial" ? "Partial" : "Unpaid"}
                        </span>
                      ) : (
                        <span className="text-[14px] text-ink3">Paid</span>
                      )}
                    </span>
                  </Link>
                );
              })}
            </Card>
          </section>
        )}
      </div>

      {/* the sheet lives outside the animated page wrapper so it layers above the tab bar */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Custom date range"
        footer={
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="secondary" block onClick={resetCustom}>
              Reset
            </Button>
            <Button
              block
              onClick={applyCustom}
              disabled={draftError !== "" || (draft.from === "" && draft.to === "")}
            >
              Apply
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3.5 pb-2">
          <Input
            label="From"
            type="date"
            value={draft.from}
            onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
          />
          <Input
            label="To"
            type="date"
            value={draft.to}
            error={draftError}
            onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
          />
          <p className="text-[13px] text-ink3">
            The end day is counted whole. Leave a field empty to keep that side open.
          </p>
        </div>
      </Sheet>
    </>
  );
}

/** Reads the period out of the URL, falling back to today. */
function readPeriod(raw: string | null, from: string, to: string): Period {
  if (raw === "custom") return from || to ? "custom" : "all";
  if (raw && PERIODS.some((p) => p.value === raw)) return raw as Period;
  return "today";
}

/** The status chips' own rule, shared by the list and the empty-state probe. */
function statusMatches(o: Order, filter: Filter): boolean {
  if (filter === "pending") return o.status === "pending";
  if (filter === "completed") return o.status === "completed";
  if (filter === "refunded") return o.status === "refunded";
  if (filter === "unpaid") return o.payStatus === "unpaid" || o.payStatus === "partial";
  return true;
}

/** Everything the search bar can match on, lowercased. */
function searchHay(o: Order, customers: { id: string; name: string }[]): string {
  const customer = customers.find((c) => c.id === o.customerId);
  return `${o.id} ${customer?.name ?? ""} walk-in`.toLowerCase();
}

/** Parses a native date input value ("2026-04-03") as a local calendar day. */
function parseDay(value: string): number {
  const [y, m, d] = value.split("-").map((n) => Number.parseInt(n, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return NaN;
  return new Date(y, m - 1, d).getTime();
}

function dayLabel(t: number): string {
  return new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function fullDayLabel(t: number): string {
  return new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Plain-language name for the applied custom range. */
function customLabel(c: DayPair): string {
  const f = c.from ? parseDay(c.from) : NaN;
  const t = c.to ? parseDay(c.to) : NaN;
  const hasF = Number.isFinite(f);
  const hasT = Number.isFinite(t);
  if (!hasF && !hasT) return "All time";
  if (hasF && hasT) {
    const sameYear = new Date(f).getFullYear() === new Date(t).getFullYear();
    return sameYear ? `${dayLabel(f)} – ${dayLabel(t)}` : `${fullDayLabel(f)} – ${fullDayLabel(t)}`;
  }
  return hasF ? `From ${fullDayLabel(f)}` : `Until ${fullDayLabel(t)}`;
}
