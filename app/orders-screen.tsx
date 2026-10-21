"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/emptystate";
import { SearchBar } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/statuspill";
import { Avatar } from "@/components/ui/avatar";

import { ScreenHeader } from "@/components/shell/screenheader";
import { Receipt } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { timeAgo } from "@/lib/format";
import { fmtMoney } from "@/lib/money";
import { useNow } from "@/lib/now";
import { usePos } from "@/lib/store";

type Filter = "all" | "pending" | "completed" | "refunded" | "unpaid";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "refunded", label: "Refunded" },
  { value: "unpaid", label: "Unpaid" },
];

export default function OrdersScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const orders = usePos((s) => s.orders);
  const customers = usePos((s) => s.customers);
  const now = useNow(60_000);

  const rawFilter = params.get("filter");
  const filter = (FILTERS.some((f) => f.value === rawFilter) ? rawFilter : "all") as Filter;
  const [query, setQuery] = useState("");

  const setFilter = (f: Filter) => {
    const next = new URLSearchParams(Array.from(params.entries()));
    if (f === "all") next.delete("filter");
    else next.set("filter", f);
    const qs = next.toString();
    router.replace(qs ? `/orders?${qs}` : "/orders", { scroll: false });
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders
      .filter((o) => {
        if (filter === "pending" && o.status !== "pending") return false;
        if (filter === "completed" && o.status !== "completed") return false;
        if (filter === "refunded" && o.status !== "refunded") return false;
        if (filter === "unpaid" && o.payStatus !== "unpaid" && o.payStatus !== "partial") return false;
        if (!q) return true;
        const customer = customers.find((c) => c.id === o.customerId);
        const hay = `${o.id} ${customer?.name ?? ""} walk-in`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [orders, customers, filter, query]);

  return (
    <div className="anim-fade">
      <ScreenHeader title="Orders" subtitle={`${list.length} order${list.length === 1 ? "" : "s"}`} />

      <div className="px-4 pt-1 pb-2">
        <SearchBar value={query} onChange={setQuery} placeholder="Order # or customer…" />
      </div>

      <div className="edge-fade no-scrollbar -mx-4 overflow-x-auto px-4 pb-1.5">
        <div className="flex w-max gap-1.5">
          {FILTERS.map((f) => (
            <Chip key={f.value} active={filter === f.value} onClick={() => setFilter(f.value)}>
              {f.label}
            </Chip>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <section className="px-4 pb-28">
          {orders.length === 0 && !query.trim() && filter === "all" ? (
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
              hint={query.trim() ? "No order matches your search." : "Nothing here with this filter."}
              action={
                query.trim() ? (
                  <Button variant="secondary" onClick={() => setQuery("")}>
                    Clear search
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => setFilter("all")}>
                    Show all orders
                  </Button>
                )
              }
            />
          )}
        </section>
      ) : (
        <section className="px-4 pb-28">
          <Card inset>
            {list.map((o) => {
              const c = customers.find((x) => x.id === o.customerId);
              const refunded = o.status === "refunded";
              const pay = refunded
                ? "refunded"
                : o.payStatus === "partial"
                  ? "partial"
                  : o.payStatus === "unpaid"
                    ? "unpaid"
                    : "paid";
              const settled = pay === "paid";
              const qty = o.items.reduce((s, i) => s + i.qty, 0);
              return (
                <Link
                  key={o.id}
                  href={`/orders/detail?id=${o.id}`}
                  className="press flex items-start gap-3 px-4 py-3.5 hover:bg-surface2/50"
                >
                  <Avatar name={c?.name ?? "Walk-in customer"} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold leading-snug break-words text-ink">
                      {c?.name ?? "Walk-in"}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-ink3">
                      {`${timeAgo(o.createdAt, now)} · ${qty} item${qty === 1 ? "" : "s"} · #${o.id.slice(-4)}`}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="tabnum text-[15px] font-bold text-ink">{fmtMoney(o.total)}</span>
                    {settled ? (
                      <span className="text-[11px] font-medium text-ink3">Paid</span>
                    ) : (
                      <StatusPill status={pay} />
                    )}
                  </span>
                </Link>
              );
            })}
          </Card>
        </section>
      )}
    </div>
  );
}
