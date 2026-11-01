"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import * as Icons from "lucide-react"
import { cn } from "@/lib/utils"
import { NAV_ITEMS, APP_NAME } from "@/lib/constants"
import { useAuth } from "@/hooks/use-auth"
import type { LucideIcon } from "lucide-react"
import type { Profile, NavItem } from "@/lib/types"
import { ChevronDown } from "lucide-react"

function NavItemComponent({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = Icons[item.icon as keyof typeof Icons] as LucideIcon
  const hasChildren = item.children && item.children.length > 0
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
  const [expanded, setExpanded] = useState(isActive)

  if (hasChildren) {
    return (
      <li>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "sidebar-link w-full justify-between",
            isActive && "sidebar-link-active"
          )}
        >
          <span className="flex items-center gap-3">
            <Icon size={20} />
            <span>{item.label}</span>
          </span>
          <ChevronDown
            size={16}
            className={cn(
              "transition-transform",
              expanded && "rotate-180"
            )}
          />
        </button>
        {expanded && (
          <ul className="ml-4 mt-1 space-y-1 border-l border-border pl-4">
            {item.children!.map((child) => {
              const ChildIcon = Icons[child.icon as keyof typeof Icons] as LucideIcon
              const childActive = pathname === child.href
              return (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-all",
                      childActive
                        ? "bg-sidebar-active text-sidebar-text-active"
                        : "text-sidebar-text hover:bg-sidebar-hover hover:text-foreground"
                    )}
                  >
                    <ChildIcon size={16} />
                    <span>{child.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </li>
    )
  }

  return (
    <li>
      <Link
        href={item.href}
        className={cn("sidebar-link", isActive && "sidebar-link-active")}
      >
        <Icon size={20} />
        <span>{item.label}</span>
      </Link>
    </li>
  )
}

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname()
  const { logout } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)

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

  useEffect(() => {
    onClose?.()
  }, [pathname])

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-sidebar transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
            S
          </div>
          <span className="text-lg font-bold text-foreground">{APP_NAME}</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {NAV_ITEMS.filter((item) => {
              if (!item.roles) return true
              return item.roles.includes(profile?.role || "employee")
            }).map((item) => (
              <NavItemComponent key={item.label} item={item} pathname={pathname} />
            ))}
          </ul>
        </nav>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-sm font-medium text-primary">
              {profile?.name?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div className="flex-1 truncate">
              <p className="text-sm font-medium text-foreground">
                {profile?.name || "User"}
              </p>
              <p className="text-xs text-muted">{profile?.email || ""}</p>
            </div>
            <button
              onClick={logout}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-sidebar-hover hover:text-danger transition-all"
              title="Sign out"
            >
              <Icons.LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
