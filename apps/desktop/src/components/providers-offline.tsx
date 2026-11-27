"use client"

import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from "react"
import { ClerkProvider, useAuth } from "@clerk/clerk-react"
import { usePathname, useRouter } from "next/navigation"
import { registerTokenProvider } from "@pos/api/session"
import { readConnection, writeConnection } from "@pos/api/bootstrap"
import { bootstrapOrg } from "@/lib/supabase/client"
import { LocalOrgProvider, CONNECTION_CHANGE_EVENT } from "@/lib/auth/org"
import { desktopCanBootLocally } from "@/lib/auth/offline-gate"
import { SyncBridge } from "@/components/sync-bridge"
import PinGate from "@/components/pin-gate"
import LocalSetupScreen from "@/components/local-setup-screen"
import { migrateLegacyDesktop } from "@/lib/offline/migrate-legacy"

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ""

function TokenBridge() {
  const { isLoaded, isSignedIn, getToken, userId } = useAuth()
  useEffect(() => {
    if (!isSignedIn) {
      registerTokenProvider(null)
      writeConnection(null)
      window.dispatchEvent(new Event(CONNECTION_CHANGE_EVENT))
      return
    }
    const provider = async () => {
      try {
        return (await getToken({ template: "supabase" })) ?? null
      } catch {
        return null
      }
    }
    registerTokenProvider(provider)
    if (!isLoaded || !userId) return
    void (async () => {
      const token = await provider()
      if (!token) return
      const res = await bootstrapOrg(false, token)
      if (res.status !== "ok") return
      const existing = readConnection()
      if (existing?.org_id === res.orgId) return
      writeConnection({
        org_id: res.orgId,
        user_id: userId,
        access_token: token,
        org_name: existing?.org_name,
      })
      window.dispatchEvent(new Event(CONNECTION_CHANGE_EVENT))
    })().catch(() => {})
  }, [isLoaded, isSignedIn, getToken, userId])
  return <SyncBridge signedIn={Boolean(isSignedIn)} />
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [localShop, setLocalShop] = useState(
    () => desktopCanBootLocally() || readConnection() !== null,
  )
  const onPublicPage =
    pathname === "/" ||
    pathname === "/legal" ||
    pathname === "/data-deletion"

  if (onPublicPage) return <>{children}</>
  if (!localShop) {
    return (
      <LocalSetupScreen
        onReady={() => setLocalShop(true)}
        onSignIn={() => router.push("/auth/login")}
      />
    )
  }
  return (
    <LocalOrgProvider>
      <PinGate>{children}</PinGate>
    </LocalOrgProvider>
  )
}

function BootScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-border border-t-primary" />
        <p className="text-sm text-muted">Loading ScalPOS…</p>
      </div>
    </div>
  )
}

function MigrationGate({ children }: { children: ReactNode }) {
  const [migrated, setMigrated] = useState(false)
  useEffect(() => {
    let cancelled = false
    void migrateLegacyDesktop().finally(() => {
      if (!cancelled) setMigrated(true)
    })
    return () => { cancelled = true }
  }, [])
  if (!migrated) return <BootScreen />
  return <>{children}</>
}

class ScreenErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error): { error: Error | null } {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[scalpos] render error:", error, info)
  }

  render() {
    const error = this.state.error
    if (!error) return this.props.children
    return (
      <div className="flex min-h-[80vh] items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-4 rounded-xl border border-border bg-card p-6 shadow-lg">
          <div>
            <h1 className="text-lg font-bold text-foreground">This screen didn&apos;t load</h1>
            <p className="mt-1 text-sm text-muted">
              Share the details below — they show exactly why this page failed.
            </p>
          </div>
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-sidebar-hover p-3 text-xs leading-5 text-danger">
            {error.message || "Unknown error"}
            {error.stack ? `\n\n${error.stack}` : ""}
          </pre>
          <div className="flex gap-2">
            <button onClick={() => window.location.reload()} className="btn-primary flex-1">
              Reload
            </button>
            <button onClick={() => (window.location.href = "/dashboard")} className="btn-secondary flex-1">
              Go to dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  if (!publishableKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="glass-panel max-w-md p-6 text-sm text-muted">
          Clerk is not configured for this build. Set
          <code className="mx-1 rounded bg-card px-1.5 py-0.5">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>
          in <code className="rounded bg-card px-1.5 py-0.5">apps/desktop/.env.local</code>.
        </div>
      </div>
    )
  }

  return (
    <MigrationGate>
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={{
        variables: {
          colorPrimary: "#047857",
          borderRadius: "0.6rem",
          fontFamily: "var(--font-geist-sans)",
        },
      }}
    >
      <TokenBridge />
      <ScreenErrorBoundary>
        <AuthGate>{children}</AuthGate>
      </ScreenErrorBoundary>
    </ClerkProvider>
    </MigrationGate>
  )
}
