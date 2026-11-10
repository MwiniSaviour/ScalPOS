"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Store, LogOut, CreditCard, CircleUserRound, MoreHorizontal } from "lucide-react"
import { useUser, useClerk } from "@clerk/clerk-react"
import { useOrg } from "@/lib/auth/org"
import { AccountModal, ROLE_LABEL, ShopSettingsModal } from "@/components/profile/modals"

export function ProfileMenu() {
  const [open, setOpen] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  const [showShop, setShowShop] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={menuRef}>
      <ProfileButton open={open} onToggle={() => setOpen((v) => !v)} />
      {open && (
        <ProfileDropdown
          onClose={() => setOpen(false)}
          onAccount={() => {
            setOpen(false)
            setShowAccount(true)
          }}
          onShop={() => {
            setOpen(false)
            setShowShop(true)
          }}
        />
      )}
      {showAccount && <AccountModal onClose={() => setShowAccount(false)} />}
      {showShop && <ShopSettingsModal onClose={() => setShowShop(false)} />}
    </div>
  )
}

function ProfileButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { user } = useUser()
  const name = user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress || "User"
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 rounded-full pl-1 pr-2 py-1 transition-all ${
        open ? "bg-sidebar-hover" : "hover:bg-sidebar-hover"
      }`}
      aria-label="Open profile menu"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
        {name.charAt(0).toUpperCase()}
      </div>
      <ChevronDown size={14} className="text-muted" />
    </button>
  )
}

function ProfileDropdown({
  onClose,
  onAccount,
  onShop,
}: {
  onClose: () => void
  onAccount: () => void
  onShop: () => void
}) {
  const { user } = useUser()
  const { shop } = useOrg()
  const clerk = useClerk()
  const router = useRouter()
  const email = user?.primaryEmailAddress?.emailAddress ?? ""
  const role = shop?.role ? (ROLE_LABEL[shop.role] ?? "Staff") : "Staff"

  async function signOut() {
    onClose()
    await clerk.signOut()
    router.push("/auth/login")
  }

  function go(path: string) {
    onClose()
    router.push(path)
  }

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
            {(user?.fullName || user?.firstName || email || "U").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {user?.fullName || email || "User"}
            </p>
            <p className="truncate text-xs text-muted">{email}</p>
          </div>
        </div>
        <span className="mt-2 inline-block rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-medium text-primary">
          {role}
        </span>
      </div>
      <div className="p-1.5">
        <MenuRow icon={<CircleUserRound size={16} />} label="My account" onClick={onAccount} />
        <MenuRow icon={<Store size={16} />} label="Shop settings" sub="Details, receipts, MoMo" onClick={onShop} />
        <MenuRow
          icon={<CreditCard size={16} />}
          label="Plans & billing"
          sub="Manage your subscription"
          onClick={() => go("/dashboard/billing")}
        />
        <MenuRow
          icon={<MoreHorizontal size={16} />}
          label="More"
          sub="Referrals, backup, demo mode"
          onClick={() => go("/dashboard/more")}
        />
        <div className="my-1 border-t border-border" />
        <MenuRow icon={<LogOut size={16} />} label="Sign out" tone="danger" onClick={() => void signOut()} />
      </div>
    </div>
  )
}

function MenuRow({
  icon,
  label,
  sub,
  onClick,
  tone,
}: {
  icon: React.ReactNode
  label: string
  sub?: string
  onClick: () => void
  tone?: "danger"
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
        tone === "danger" ? "hover:bg-red-50" : "hover:bg-sidebar-hover"
      }`}
    >
      <span className={tone === "danger" ? "text-red-600" : "text-muted"}>{icon}</span>
      <span className="min-w-0">
        <span className={`block text-sm font-medium ${tone === "danger" ? "text-red-600" : "text-foreground"}`}>
          {label}
        </span>
        {sub && <span className="block text-xs text-muted">{sub}</span>}
      </span>
    </button>
  )
}
