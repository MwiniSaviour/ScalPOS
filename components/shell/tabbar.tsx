"use client";

import { usePathname } from "next/navigation";
import {
  ArrowDownLeft,
  PiggyBank,
  House,
  Package,
  Plus,
  ReceiptText,
  ScanLine,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/ui";
import { useTerms } from "@/lib/terms";
import { usePos } from "@/lib/store";

const SHOP_TABS: { href: string; icon: LucideIcon }[] = [
  { href: "/home", icon: House },
  { href: "/orders", icon: ReceiptText },
  { href: "/inventory", icon: Package },
  { href: "/customers", icon: Users },
];

const FINANCE_TABS: { href: string; icon: LucideIcon }[] = [
  { href: "/home", icon: House },
  { href: "/budgets", icon: Wallet },
  { href: "/activities", icon: ReceiptText },
  { href: "/savings", icon: PiggyBank },
];

const TAB_ROUTES = [
  "/home",
  "/orders",
  "/inventory",
  "/customers",
  "/activities",
  "/budgets",
  "/savings",
];

function normalize(p: string): string {
  const stripped = p.replace(/\/+$/, "");
  return stripped === "" ? "/" : stripped;
}

export function TabBar() {
  const pathname = usePathname();
  const terms = useTerms();
  const personal = usePos((s) => s.settings.businessType === "personal");
  const tabs = personal ? FINANCE_TABS : SHOP_TABS;
  const labels: Record<string, string> = personal
    ? {
        "/home": "Home",
        "/budgets": "Budget",
        "/activities": "Activities",
        "/savings": "Savings",
      }
    : {
        "/home": "Home",
        "/orders": terms.orders,
        "/inventory": "Inventory",
        "/customers": terms.customers,
      };

  if (!TAB_ROUTES.includes(normalize(pathname))) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40">
      <div className="mx-auto max-w-[420px] px-4 pb-2">
        <div className="flex h-[52px] overflow-hidden rounded-lg bg-accent text-accentink">
          <Link
            href={personal ? "/expense" : "/sell"}
            aria-label={personal ? "Add a new expense" : "Start a new sale"}
            className="press flex flex-1 items-center justify-center gap-2"
          >
            <Plus className="size-[19px]" />
            <span className="whitespace-nowrap text-[16px] font-semibold">
              {personal ? "New expense" : "New sale"}
            </span>
          </Link>
          <Link
            href={personal ? "/funds" : "/sell?scan=1"}
            aria-label={personal ? "Add funds" : "Scan a barcode to add a product"}
            className="press flex w-[64px] items-center justify-center border-l border-accentink/20"
          >
            {personal ? (
              <ArrowDownLeft className="size-[21px]" />
            ) : (
              <ScanLine className="size-[22px]" />
            )}
          </Link>
        </div>
      </div>
      <div className="border-t border-line2 bg-surface shadow-[0_-4px_16px_rgb(15_23_42/0.06)]">
        <div className="mx-auto flex h-14 max-w-[420px] items-stretch">
          {tabs.map((t) => {
            const active = normalize(pathname) === t.href;
            const { icon: Icon } = t;
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "press flex flex-1 flex-col items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
                  active ? "text-accent" : "text-ink3",
                )}
              >
                <Icon className="size-[21px]" />
                <span className={cn("text-[11px] font-medium", active && "font-semibold")}>
                  {labels[t.href]}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
      <div
        className="bg-surface"
        style={{ height: "max(calc(var(--nova-sab) - 28px), 8px)" }}
      />
    </nav>
  );
}

export const willHaveTabBar = (p: string): boolean => TAB_ROUTES.includes(normalize(p));
