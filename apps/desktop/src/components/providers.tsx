"use client"

import { useEffect } from "react"
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

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn && !onAuthPage) router.replace("/auth/login")
    if (isSignedIn && onAuthPage) router.replace("/dashboard")
  }, [isLoaded, isSignedIn, onAuthPage, router])

  if (!isLoaded) return <BootScreen />
  if (!isSignedIn && !onAuthPage) return <BootScreen />
  if (isSignedIn && onAuthPage) return <BootScreen />
  return <>{children}</>
}

function BootScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-border border-t-primary" />
        <p className="text-sm text-muted">Loading ShopManager…</p>
      </div>
    </div>
  )
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
          colorPrimary: "#4f46e5",
          borderRadius: "0.6rem",
          fontFamily: "var(--font-geist-sans)",
        },
      }}
    >
      <TokenBridge />
      <AuthGate>
        <OrgProvider>{children}</OrgProvider>
      </AuthGate>
    </ClerkProvider>
  )
}
