"use client";

import { Card } from "@/components/ui/card";
import { Bell, BellDot, CalendarDays, ChevronRight, CircleUserRound, Package } from "lucide-react";
import { dateLong, timeAgo } from "@/lib/format";
import { fmtMoney } from "@/lib/money";
import { paidOf, usePos } from "@/lib/store";
import { useTerms } from "@/lib/terms";
import { useNow } from "@/lib/now";
import { hasOnboarded } from "@/lib/first-run";
import { hasFeature } from "@/lib/features";
import { cn } from "@/lib/ui";
import { useCurrentStaff } from "@/lib/staff";
import { StaffAvatar } from "./account-screen";
import NotificationWatcher from "@/components/shell/notification-watcher";
import { countUnread, listNotifications } from "@/lib/api/notifications";
import { readConnection } from "@/lib/api/bootstrap";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export default function HomeScreen() {
  const orders = usePos((s) => s.orders);
  const products = usePos((s) => s.products);
  const customers = usePos((s) => s.customers);
  const settings = usePos((s) => s.settings);
  const terms = useTerms();
  const now = useNow();
  const dayStart = startOfDay(now);
  const router = useRouter();

  useEffect(() => {
    if (!hasOnboarded()) router.replace("/onboarding");
  }, [router]);

  const kpis = useMemo(() => {
    const today = orders.filter((o) => o.createdAt >= dayStart && o.status !== "refunded");
    const sales = today.reduce((s, o) => s + o.total, 0);
    const collected = today.reduce((s, o) => s + paidOf(o), 0);
    const pending = orders.filter((o) => o.status === "pending").length;
    const out = products.filter((p) => p.stock <= 0).length;
    const low = products.filter((p) => p.stock > 0 && p.stock <= p.lowStockAt).length;
    return { sales, collected, unpaid: Math.max(sales - collected, 0), txn: today.length, pending, lowStock: low + out };
  }, [orders, products, dayStart]);

  const me = useCurrentStaff();
  const attention = kpis.pending > 0 || kpis.lowStock > 0;
  const recent = orders.slice(0, 3);
  const kpiCards = [
    {
      label: "Today's sales",
      value: fmtMoney(kpis.sales),
      hint: `${kpis.txn} sale${kpis.txn === 1 ? "" : "s"}`,
      href: "/reports",
      tone: "text-ink",
    },
    {
      label: "Collected",
      value: fmtMoney(kpis.collected),
      hint: "paid today",
      href: "/reports",
      tone: "text-ink",
    },
    {
      label: "Unpaid",
      value: fmtMoney(kpis.unpaid),
      hint: "still due",
      href: "/orders?filter=pending",
      tone: kpis.unpaid > 0 ? "text-warn" : "text-ink",
    },
    {
      label: "Low stock",
      value: String(kpis.lowStock),
      hint: "items to restock",
      href: "/inventory?filter=low",
      tone: kpis.lowStock > 0 ? "text-warn" : "text-ink",
    },
  ];

  const [notifs, setNotifs] = useState<{ count: number } | null>(null);
  const refreshNotifs = useCallback(() => {
    const conn = readConnection();
    if (!conn) return;
    listNotifications(conn, 40)
      .then((rows) => setNotifs({ count: countUnread(rows) }))
      .catch(() => {
        /* bell badge is best effort */
      });
  }, []);
  useEffect(() => {
    refreshNotifs();
  }, [refreshNotifs]);
  useEffect(() => {
    const t = setInterval(refreshNotifs, 60_000);
    return () => clearInterval(t);
  }, [refreshNotifs]);
  const unread = notifs ? notifs.count : 0;

  return (
    <div className="anim-fade overflow-x-hidden px-5 pt-4">
      <NotificationWatcher />
      <div className="safe-t" />
      {/* header — shop name, date, owner avatar */}
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-[22px]/7 font-bold tracking-[-0.02em] text-ink sm:text-[26px]/8">
            {settings.shopName}
          </h1>
          <p className="mt-0.5 text-[15px] text-ink3">{now > 0 ? dateLong(now) : ""}</p>
        </div>
        <span className="mt-0.5 flex shrink-0 items-center gap-1.5">
          <Link
            href="/notifications"
            data-testid="notif-bell"
            aria-label="Notifications"
            className="press relative flex size-10 items-center justify-center rounded-full border border-line2 bg-surface text-ink2"
          >
            {unread > 0 ? <BellDot className="size-[21px]" /> : <Bell className="size-[21px]" />}
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
          <Link href="/more" aria-label="My account" className="press">
            {me ? (
              <StaffAvatar staff={me} size={40} />
            ) : (
              <span className="flex size-10 items-center justify-center rounded-full border border-line2 bg-surface text-ink2">
                <CircleUserRound className="size-[23px]" />
              </span>
            )}
          </Link>
        </span>
      </header>

      {/* salon quick actions */}
      {hasFeature(settings.businessType, "appointments") && (
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Link
            href="/appointments"
            className="press flex items-center gap-3 rounded-2xl border border-line2 bg-surface2 px-3.5 py-3"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-accent/12 text-accent">
              <CalendarDays className="size-[20px]" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold leading-tight text-ink">
                Appointments
              </span>
              <span className="block text-[13px] text-ink3">Bookings today</span>
            </span>
          </Link>
          <Link
            href="/packages"
            className="press flex items-center gap-3 rounded-2xl border border-line2 bg-surface2 px-3.5 py-3"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-violet/12 text-violet">
              <Package className="size-[20px]" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold leading-tight text-ink">
                Packages
              </span>
              <span className="block text-[13px] text-ink3">Credits &amp; bundles</span>
            </span>
          </Link>
        </div>
      )}

      {/* KPI grid */}
      <section className="mt-5" aria-label="Key figures">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {kpiCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="press min-w-0 rounded-2xl border border-line2 bg-surface px-3.5 py-3"
            >
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-ink3">
                {card.label}
              </p>
              <p
                className={cn(
                  "tabnum mt-2 break-words text-[clamp(19px,5.2vw,27px)] font-bold leading-[1.08] tracking-[-0.02em]",
                  card.value.length > 12 && "text-[19px] leading-[1.15]",
                  card.tone,
                )}
              >
                {card.value}
              </p>
              <p className="mt-1.5 truncate text-[12px] text-ink3">{card.hint}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* needs attention */}
      {attention && (
        <section className="mt-6">
          <h2 className="text-[15px] font-medium text-ink2">Needs attention</h2>
          <Card inset className="mt-2.5">
            {kpis.pending > 0 && (
              <Link
                href="/orders?filter=pending"
                className="press flex items-center gap-3 px-4 py-3.5 hover:bg-surface2/50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-semibold text-ink">Pending {terms.orders.toLowerCase()}</span>
                  <span className="block text-[14px] text-ink3">Waiting to be fulfilled</span>
                </span>
                <span className="tabnum text-[17px] font-bold text-ink">{kpis.pending}</span>
                <ChevronRight className="size-4 shrink-0 text-ink3" />
              </Link>
            )}
            {kpis.lowStock > 0 && (
              <Link
                href="/inventory?filter=low"
                className="press flex items-center gap-3 px-4 py-3.5 hover:bg-surface2/50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-semibold text-ink">Low stock</span>
                  <span className="block text-[14px] text-ink3">Items running low</span>
                </span>
                <span className="tabnum text-[17px] font-bold text-ink">{kpis.lowStock}</span>
                <ChevronRight className="size-4 shrink-0 text-ink3" />
              </Link>
            )}
          </Card>
        </section>
      )}

      {/* recent orders */}
      <section className="mt-6 pb-6">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-medium text-ink2">Recent {terms.orders.toLowerCase()}</h2>
          <Link href="/orders" className="press whitespace-nowrap text-[15px] font-medium text-accent">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <Card className="mt-2.5 px-4 py-6 text-center">
            <p className="text-[14px] text-ink3">
              No orders yet — tap <span className="font-semibold text-ink">New sale</span> to start.
            </p>
          </Card>
        ) : (
          <Card inset className="mt-2.5">
            {recent.map((o) => {
              const c = customers.find((x) => x.id === o.customerId);
              const first = o.items[0];
              const qty = o.items.reduce((s, i) => s + i.qty, 0);
              const summary =
                o.items.length === 1 ? `${first?.name ?? "Item"} × ${first?.qty ?? 1}` : `${qty} item${qty === 1 ? "" : "s"}`;
              const unpaid = o.payStatus === "unpaid" || o.payStatus === "partial";
              return (
                <Link
                  key={o.id}
                  href={`/orders/detail?id=${o.id}`}
                  className="press flex items-center gap-3 px-4 py-3.5 hover:bg-surface2/50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px] font-semibold leading-tight text-ink">
                      {c?.name ?? "Walk-in"}
                    </span>
                    <span className="mt-1 block truncate text-[14px] text-ink3">
                      {`${timeAgo(o.createdAt, now)} · ${summary}`}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="tabnum text-[17px] font-bold text-ink">{fmtMoney(o.total)}</span>
                    {unpaid ? (
                      <span className="flex items-center gap-1.5 text-[14px] font-medium text-warn">
                        <span className="size-1.5 rounded-full bg-warn" /> Unpaid
                      </span>
                    ) : (
                      <span className="text-[14px] text-ink3">Paid</span>
                    )}
                  </span>
                </Link>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}
