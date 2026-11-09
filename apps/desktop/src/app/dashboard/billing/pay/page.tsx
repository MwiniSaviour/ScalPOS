"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, ShieldAlert } from "lucide-react"

const CHECKOUT_KEY = "desk-pos-checkout-v1"

type PaystackEvent = { message?: string }

type PaystackResumeOptions = {
  accessCode?: string
  onSuccess: () => void
  onCancel: () => void
  onError?: (event: PaystackEvent) => void
}

type PaystackInstance = {
  resumeTransaction: (options: PaystackResumeOptions) => void
}

type PaystackConstructor = new (publicKey: string) => PaystackInstance

type Payload = { public_key: string; access_code: string; reference: string }

function parsePayload(raw: string | null): Payload | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<Payload>
    if (
      typeof value.public_key === "string" &&
      typeof value.access_code === "string" &&
      typeof value.reference === "string" &&
      value.public_key &&
      value.access_code &&
      value.reference
    ) {
      return { public_key: value.public_key, access_code: value.access_code, reference: value.reference }
    }
    return null
  } catch {
    return null
  }
}

let paystackLoad: Promise<PaystackConstructor> | null = null

function ensurePaystack(): Promise<PaystackConstructor> {
  const existing = (window as unknown as { PaystackPop?: PaystackConstructor }).PaystackPop
  if (existing) return Promise.resolve(existing)
  if (paystackLoad) return paystackLoad
  paystackLoad = new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = "https://js.paystack.co/v1/inline.js"
    script.async = true
    script.setAttribute("data-paystack-inline", "true")
    script.crossOrigin = "anonymous"
    script.onload = () => {
      const value = (window as unknown as { PaystackPop?: PaystackConstructor }).PaystackPop
      if (value) resolve(value)
      else reject(new Error("Couldn't load Paystack. Check your connection and try again."))
    }
    script.onerror = () => reject(new Error("Couldn't load Paystack. Check your connection and try again."))
    document.head.appendChild(script)
  })
  return paystackLoad
}

export default function PayPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<"loading" | "open" | "missing" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    let alive = true
    ;(async () => {
      const payload = parsePayload(sessionStorage.getItem(CHECKOUT_KEY))
      if (!payload) {
        if (alive) setPhase("missing")
        return
      }
      try {
        const PaystackPop = await ensurePaystack()
        if (!alive) return
        setPhase("open")
        const checkout = new PaystackPop(payload.public_key)
        checkout.resumeTransaction({
          accessCode: payload.access_code,
          onSuccess: () => {
            router.replace(`/dashboard/billing/callback?reference=${encodeURIComponent(payload.reference)}`)
          },
          onCancel: () => {
            router.replace("/dashboard/billing")
          },
          onError: (event) => {
            setMessage(event?.message ?? "Payment failed. No charge was made.")
            setPhase("error")
          },
        })
      } catch (e) {
        if (!alive) return
        setMessage(e instanceof Error ? e.message : "Couldn't open checkout.")
        setPhase("error")
      }
    })()
    return () => {
      alive = false
    }
  }, [router])

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center">
        {phase === "loading" || phase === "open" ? (
          <>
            <Loader2 size={24} className="mx-auto animate-spin text-primary" />
            <h1 className="mt-4 text-base font-semibold text-foreground">Opening secure checkout</h1>
            <p className="mt-1 text-sm text-muted">
              Paystack is loading. Complete the payment in the window that opens.
            </p>
          </>
        ) : phase === "missing" ? (
          <>
            <ShieldAlert size={24} className="mx-auto text-amber-600" />
            <h1 className="mt-4 text-base font-semibold text-foreground">No checkout in progress</h1>
            <p className="mt-1 text-sm text-muted">
              Start a new subscription from Plans &amp; billing.
            </p>
          </>
        ) : (
          <>
            <ShieldAlert size={24} className="mx-auto text-red-600" />
            <h1 className="mt-4 text-base font-semibold text-foreground">Payment failed</h1>
            <p className="mt-1 break-words text-sm text-muted">{message}</p>
          </>
        )}
        <Link
          href="/dashboard/billing"
          className="btn-secondary mt-5 inline-flex w-full items-center justify-center"
        >
          Back to billing
        </Link>
      </div>
    </div>
  )
}
