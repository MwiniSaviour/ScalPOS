"use client"

import { useState } from "react"
import { Pill, Scissors, ShieldAlert, Store, RefreshCw, Plus, UtensilsCrossed, type LucideIcon } from "lucide-react"
import { useOrg } from "@/lib/auth/org"
import type { BusinessType } from "@/lib/types"

const SHOP_TYPE_OPTIONS: Array<{
  value: BusinessType
  label: string
  hint: string
  icon: LucideIcon
}> = [
  { value: "retail", label: "Retail", hint: "Sell goods over the counter", icon: Store },
  { value: "pharmacy", label: "Pharmacy", hint: "Medicines in packs and strips", icon: Pill },
  { value: "restaurant", label: "Restaurant", hint: "Food and drinks at tables", icon: UtensilsCrossed },
  { value: "salon", label: "Salon", hint: "Appointments and services", icon: Scissors },
]

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="glass-panel w-full max-w-md p-8">{children}</div>
    </div>
  )
}

export function OrgGate({ children }: { children: React.ReactNode }) {
  const { shop, loading, error, needsShop, createShop, retry } = useOrg()
  const [businessType, setBusinessType] = useState<BusinessType>("retail")

  if (shop) return <>{children}</>

  if (needsShop) {
    return (
      <Shell>
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary">
            <Store size={26} />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Set up your shop</h1>
          <p className="mt-2 text-sm text-muted">
            This account isn&apos;t linked to a shop yet. Pick your shop type, create it,
            and start your 7-day free trial — everything works right here on the desktop,
            and you can connect the ScalPOS app on your phone later with the same account.
          </p>
          <div className="mt-5 grid w-full grid-cols-2 gap-2">
            {SHOP_TYPE_OPTIONS.map((option) => {
              const Icon = option.icon
              const active = businessType === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setBusinessType(option.value)}
                  aria-pressed={active}
                  className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                    active
                      ? "border-primary bg-primary-light"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <Icon size={18} className={active ? "text-primary" : "text-muted"} />
                  <span className="text-sm font-medium text-foreground">{option.label}</span>
                  <span className="text-xs leading-4 text-muted">{option.hint}</span>
                </button>
              )
            })}
          </div>
          <button
            onClick={() => void createShop(businessType)}
            disabled={loading}
            className="btn-primary mt-5 w-full"
          >
            <Plus size={16} />
            {loading ? "Creating shop…" : "Create my shop"}
          </button>
          <button onClick={retry} className="btn-ghost mt-2 w-full text-xs">
            I already have an invite
          </button>
        </div>
      </Shell>
    )
  }

  if (error && !loading) {
    return (
      <Shell>
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-bg text-danger">
            <ShieldAlert size={26} />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Can&apos;t open your shop</h1>
          <p className="mt-2 text-sm text-muted">{error}</p>
          <button onClick={retry} className="btn-primary mt-6 w-full">
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      </Shell>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-border border-t-primary" />
        <p className="text-sm text-muted">Opening your shop…</p>
      </div>
    </div>
  )
}
