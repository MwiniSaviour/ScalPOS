"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/emptystate";
import { SearchBar } from "@/components/ui/input";
import { PackageOpen, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenHeader } from "@/components/shell/screenheader";
import { ProductArt } from "@/components/ui/productart";
import { dateShort, dayGap, timeAgo } from "@/lib/format";
import { fmtMoney } from "@/lib/money";
import { useNow } from "@/lib/now";
import { usePos } from "@/lib/store";
import { cn } from "@/lib/ui";
import type { StockReason } from "@/lib/types";

type Dir = "all" | "in" | "out";

const REASON_LABELS: Record<StockReason, string> = {
  purchase: "Purchase",
  sale: "Sale",
  adjust: "Adjust",
  damage: "Damage",
  return: "Return",
  count: "Count",
  opening: "Opening",
};

const DIRS: { value: Dir; label: string }[] = [
  { value: "all", label: "All" },
  { value: "in", label: "In" },
  { value: "out", label: "Out" },
];

export default function StockScreen() {
  const router = useRouter();
  const moves = usePos((s) => s.stockMoves);
  const products = usePos((s) => s.products);
  const orders = usePos((s) => s.orders);
  const now = useNow(60_000);

  const [query, setQuery] = useState("");
  const [dir, setDir] = useState<Dir>("all");
  const [reason, setReason] = useState<StockReason | "all">("all");

  const all = useMemo(() => [...moves].sort((a, b) => b.t - a.t), [moves]);

  const ordersById = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders]);

  const presentReasons = useMemo(() => {
    const set = new Set<StockReason>();
    for (const m of moves) set.add(m.reason);
    return set;
  }, [moves]);

  const resolve = (productId: string) =>
    products.find((x) => x.id === productId) ?? null;

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((m) => {
      if (dir === "in" && m.qty <= 0) return false;
      if (dir === "out" && m.qty >= 0) return false;
      if (reason !== "all" && m.reason !== reason) return false;
      if (!q) return true;
      const name = products.find((x) => x.id === m.productId)?.name ?? "Deleted product";
      return name.toLowerCase().includes(q);
    });
  }, [all, products, dir, reason, query]);

  return (
    <div className="anim-fade">
      <ScreenHeader title="Stock history" subtitle={`${list.length} movement${list.length === 1 ? "" : "s"}`} onBack />

      <div className="px-5 pt-4 pb-2">
        <SearchBar value={query} onChange={setQuery} placeholder="Search product…" />
      </div>

      <div className="edge-fade no-scrollbar -mx-4 overflow-x-auto px-4 pb-1.5">
        <div className="flex w-max gap-1.5">
          {DIRS.map((d) => (
            <Chip key={d.value} active={dir === d.value} onClick={() => setDir(d.value)}>
              {d.label}
            </Chip>
          ))}
          {Array.from(presentReasons).map((r) => (
            <Chip key={r} active={reason === r} onClick={() => setReason(reason === r ? "all" : r)}>
              {REASON_LABELS[r]}
            </Chip>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <section className="px-5 pt-2.5 pb-28">
          {all.length === 0 ? (
            <EmptyState
              icon={<PackageOpen className="size-7" />}
              title="No stock activity"
              hint="Movements appear when you sell, restock or adjust items."
              action={
                <Button onClick={() => router.push("/inventory/edit")}>Add product</Button>
              }
            />
          ) : (
            <EmptyState
              icon={<Search className="size-7" />}
              title="No movements found"
              hint="Try a different product or filter."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    setDir("all");
                    setReason("all");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          )}
        </section>
      ) : (
        <section className="px-5 pt-2.5 pb-28">
          <Card inset>
            {list.map((m) => {
              const p = resolve(m.productId);
              const isIn = m.qty > 0;
              const isOut = m.qty < 0;
              /* the ref of an order-caused move is the order id — it may be gone */
              const order = m.ref ? ordersById.get(m.ref) : undefined;
              const gap = dayGap(m.t, now);
              /* one time signal per row: relative for the last week, the date beyond it */
              const absolute = gap >= 1 && gap < 7 ? dateShort(m.t) : null;
              return (
                <div key={m.id} className="flex items-start gap-3 px-4 py-3.5 hover:bg-surface2/50">
                  <ProductArt
                    imageUrl={p?.imageUrl}
                    name={p?.name}
                    className="size-10 shrink-0 rounded-xl"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px] font-semibold leading-tight text-ink">{p?.name ?? "Deleted product"}</span>
                    <span className="mt-1 block truncate text-[14px] text-ink3">
                      {`SKU ${p?.sku ?? "—"} · ${REASON_LABELS[m.reason]}${m.ref ? ` · ${shortRef(m.ref)}` : ""}`}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "tabnum inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[12px] font-bold",
                          isIn
                            ? "bg-warn/10 text-warn"
                            : isOut
                              ? "bg-danger/10 text-danger"
                              : "bg-ink2/10 text-ink2",
                        )}
                      >
                        {isIn ? `+${m.qty}` : isOut ? `−${Math.abs(m.qty)}` : "0"}
                      </span>
                      {order && (
                        <span className="tabnum text-[14px] font-bold text-ink">{fmtMoney(order.total)}</span>
                      )}
                    </span>
                    <span className="text-[14px] text-ink3">{timeAgo(m.t, now)}</span>
                    {absolute && <span className="text-[14px] text-ink3">{absolute}</span>}
                  </span>
                </div>
              );
            })}
          </Card>
        </section>
      )}
    </div>
  );
}

/** Order refs are long ("ORD0000201") — show only the tail so the line never clips. */
function shortRef(ref: string): string {
  if (ref.startsWith("ORD")) return `#${ref.slice(-4)}`;
  return ref;
}
