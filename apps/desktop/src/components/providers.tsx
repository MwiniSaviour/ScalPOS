"use client"

import { Component, useEffect, type ErrorInfo, type ReactNode } from "react"
import { ClerkProvider, useAuth } from "@clerk/clerk-react"
import { usePathname, useRouter } from "next/navigation"
import { registerTokenProvider } from "@/lib/auth/session"
import { OrgProvider } from "@/lib/auth/org"

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ""

function TokenBridge() {
  const { isSignedIn, getToken } = useAuth()
  useEffect(() => {
    if (!isSignedIn) {
      registerTokenProvider(null)
      return
    }
    registerTokenProvider(async () => {
      try {
        return (await getToken({ template: "supabase" })) ?? null
      } catch {
        return null
      }
    })
  }, [isSignedIn, getToken])
  return null
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const onAuthPage = pathname.startsWith("/auth")
  const onSsoCallback = pathname.startsWith("/auth/sso-callback")
  const onPublicPage =
    pathname === "/" ||
    pathname === "/legal" ||
    pathname === "/data-deletion"

  useEffect(() => {
    if (!isLoaded || onPublicPage || onSsoCallback) return
    if (!isSignedIn && !onAuthPage) router.replace("/auth/login")
    if (isSignedIn && onAuthPage) router.replace("/dashboard")
  }, [isLoaded, isSignedIn, onAuthPage, onPublicPage, onSsoCallback, router])

  if (onPublicPage || onSsoCallback) return <>{children}</>
  if (!isLoaded) return <BootScreen />
  if (!isSignedIn && !onAuthPage) return <BootScreen />
  if (isSignedIn && onAuthPage) return <BootScreen />
  if (onAuthPage) return <>{children}</>
  return <OrgProvider>{children}</OrgProvider>
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
  )
}
