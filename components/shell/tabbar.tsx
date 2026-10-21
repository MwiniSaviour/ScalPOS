"use client";

import { usePathname } from "next/navigation";
import { Inbox, LayoutGrid, MoreHorizontal, Receipt, ShoppingCart, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useCartTotals } from "@/lib/store";
import { cn } from "@/lib/ui";

/** bottom tab chrome exists only on the 4 tab destinations */
const TAB_ROUTES = ["/", "/orders", "/inventory", "/more"];

const tabs: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Home", icon: LayoutGrid },
  { href: "/orders", label: "Orders", icon: Receipt },
  { href: "/sell", label: "Sell", icon: ShoppingCart },
  { href: "/inventory", label: "Inventory", icon: Inbox },
  { href: "/more", label: "More", icon: MoreHorizontal },
];

function normalize(p: string): string {
  const stripped = p.replace(/\/+$/, "");
  return stripped === "" ? "/" : stripped;
}

export function TabBar() {
  const pathname = usePathname();
  const cartTotals = useCartTotals();

  // drill-in & flow screens own their chrome — no tab bar
  if (!TAB_ROUTES.includes(normalize(pathname))) return null;

  const cartCount = cartTotals.count;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line2 bg-bg pb-[max(env(safe-area-inset-bottom,0px),8px)]">
      <div className="mx-auto flex h-16 max-w-[420px] items-stretch">
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
              <span className="relative flex size-[21px] items-center justify-center">
                <Icon className="size-[21px]" />
                {t.href === "/sell" && cartCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 min-w-[18px] rounded-full bg-accent px-1 text-[10px] font-bold leading-[18px] text-accentink">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </span>
              <span className={cn("text-[10.5px] font-medium", active && "font-semibold")}>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
