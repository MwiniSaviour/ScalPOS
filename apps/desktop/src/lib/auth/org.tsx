"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useAuth, useClerk } from "@clerk/clerk-react"
import { createClient } from "@supabase/supabase-js"
import { bootstrapOrg } from "@/lib/supabase/client"

export type Shop = {
  id: string
  name: string
  role: "owner" | "supervisor" | "cashier"
}

type OrgContextValue = {
  shop: Shop | null
  loading: boolean
  error: string | null
  needsShop: boolean
  createShop: () => Promise<void>
  retry: () => void
}

const CACHE_KEY = "desk-pos-shop-v1"

let activeShop: Shop | null = null

export function getOrgId(): string {
  if (!activeShop) throw new Error("No shop connected")
  return activeShop.id
}

export function getOrgRole(): Shop["role"] {
  return activeShop?.role ?? "cashier"
}

function readCache(userId: string | null | undefined): Shop | null {
  if (!userId || typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { user_id?: string; shop?: Shop } | null
    if (parsed?.user_id !== userId || !parsed.shop?.id) return null
    return parsed.shop
  } catch {
    return null
  }
}

function writeCache(userId: string, shop: Shop) {
  window.localStorage.setItem(CACHE_KEY, JSON.stringify({ user_id: userId, shop }))
}

const OrgContext = createContext<OrgContextValue | null>(null)

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth()
  const { signOut } = useClerk()
  const [shop, setShop] = useState<Shop | null>(() => {
    if (typeof window === "undefined") return null
    const cached = readCache(userId)
    if (cached) activeShop = cached
    return cached
  })
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true
    return !readCache(userId)
  })
  const [error, setError] = useState<string | null>(null)
  const [needsShop, setNeedsShop] = useState(false)
  const [nonce, setNonce] = useState(0)
  const busy = useRef(false)

  const connect = useCallback(
    async (create: boolean) => {
      if (!userId || busy.current) return
      busy.current = true
      try {
        const token = await getToken({ template: "supabase" })
        if (!token) throw new Error("Your session expired. Sign in again.")
        const res = await bootstrapOrg(create, token)
        if (res.status === "no_shop") {
          setNeedsShop(true)
          setError(null)
          return
        }

        const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
        const sb = createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          accessToken: async () => token,
        })
        const { data } = await sb
          .from("memberships")
          .select("role, orgs(name)")
          .eq("org_id", res.orgId)
          .maybeSingle()

        const row = data as { role?: string; orgs?: { name?: string } | { name?: string }[] } | null
        const orgs = row?.orgs
        const orgName = Array.isArray(orgs) ? orgs[0]?.name : orgs?.name
        const role = row?.role
        const next: Shop = {
          id: res.orgId,
          name: orgName || "My shop",
          role: role === "owner" || role === "supervisor" ? role : "cashier",
        }

        activeShop = next
        setShop(next)
        setNeedsShop(false)
        setError(null)
        writeCache(userId, next)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not connect to your shop.")
      } finally {
        busy.current = false
        setLoading(false)
      }
    },
    [getToken, userId],
  )

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return
    const t = setTimeout(() => void connect(false), 0)
    return () => clearTimeout(t)
  }, [connect, isLoaded, isSignedIn, userId, nonce])

  const createShop = useCallback(async () => {
    setLoading(true)
    setError(null)
    await connect(true)
  }, [connect])

  const retry = useCallback(() => {
    setLoading(true)
    setError(null)
    setNonce((n) => n + 1)
  }, [])

  const value = useMemo<OrgContextValue>(
    () => ({ shop, loading, error, needsShop, createShop, retry }),
    [shop, loading, error, needsShop, createShop, retry],
  )

  if (!shop) {
    if (error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="glass-panel w-full max-w-md space-y-4 p-6">
            <div>
              <h1 className="text-lg font-bold text-foreground">Can&apos;t open your shop</h1>
              <p className="mt-1 text-sm text-muted">{error}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={retry} disabled={loading} className="btn-primary flex-1">
                {loading ? "Retrying…" : "Try again"}
              </button>
              <button onClick={() => void signOut()} className="btn-secondary flex-1">
                Sign out
              </button>
            </div>
          </div>
        </div>
      )
    }
    if (needsShop) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="glass-panel w-full max-w-md space-y-4 p-6">
            <div>
              <h1 className="text-lg font-bold text-foreground">No shop yet</h1>
              <p className="mt-1 text-sm text-muted">
                Your account isn&apos;t linked to a shop. Create one to start selling.
              </p>
            </div>
            <button onClick={() => void createShop()} disabled={loading} className="btn-primary w-full">
              {loading ? "Creating…" : "Create my shop"}
            </button>
          </div>
        </div>
      )
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="text-sm text-muted">Connecting to your shop…</p>
        </div>
      </div>
    )
  }

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error("useOrg must be used inside OrgProvider")
  return ctx
}
