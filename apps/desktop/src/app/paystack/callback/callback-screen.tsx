"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Smartphone, XCircle } from "lucide-react"

// Landing for the mobile app's hosted-redirect payment flow. The phone
// opens Paystack in a system browser and lands here; the checkout state
// lives on the phone, so this page just sends the user back to the app.
export default function PaystackCallbackScreen() {
  const failed = useSearchParams().get("status") === "failed"

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="glass-panel w-full max-w-md p-8 text-center">
        <div
          className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${
            failed ? "bg-danger-bg text-danger" : "bg-primary-light text-primary"
          }`}
        >
          {failed ? <XCircle size={26} /> : <Smartphone size={26} />}
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          {failed ? "Payment cancelled" : "Payment received"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {failed
            ? "No charge was made. You can retry the payment from ScalPOS → Plans & billing on your phone."
            : "Open ScalPOS on your phone to see your plan go live. It usually activates within a minute."}
        </p>
        <button
          onClick={() => {
            window.location.assign("novapos://open")
          }}
          className="btn-primary mt-6 w-full"
        >
          <Smartphone size={16} />
          Open ScalPOS
        </button>
        <Link href="/dashboard" className="btn-ghost mt-2 w-full">
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}
