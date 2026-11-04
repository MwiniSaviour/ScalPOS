"use client"

import { Store, ShieldAlert, RefreshCw, Plus } from "lucide-react"
import { useOrg } from "@/lib/auth/org"

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="glass-panel w-full max-w-md p-8">{children}</div>
    </div>
  )
}

export function OrgGate({ children }: { children: React.ReactNode }) {
  const { shop, loading, error, needsShop, createShop, retry } = useOrg()

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
            This account isn&apos;t linked to a shop yet. Create one now and it will
            be shared with the ScalPOS app on your phone.
          </p>
          <button
            onClick={() => void createShop()}
            disabled={loading}
            className="btn-primary mt-6 w-full"
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
