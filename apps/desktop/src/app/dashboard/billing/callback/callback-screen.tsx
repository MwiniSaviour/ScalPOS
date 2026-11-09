"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { BadgeCheck, Clock, Loader2, RefreshCw, ShieldAlert, XCircle } from "lucide-react"
import { BillingAuthError, getSubscription } from "@/lib/api/billing"

type Phase = "checking" | "confirmed" | "failed" | "unconfirmed" | "expired" | "error"

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default function CallbackScreen() {
  const params = useSearchParams()
  const payStatus = params.get("status") ?? ""
  const [phase, setPhase] = useState<Phase>("checking")
  const [message, setMessage] = useState("")
  const [runId, setRunId] = useState(0)

  useEffect(() => {
    let alive = true
    ;(async () => {
      await sleep(0)
      if (!alive) return
      if (payStatus === "failed") {
        setPhase("failed")
        return
      }
      try {
        for (let attempt = 0; attempt < 3; attempt++) {
          if (!alive) return
          const s = await getSubscription()
          if (s.status === "active") {
            if (!alive) return
            setPhase("confirmed")
            return
          }
          if (attempt < 2) await sleep(1500)
        }
        if (!alive) return
        setPhase("unconfirmed")
      } catch (e) {
        if (!alive) return
        if (e instanceof BillingAuthError) {
          setPhase("expired")
          return
        }
        setMessage(e instanceof Error ? e.message : String(e))
        setPhase("error")
      }
    })()
    return () => {
      alive = false
    }
  }, [payStatus, runId])

  function retry() {
    setMessage("")
    setPhase("checking")
    setRunId((r) => r + 1)
  }

  const art: Record<Phase, { icon: typeof BadgeCheck; cls: string }> = {
    checking: { icon: Clock, cls: "bg-primary-light text-primary" },
    confirmed: { icon: BadgeCheck, cls: "bg-green-50 text-green-600" },
    failed: { icon: XCircle, cls: "bg-red-50 text-red-600" },
    unconfirmed: { icon: Clock, cls: "bg-amber-50 text-amber-600" },
    expired: { icon: ShieldAlert, cls: "bg-red-50 text-red-600" },
    error: { icon: ShieldAlert, cls: "bg-red-50 text-red-600" },
  }

  const copy: Record<Phase, { title: string; body: string }> = {
    checking: {
      title: "Checking your payment",
      body: "Hang on while we confirm the transaction with Paystack.",
    },
    confirmed: {
      title: "Payment confirmed",
      body: "Your plan is active. Cloud sync stays on for this shop.",
    },
    failed: {
      title: "Payment failed",
      body: "No charge was made. You can try again from Plans & billing.",
    },
    unconfirmed: {
      title: "Still confirming",
      body: "We haven't seen the payment yet. It usually lands within a minute — try again shortly.",
    },
    expired: {
      title: "Session expired",
      body: "Sign in again to check the status of this payment.",
    },
    error: {
      title: "Something went wrong",
      body: "We couldn't reach the billing service. Check your connection and retry.",
    },
  }

  const Art = art[phase].icon
  const busy = phase === "checking"

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center">
        <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${art[phase].cls}`}>
          {busy ? <Loader2 size={22} className="animate-spin" /> : <Art size={22} />}
        </div>
        <h1 className="mt-4 text-base font-semibold text-foreground">{copy[phase].title}</h1>
        <p className="mt-1.5 text-sm leading-5 text-muted">{copy[phase].body}</p>
        {message && phase === "error" && (
          <p className="mt-2 break-words text-xs text-red-600">{message}</p>
        )}
        <div className="mt-5 flex flex-col gap-2">
          {busy ? (
            <span className="btn-secondary pointer-events-none opacity-70">Checking…</span>
          ) : phase === "confirmed" ? (
            <Link href="/dashboard/billing" className="btn-primary">
              Back to billing
            </Link>
          ) : phase === "failed" ? (
            <Link href="/dashboard/billing" className="btn-primary">
              Back to billing
            </Link>
          ) : (
            <>
              <button onClick={retry} className="btn-primary">
                <RefreshCw size={15} />
                Try again
              </button>
              <Link href="/dashboard/billing" className="btn-ghost">
                Back to billing
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
