"use client";

import { ScreenHeader } from "@/components/shell/screenheader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/emptystate";
import { hasFeature } from "@/lib/features";
import { useNow } from "@/lib/now";
import { isUnavailableToday, orderTypeLabel, ticketNumber } from "@/lib/restaurant";
import { usePos, useSettings } from "@/lib/store";
import { useTerms } from "@/lib/terms";
import type { Order, OrderItem, Product, TicketStatus } from "@/lib/types";
import { cn } from "@/lib/ui";
import { ChefHat } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

/** The board polls the store — a ticket board that lags is a kitchen that
 *  serves cold food. Five seconds is the low-risk default. */
const REFRESH_MS = 5000;

type Group = {
  status: TicketStatus;
  label: string;
  /** what a tap does from this stage */
  action: string;
  dot: string;
};

const GROUPS: Group[] = [
  { status: "queued", label: "Queued", action: "Start cooking", dot: "bg-ink3" },
  { status: "preparing", label: "Preparing", action: "Mark ready", dot: "bg-warn" },
  { status: "ready", label: "Ready", action: "Serve", dot: "bg-accent" },
];

const NEXT: Record<string, TicketStatus | undefined> = {
  queued: "preparing",
  preparing: "ready",
  ready: "served",
};

export default function KitchenScreen() {
  const router = useRouter();
  const settings = useSettings();
  const terms = useTerms();
  const tables = usePos((s) => s.tables);
  const products = usePos((s) => s.products);
  const now = useNow(30_000);

  /** the board's own copy of the order list — refreshed on a timer */
  const [orders, setOrders] = useState<Order[]>([]);

  const read = useCallback(() => {
    setOrders(usePos.getState().orders);
  }, []);

  useEffect(() => {
    /* the first read lands after the mount paint, so the board never renders a
       frame of the store's contents the server could not have sent */
    const kick = window.setTimeout(read, 0);
    const timer = window.setInterval(read, REFRESH_MS);
    return () => {
      window.clearTimeout(kick);
      window.clearInterval(timer);
    };
  }, [read]);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const tableById = useMemo(() => new Map(tables.map((t) => [t.id, t])), [tables]);
  const tablesOn = settings.restaurantConfig?.tables !== false;

  const groups = useMemo(() => {
    const live = orders.filter(isKitchenTicket);
    return GROUPS.map((g) => ({
      ...g,
      tickets: live
        .filter((o) => o.ticketStatus === g.status)
        .sort((a, b) => a.createdAt - b.createdAt),
    })).filter((g) => g.tickets.length > 0);
  }, [orders]);

  const total = groups.reduce((n, g) => n + g.tickets.length, 0);

  function advance(order: Order) {
    const next = NEXT[order.ticketStatus ?? ""];
    if (!next) return;
    usePos.getState().setTicketStatus(order.id, next);
    if (next === "served") {
      usePos.getState().toast(`${terms.order} #${ticketNumber(order.id)} served`, "ok");
    }
    read();
  }

  if (!hasFeature(settings.businessType, "kitchen")) {
    return (
      <div className="anim-fade">
        <ScreenHeader title="Kitchen" onBack />
        <EmptyState
          icon={<ChefHat className="size-7" />}
          title="No kitchen here"
          hint="The kitchen board belongs to restaurant shops. Switch this shop to a restaurant to use it."
          action={
            <Button variant="secondary" onClick={() => router.push("/more")}>
              Back to More
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="anim-fade">
      <ScreenHeader
        title="Kitchen"
        subtitle={total > 0 ? `${total} ${terms.orders.toLowerCase()} waiting` : "Nothing waiting"}
        onBack
      />

      {total === 0 ? (
        <section className="px-4 pt-2 pb-12">
          <EmptyState
            icon={<ChefHat className="size-7" />}
            title="Nothing in the kitchen"
            hint={`A ${terms.order.toLowerCase()} lands here the moment a sale is rung through.`}
            action={
              <Button variant="secondary" onClick={() => router.push("/sell")}>
                Open the till
              </Button>
            }
          />
        </section>
      ) : (
        <div className="px-4 pt-3 pb-12">
          {groups.map((g) => (
            <section key={g.status} className="mb-5 last:mb-0">
              <div className="flex items-center gap-2">
                <span className={cn("size-2 rounded-full", g.dot)} />
                <h2 className="text-[12px] font-semibold uppercase tracking-[.06em] text-ink3">
                  {g.label}
                </h2>
                <span className="tabnum text-[12px] text-ink3">{g.tickets.length}</span>
              </div>
              <div className="mt-2 space-y-2.5">
                {g.tickets.map((o) => (
                  <TicketCard
                    key={o.id}
                    order={o}
                    items={visibleItems(o, productById, now)}
                    table={tablesOn && o.tableId ? tableById.get(o.tableId)?.name : undefined}
                    now={now}
                    action={g.action}
                    onAdvance={() => advance(o)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * A ticket stays in the kitchen until it is served. Payment does not close a
 * ticket — a takeaway order is paid at the counter and still has to be cooked,
 * so it stays on the board until the kitchen serves it.
 */
function isKitchenTicket(o: Order): boolean {
  if (o.status === "refunded") return false;
  const s = o.ticketStatus;
  return s === "queued" || s === "preparing" || s === "ready";
}

/** An item the kitchen marked off for today is off the board. */
function visibleItems(
  order: Order,
  products: Map<string, Product>,
  now: number,
): OrderItem[] {
  if (!(now > 0)) return order.items;
  return order.items.filter((i) => {
    const p = products.get(i.productId);
    return !p || !isUnavailableToday(p, now);
  });
}

/** "Large, No onions" — the variant first, then the modifiers. */
function itemDetail(i: OrderItem): string {
  return [i.variantName, ...(i.modifierNames ?? [])].filter(Boolean).join(", ");
}

/** "Dine-in · Table 3" — the service type and the table the order sits on. */
function orderMeta(order: Order, table?: string): string {
  const type = orderTypeLabel(order.orderType);
  if (table) return type ? `${type} · ${table}` : table;
  return type;
}

/** How long a ticket has been waiting — "now", "12m", "1h 05m". */
function elapsed(t: number, now: number): { text: string; tone: string } {
  if (!(now > 0)) return { text: "", tone: "text-ink3" };
  const mins = Math.max(0, Math.floor((now - t) / 60_000));
  const text =
    mins < 1
      ? "now"
      : mins < 60
        ? `${mins}m`
        : `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
  const tone = mins >= 30 ? "text-danger" : mins >= 15 ? "text-warn" : "text-ink3";
  return { text, tone };
}

function TicketCard({
  order,
  items,
  table,
  now,
  action,
  onAdvance,
}: {
  order: Order;
  items: OrderItem[];
  table?: string;
  now: number;
  action: string;
  onAdvance: () => void;
}) {
  const waited = elapsed(order.createdAt, now);
  const meta = orderMeta(order, table);
  return (
    <Card>
      <button
        onClick={onAdvance}
        className="press w-full px-4 py-3.5 text-left hover:bg-surface2/50"
      >
        <span className="flex items-start gap-3">
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span className="tabnum text-[17px] font-bold text-ink">#{ticketNumber(order.id)}</span>
              {meta && <span className="min-w-0 truncate text-[14px] text-ink3">{meta}</span>}
            </span>
          </span>
          {waited.text && (
            <span className={cn("tabnum shrink-0 text-[14px] font-semibold", waited.tone)}>
              {waited.text}
            </span>
          )}
        </span>

        <span className="mt-2 block">
          {items.length === 0 ? (
            <span className="block text-[14px] text-ink3">
              Every item on this ticket is off today&apos;s menu.
            </span>
          ) : (
            items.map((i, idx) => {
              const detail = itemDetail(i);
              return (
                <span
                  key={`${idx}-${i.productId}-${i.variantId ?? ""}`}
                  className="block text-[15px] leading-6 text-ink"
                >
                  <span className="tabnum font-semibold">{i.qty} × </span>
                  {i.name}
                  {detail && <span className="text-ink3"> — {detail}</span>}
                </span>
              );
            })
          )}
        </span>

        {order.note && (
          <span className="mt-1.5 block text-[13px] leading-5 text-ink3">Note: {order.note}</span>
        )}

        <span className="mt-2.5 flex items-center justify-between gap-2">
          {items.length > 0 ? (
            <span className="text-[13px] text-ink3">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          ) : (
            <span />
          )}
          <span className="inline-flex h-7 shrink-0 items-center rounded-full bg-accent/10 px-2.5 text-[12px] font-semibold text-accent">
            {action}
          </span>
        </span>
      </button>
    </Card>
  );
}
