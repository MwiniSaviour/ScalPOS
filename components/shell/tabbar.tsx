"use client";

import { usePathname } from "next/navigation";
import { House, Package, Plus, ReceiptText, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/ui";
/** bottom tab chrome exists only on the tab destinations */
const TAB_ROUTES = ["/home", "/orders", "/inventory", "/customers", "/more"];

const tabs: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/home", label: "Home", icon: House },
  { href: "/orders", label: "Orders", icon: ReceiptText },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/customers", label: "Customers", icon: Users },
];

function normalize(p: string): string {
  const stripped = p.replace(/\/+$/, "");
  return stripped === "" ? "/" : stripped;
}

export function TabBar() {
  const pathname = usePathname();

  // drill-in & flow screens own their chrome — no tab bar
  if (!TAB_ROUTES.includes(normalize(pathname))) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40">
      <div className="mx-auto max-w-[420px] px-4 pb-2">
        <Link
          href="/sell"
          aria-label="Start a new sale"
          className="press flex h-[52px] items-center justify-center gap-2 rounded-lg bg-accent text-accentink"
        >
          <Plus className="size-[19px]" />
          <span className="text-[16px] font-semibold">New sale</span>
        </Link>
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
                <span className={cn("text-[11px] font-medium", active && "font-semibold")}>{t.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
      {/* gesture/button strip: painted so page content never shows through,
          kept just tall enough beneath the labels — no stray dark band */}
      <div
        className="bg-surface"
        style={{ height: "max(calc(var(--nova-sab) - 28px), 8px)" }}
      />
    </nav>
  );
}

export const willHaveTabBar = (p: string): boolean => TAB_ROUTES.includes(normalize(p));
