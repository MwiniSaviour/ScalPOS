"use client"

import Link from "next/link"
import { Lock, ShieldAlert, RefreshCw } from "lucide-react"
import { usePathname } from "next/navigation"
import { useUser } from "@clerk/clerk-react"
import { useOrg, readDemoOrg } from "@/lib/auth/org"
import {
  useEntitlement,
  refreshEntitlement,
  entitlementKind,
  isEnterpriseKind,
} from "@/lib/entitlement"

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="glass-panel w-full max-w-md p-8">{children}</div>
    </div>
  )
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-border border-t-primary" />
        <p className="text-sm text-muted">{label}</p>
      </div>
    </div>
  )
}

export function EnterpriseGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useUser()
  const { shop } = useOrg()
  const isDemo = !!shop && readDemoOrg(user?.id) === shop.id
  const ent = useEntitlement(isDemo ? null : (shop?.id ?? null))
  const kind = entitlementKind(ent)
  const allowed =
    (pathname.startsWith("/dashboard/billing") &&
      (isDemo || kind !== "unknown" || !ent.error)) ||
    isDemo ||
    isEnterpriseKind(kind)

  if (allowed) return <>{children}</>

  if (!shop) {
    return (
      <Spinner label="Checking your plan…" />
    )
  }

  if (kind === "unknown") {
    if (ent.loading) return <Spinner label="Checking your plan…" />
    return (
      <Shell>
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-bg text-danger">
            <ShieldAlert size={26} />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Can&apos;t check your plan</h1>
          <p className="mt-2 text-sm text-muted">
            {ent.error ?? "Something went wrong while checking your subscription."}
          </p>
          <button
            onClick={() => shop && void refreshEntitlement(shop.id, true)}
            className="btn-primary mt-6 w-full"
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      </Shell>
    )
  }

  if (kind === "standard") {
    return (
      <Shell>
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary">
            <Lock size={26} />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            Desktop access is an Enterprise feature
          </h1>
          <p className="mt-2 text-sm text-muted">
            Your current plan runs the ScalPOS app on a single Android device. Enterprise adds
            this desktop dashboard, cloud sync, and staff access.
          </p>
          <Link href="/dashboard/billing" className="btn-primary mt-6 w-full">
            See plans
          </Link>
        </div>
      </Shell>
    )
  }

  if (kind === "pending") {
    return (
      <Shell>
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary">
            <RefreshCw size={26} />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            Finish setting up your subscription
          </h1>
          <p className="mt-2 text-sm text-muted">
            We&apos;re waiting for your payment to confirm. It usually completes in a few
            minutes.
          </p>
          <Link href="/dashboard/billing" className="btn-primary mt-6 w-full">
            Go to billing
          </Link>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-bg text-danger">
          <ShieldAlert size={26} />
        </div>
        <h1 className="text-xl font-semibold text-foreground">Your subscription has ended</h1>
        <p className="mt-2 text-sm text-muted">
          Renew your Enterprise plan to keep using the desktop dashboard, cloud sync, and
          staff access.
        </p>
        <Link href="/dashboard/billing" className="btn-primary mt-6 w-full">
          Renew
        </Link>
      </div>
    </Shell>
  )
}
