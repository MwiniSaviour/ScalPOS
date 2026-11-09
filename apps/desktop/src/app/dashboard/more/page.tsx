"use client"

import { useState } from "react"
import Link from "next/link"
import {
  CircleUserRound,
  Store,
  CreditCard,
  Gift,
  UsersRound,
  DatabaseBackup,
  Sparkles,
  ScrollText,
  ChevronRight,
} from "lucide-react"
import {
  AccountModal,
  BackupModal,
  DemoModal,
  ReferralModal,
  ShopSettingsModal,
} from "@/components/profile/modals"

function Row({
  icon,
  label,
  sub,
  onClick,
  href,
}: {
  icon: React.ReactNode
  label: string
  sub: string
  onClick?: () => void
  href?: string
}) {
  const inner = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        <span className="block truncate text-xs text-muted">{sub}</span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-muted" />
    </>
  )
  const cls =
    "flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-sidebar-hover/60"
  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    )
  }
  return (
    <button onClick={onClick} className={cls}>
      {inner}
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{title}</h2>
      <div className="overflow-hidden rounded-xl border border-border bg-card">{children}</div>
    </section>
  )
}

export default function MorePage() {
  const [showAccount, setShowAccount] = useState(false)
  const [showShop, setShowShop] = useState(false)
  const [showReferral, setShowReferral] = useState(false)
  const [showBackup, setShowBackup] = useState(false)
  const [showDemo, setShowDemo] = useState(false)

  return (
    <>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">More</h1>
          <p className="mt-1 text-sm text-muted">
            Account, billing and tools that keep your shop running.
          </p>
        </div>

        <Section title="Account">
          <Row
            icon={<CircleUserRound size={18} />}
            label="My account"
            sub="Profile, email and role"
            onClick={() => setShowAccount(true)}
          />
          <Row
            icon={<Store size={18} />}
            label="Shop settings"
            sub="Details, receipts, MoMo"
            onClick={() => setShowShop(true)}
          />
        </Section>

        <Section title="Business">
          <Row
            icon={<CreditCard size={18} />}
            label="Plans & billing"
            sub="Manage your subscription"
            href="/dashboard/billing"
          />
          <Row
            icon={<Gift size={18} />}
            label="Referral program"
            sub="Earn from shops you refer"
            onClick={() => setShowReferral(true)}
          />
          <Row
            icon={<UsersRound size={18} />}
            label="Staff & roles"
            sub="Members and permissions"
            href="/dashboard/employees"
          />
        </Section>

        <Section title="Data">
          <Row
            icon={<DatabaseBackup size={18} />}
            label="Backup & recovery"
            sub="Download a copy of your data"
            onClick={() => setShowBackup(true)}
          />
          <Row
            icon={<Sparkles size={18} />}
            label="Demo data"
            sub="Try sample products & sales"
            onClick={() => setShowDemo(true)}
          />
        </Section>

        <Section title="Help">
          <Row
            icon={<ScrollText size={18} />}
            label="Legal"
            sub="Terms, privacy & refund policy"
            href="https://pos.scalmint.com/legal"
          />
        </Section>
      </div>

      {showAccount && <AccountModal onClose={() => setShowAccount(false)} />}
      {showShop && <ShopSettingsModal onClose={() => setShowShop(false)} />}
      {showReferral && <ReferralModal onClose={() => setShowReferral(false)} />}
      {showBackup && <BackupModal onClose={() => setShowBackup(false)} />}
      {showDemo && <DemoModal onClose={() => setShowDemo(false)} />}
    </>
  )
}
