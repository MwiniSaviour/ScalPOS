"use client"

import { Suspense } from "react"
import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react"

function Callback() {
  return (
    <AuthenticateWithRedirectCallback
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    />
  )
}

export default function SsoCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-border border-t-primary" />
        <p className="text-sm text-muted">Finishing sign in…</p>
      </div>
      <Suspense fallback={null}>
        <Callback />
      </Suspense>
    </div>
  )
}
