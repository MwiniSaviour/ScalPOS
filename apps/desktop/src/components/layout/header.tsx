"use client"

import { usePathname } from "next/navigation"
import { ChevronRight, LayoutGrid } from "lucide-react"
import { useUser } from "@clerk/clerk-react"
import { NAV_ITEMS } from "@/lib/constants"
import type { NavItem } from "@/lib/types"
import { useOrg } from "@/lib/auth/org"
import { ProfileMenu } from "@/components/layout/profile-menu"

function findBreadcrumb(
  items: NavItem[],
  pathname: string
): { label: string; parent?: string }[] {
  for (const item of items) {
    if (item.children) {
      const child = item.children.find(
        (c) => pathname === c.href || pathname.startsWith(c.href + "/")
      )
      if (child) {
        return [{ label: item.label }, { label: child.label }]
      }
    }
    if (pathname === item.href || pathname.startsWith(item.href + "/")) {
      return [{ label: item.label }]
    }
  }
  return [{ label: "Dashboard" }]
}

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  supervisor: "Supervisor",
  cashier: "Cashier",
}

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname()
  const { user } = useUser()
  const { shop } = useOrg()
  const breadcrumbs = findBreadcrumb(NAV_ITEMS, pathname)
  const name = user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress || "User"

  function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-8">
      <div className="flex items-center gap-2">
        <button
          onClick={onMenuClick}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-sidebar-hover transition-all lg:hidden"
        >
          <LayoutGrid size={18} />
        </button>
        <nav className="flex items-center gap-1.5 text-sm">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={14} className="text-muted" />}
              <span
                className={
                  i === breadcrumbs.length - 1
                    ? "font-semibold text-foreground"
                    : "text-muted"
                }
              >
                {crumb.label}
              </span>
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-foreground">
            {getGreeting()}, {name.split(" ")[0]}
          </p>
          <p className="text-xs text-muted">
            {shop ? `${shop.name} · ${ROLE_LABEL[shop.role] ?? "Staff"}` : "No shop"}
          </p>
        </div>
        <ProfileMenu />
      </div>
    </header>
  )
}
