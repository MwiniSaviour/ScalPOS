"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import * as Icons from "lucide-react"
import { cn } from "@/lib/utils"
import { NAV_ITEMS, APP_NAME } from "@/lib/constants"
import { useClerk, useUser } from "@clerk/clerk-react"
import type { LucideIcon } from "lucide-react"
import type { BusinessType, NavItem } from "@/lib/types"
import { ChevronDown } from "lucide-react"
import { useOrg, readDemoOrg } from "@/lib/auth/org"
import { useEntitlement, entitlementKind, isEnterpriseKind } from "@/lib/entitlement"
import { hasFeature } from "@/lib/features"
import { termsOf, useBusinessType, type Terms } from "@/lib/terms"

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  supervisor: "Supervisor",
  cashier: "Cashier",
}

const TRANSLATED_NAV_LABELS: Record<string, keyof Terms> = {
  Customers: "customers",
  Products: "products",
  Orders: "orders",
}

function navLabel(label: string, terms: Terms): string {
  const key = TRANSLATED_NAV_LABELS[label]
  return key ? terms[key] : label
}

function withBusinessNav(items: NavItem[], businessType: BusinessType): NavItem[] {
  if (!hasFeature(businessType, "suppliers-po")) return items
  const suppliersIndex = items.findIndex((item) => item.href === "/dashboard/suppliers")
  const purchaseOrders: NavItem = {
    label: "Purchase orders",
    href: "/dashboard/suppliers",
    icon: "ClipboardList",
    soon: true,
  }
  if (suppliersIndex === -1) return [...items, purchaseOrders]
  return [
    ...items.slice(0, suppliersIndex + 1),
    purchaseOrders,
    ...items.slice(suppliersIndex + 1),
  ]
}

function NavItemComponent({
  item,
  pathname,
  terms,
}: {
  item: NavItem
  pathname: string
  terms: Terms
}) {
  const Icon = Icons[item.icon as keyof typeof Icons] as LucideIcon
  const hasChildren = item.children && item.children.length > 0
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
  const [expanded, setExpanded] = useState(isActive)

  if (item.soon) {
    return (
      <li>
        <span className="sidebar-link pointer-events-none cursor-default opacity-60" aria-disabled="true">
          <Icon size={20} />
          <span>{navLabel(item.label, terms)}</span>
          <span className="ml-auto rounded-full bg-sidebar-hover px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
            Soon
          </span>
        </span>
      </li>
    )
  }

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
            <span>{navLabel(item.label, terms)}</span>
          </span>
          <ChevronDown
            size={16}
            className={cn("transition-transform", expanded && "rotate-180")}
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
                    <span>{navLabel(child.label, terms)}</span>
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
        <span>{navLabel(item.label, terms)}</span>
      </Link>
    </li>
  )
}

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useClerk()
  const { user } = useUser()
  const { shop } = useOrg()
  const isDemo = !!shop && readDemoOrg(user?.id) === shop.id
  const ent = useEntitlement(isDemo ? null : (shop?.id ?? null))
  const allowEmployees = isDemo || isEnterpriseKind(entitlementKind(ent))
  const businessType = useBusinessType()
  const terms = termsOf(businessType)
  const navItems = withBusinessNav(NAV_ITEMS, businessType)

  useEffect(() => {
    onClose?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const name =
    user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress || "User"
  const role = shop?.role ?? "cashier"

  async function handleSignOut() {
    await signOut()
    router.replace("/auth/login")
  }

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
          <Image src="/brandmark.png" alt="ScalPOS logo" width={32} height={32} unoptimized className="h-8 w-8 rounded-lg" />
          <span className="text-lg font-bold text-foreground">{APP_NAME}</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {navItems.filter((item) => {
              if (item.href === "/dashboard/employees" && !allowEmployees) return false
              if (!item.roles) return true
              const mapped = role === "owner" ? "admin" : "employee"
              return item.roles.includes(mapped)
            }).map((item) => (
              <NavItemComponent
                key={`${item.href}-${item.label}`}
                item={item}
                pathname={pathname}
                terms={terms}
              />
            ))}
          </ul>
        </nav>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-sm font-medium text-primary">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 truncate">
              <p className="text-sm font-medium text-foreground">{name}</p>
              <p className="text-xs text-muted">
                {ROLE_LABEL[role] ?? "Staff"}
                {shop ? ` · ${shop.name}` : ""}
              </p>
            </div>
            <button
              onClick={() => void handleSignOut()}
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
