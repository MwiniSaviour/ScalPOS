"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/emptystate";
import { SearchBar } from "@/components/ui/input";

import { Receipt } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { timeAgo } from "@/lib/format";
import { fmtMoney } from "@/lib/money";
import { useNow } from "@/lib/now";
import { usePos } from "@/lib/store";
import { cn } from "@/lib/ui";

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
    <div className="anim-fade px-5 pt-4">
      <header>
        <h1 className="text-[26px]/7 font-bold tracking-[-0.02em] break-words text-ink">Orders</h1>
        <p className="mt-0.5 text-[15px] text-ink3">
          {list.length} order{list.length === 1 ? "" : "s"}
        </p>
      </header>

      <div className="mt-4">
        <SearchBar value={query} onChange={setQuery} placeholder="Order # or customer…" />
      </div>

      <div className="edge-fade no-scrollbar -mx-5 mt-2 overflow-x-auto px-5">
        <div className="flex w-max gap-1.5">
          {FILTERS.map((f) => (
            <Chip key={f.value} active={filter === f.value} onClick={() => setFilter(f.value)}>
              {f.label}
            </Chip>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <section className="mt-8 pb-6">
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
  );
}
