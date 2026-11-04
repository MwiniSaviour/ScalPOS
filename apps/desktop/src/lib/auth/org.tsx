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
import { useAuth } from "@clerk/clerk-react"
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

function sameUser(userId: string | null | undefined): boolean {
  if (!userId || typeof window === "undefined") return false
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw) as { user_id?: string; shop?: Shop } | null
    return parsed?.user_id === userId && Boolean(parsed.shop?.id)
  } catch {
    return false
  }
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

function clearCache() {
  window.localStorage.removeItem(CACHE_KEY)
}

const OrgContext = createContext<OrgContextValue | null>(null)

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth()
  const [shop, setShop] = useState<Shop | null>(() => {
    if (typeof window === "undefined") return null
    return readCache(userId)
  })
  const [loading, setLoading] = useState(true)
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
    if (!isLoaded) return
    if (!isSignedIn || !userId) {
      activeShop = null
      setShop(null)
      setLoading(false)
      setNeedsShop(false)
      setError(null)
      clearCache()
      return
    }

    const cached = readCache(userId)
    if (cached) {
      activeShop = cached
      setShop(cached)
      setLoading(false)
    } else if (sameUser(userId) === false) {
      setLoading(true)
    }
    void connect(false)
    return
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

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error("useOrg must be used inside OrgProvider")
  return ctx
}
