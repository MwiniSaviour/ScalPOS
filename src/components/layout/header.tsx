"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { ChevronRight, LayoutGrid } from "lucide-react"
import { NAV_ITEMS, APP_NAME } from "@/lib/constants"
import type { Profile } from "@/lib/types"
import type { NavItem } from "@/lib/types"

function findBreadcrumb(
  items: NavItem[],
  pathname: string,
  parentLabel?: string
): { label: string; parent?: string }[] {
  for (const item of items) {
    if (item.children) {
      const child = item.children.find(
        (c) => pathname === c.href || pathname.startsWith(c.href + "/")
      )
      if (child) {
        return [
          { label: item.label },
          { label: child.label },
        ]
      }
    }
    if (pathname === item.href || pathname.startsWith(item.href + "/")) {
      return [{ label: item.label }]
    }
  }
  return [{ label: "Dashboard" }]
}

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname()
  const [profile, setProfile] = useState<Profile | null>(null)

  const breadcrumbs = findBreadcrumb(NAV_ITEMS, pathname)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/auth/api/me")
        if (!res.ok) return
        const { user } = await res.json()
        if (user) {
          setProfile({ id: user.id, name: user.name, email: user.email, role: user.role } as Profile)
        }
      } catch {}
    }
    load()
  }, [])

  function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-8">
      {/* Left: Breadcrumb */}
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

      {/* Right: User info */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-foreground">
            {getGreeting()}, {profile?.name?.split(" ")[0] || "User"}
          </p>
          <p className="text-xs text-muted">{profile?.role === "admin" ? "Administrator" : "Staff Member"}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
          {profile?.name?.charAt(0)?.toUpperCase() || "U"}
        </div>
      </div>
    </header>
  )
}
