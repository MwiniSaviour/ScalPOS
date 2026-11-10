"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useClerk } from "@clerk/clerk-react"
import { BadgeCheck, Clock, CreditCard, RefreshCw, ShieldAlert } from "lucide-react"
import {
  BillingAuthError,
  getSubscription,
  startCheckout,
  type Renewal,
  type SubPlan,
  type SubscriptionState,
} from "@/lib/api/billing"
import {
  clearAffiliateRef,
  normalizeAffiliateRef,
  readAffiliateRef,
  saveAffiliateRef,
} from "@/lib/affiliate"
import { cn, formatDate } from "@/lib/utils"

const CHECKOUT_KEY = "desk-pos-checkout-v1"

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

function planLabel(plan: SubPlan | null): string {
  if (plan === "enterprise") return "Enterprise"
  if (plan === "standard") return "Standard"
  return "—"
}

export default function BillingPage() {
  const router = useRouter()
  const clerk = useClerk()
  const [state, setState] = useState<SubscriptionState | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<SubPlan | "refresh" | null>(null)
  const [renewal, setRenewal] = useState<Renewal>("manual")
  const [sessionExpired, setSessionExpired] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [affiliateCode, setAffiliateCode] = useState("")
  const [affiliateError, setAffiliateError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    setSessionExpired(false)
    try {
      const next = await getSubscription()
      setState(next)
    } catch (e) {
      if (e instanceof BillingAuthError) setSessionExpired(true)
      else setError(errorText(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    getSubscription()
      .then((s) => {
        if (alive) setState(s)
      })
      .catch((e: unknown) => {
        if (!alive) return
        if (e instanceof BillingAuthError) setSessionExpired(true)
        else setError(errorText(e))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const stored = readAffiliateRef()
    if (stored) queueMicrotask(() => setAffiliateCode(stored))
  }, [])

  async function refresh() {
    setBusy("refresh")
    await load()
    setBusy(null)
  }

  async function subscribe(plan: SubPlan) {
    if (busy) return
    const rawCode = affiliateCode.trim()
    let code: string | null = null
    if (rawCode) {
      code = normalizeAffiliateRef(rawCode)
      if (!code) {
        setAffiliateError("Referral codes look like SCAL-XXXXXXXX.")
        return
      }
      saveAffiliateRef(code)
      setAffiliateCode(code)
    } else {
      clearAffiliateRef()
    }
    setAffiliateError(null)
    setBusy(plan)
    setError(null)
    try {
      const payload = await startCheckout(plan, renewal, code)
      sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify(payload))
      router.push("/dashboard/billing/pay")
    } catch (e) {
      if (e instanceof BillingAuthError) setSessionExpired(true)
      else setError(errorText(e))
    } finally {
      setBusy(null)
    }
  }

  async function finishPending() {
    const plan = state?.plan
    if (plan !== "standard" && plan !== "enterprise") return
    await subscribe(plan)
  }

  async function reSignIn() {
    await clerk.signOut()
    router.push("/auth/login")
  }

  function statusCard() {
    if (loading) {
      return (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-hover text-muted">
            <Clock size={18} />
          </span>
          <p className="text-sm text-muted">Checking your plan…</p>
        </div>
      )
    }
    if (sessionExpired) {
      return (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <ShieldAlert size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-red-600">Session expired</span>
            <span className="block text-xs text-muted">
              Sign in again to check your plan and manage billing.
            </span>
          </span>
          <button onClick={() => void reSignIn()} className="btn-secondary shrink-0 text-xs">
            Sign in again
          </button>
        </div>
      )
    }
    const s = state
    if (s?.status === "active") {
      return (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600">
            <BadgeCheck size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-green-600">Active</span>
            <span className="block text-xs text-muted">
              {planLabel(s.plan)} plan · {s.renewal === "auto" ? "auto-renews yearly" : "renew manually"}
              {s.expires_at ? ` · until ${formatDate(s.expires_at)}` : ""}
            </span>
          </span>
        </div>
      )
    }
    if (s?.status === "trialing") {
      return (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
            <Clock size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-primary">Free trial</span>
            <span className="block text-xs text-muted">
              Full access until {s.expires_at ? formatDate(s.expires_at) : "—"} · subscribe to keep
              cloud sync going
            </span>
          </span>
        </div>
      )
    }
    if (s?.status === "pending") {
      return (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <Clock size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-amber-600">Payment pending</span>
            <span className="block text-xs text-muted">
              Not confirmed yet. If you closed the checkout window, start a new payment below.
            </span>
          </span>
        </div>
      )
    }
    if (s?.status === "expired") {
      return (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <ShieldAlert size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-red-600">Expired</span>
            <span className="block text-xs text-muted">Subscribe again to keep cloud sync going.</span>
          </span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">No plan yet</span>
          <span className="block text-xs text-muted">
            The register works offline either way — pick a plan below to add cloud sync.
          </span>
        </span>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Plans &amp; billing</h1>
        <p className="mt-1 text-sm text-muted">Choose and manage the plan that syncs this shop.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center">{statusCard()}</div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => void refresh()}
          disabled={busy !== null || loading}
          className="btn-secondary text-sm"
        >
          <RefreshCw size={15} className={cn(busy === "refresh" && "animate-spin")} />
          Refresh status
        </button>
        {state?.status === "pending" && (
          <button
            onClick={() => void finishPending()}
            disabled={busy !== null || loading || sessionExpired}
            className="btn-primary text-sm"
          >
            <CreditCard size={15} />
            Pay now
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div>
        <h2 className="text-sm font-semibold text-foreground">Renewal</h2>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => setRenewal("manual")}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              renewal === "manual"
                ? "border-primary bg-primary-light text-primary"
                : "border-border text-muted hover:text-foreground",
            )}
          >
            Manual
          </button>
          <button
            onClick={() => setRenewal("auto")}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              renewal === "auto"
                ? "border-primary bg-primary-light text-primary"
                : "border-border text-muted hover:text-foreground",
            )}
          >
            Auto-renew
          </button>
        </div>
        <p className="mt-1.5 text-xs text-muted">
          {renewal === "manual"
            ? "Default — we ask you before each yearly payment."
            : "We charge your saved Paystack or MoMo method each year automatically."}
        </p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-foreground">Choose a plan</h2>
        <p className="mt-1 text-xs text-muted">
          New shops get a 7-day free trial first. Both plans cover a full year, paid with Paystack.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <PlanCard
            title="Standard"
            price="GHS 120/year"
            bullets={["Single owner", "Unlimited sales", "Offline register"]}
            busy={busy === "standard"}
            disabled={busy !== null || sessionExpired}
            current={state?.status === "active" && state?.plan === "standard"}
            onSubscribe={() => void subscribe("standard")}
          />
          <PlanCard
            title="Enterprise"
            price="GHS 360/year"
            bullets={["Multi-user & roles", "Real-time sync", "Cloud backup", "Desktop access"]}
            busy={busy === "enterprise"}
            disabled={busy !== null || sessionExpired}
            current={state?.status === "active" && state?.plan === "enterprise"}
            onSubscribe={() => void subscribe("enterprise")}
          />
        </div>
      </div>

      <div>
        <label className="label">Referral code (optional)</label>
        <input
          value={affiliateCode}
          onChange={(e) => {
            setAffiliateCode(e.target.value.toUpperCase())
            setAffiliateError(null)
          }}
          placeholder="SCAL-XXXXXXXX"
          className={cn("input-field uppercase", affiliateError && "border-danger")}
          autoCapitalize="characters"
          spellCheck={false}
        />
        {affiliateError ? (
          <p className="mt-1 text-xs text-danger">{affiliateError}</p>
        ) : (
          <p className="mt-1 text-xs text-muted">
            Referred by a ScalMint affiliate? Enter their code before subscribing.
          </p>
        )}
      </div>

      <p className="pb-4 text-xs leading-5 text-muted">
        Payments handled by Paystack. By subscribing you agree to the{" "}
        <a
          href="https://pos.scalmint.com/legal?doc=terms"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Terms of Service
        </a>{" "}
        and{" "}
        <a
          href="https://pos.scalmint.com/legal?doc=refunds"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Refund Policy
        </a>
        .
      </p>
    </div>
  )
}

function PlanCard({
  title,
  price,
  bullets,
  busy,
  disabled,
  current,
  onSubscribe,
}: {
  title: string
  price: string
  bullets: string[]
  busy: boolean
  disabled: boolean
  current?: boolean
  onSubscribe: () => void
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4",
        current && "ring-2 ring-primary",
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-base font-semibold text-foreground">{title}</span>
        {current ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-[11px] font-semibold text-green-600">
            <BadgeCheck size={13} />
            Current plan
          </span>
        ) : (
          <span className="text-sm font-bold text-foreground">{price}</span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-muted">{current ? price : "Yearly subscription"}</p>
      <ul className="mt-3 space-y-1.5">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span className="text-xs leading-5 text-muted">{b}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={onSubscribe}
        disabled={disabled}
        className={cn("mt-4 w-full", current ? "btn-secondary" : "btn-primary")}
      >
        {busy ? "Starting…" : current ? "Renew" : "Subscribe"}
      </button>
    </div>
  )
}
