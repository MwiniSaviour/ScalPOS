"use client"

import { SignUp } from "@clerk/clerk-react"

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Create your account</h1>
          <p className="mt-1 text-sm text-muted">
            Use the same account on your phone and every sale stays in sync.
          </p>
        </div>
        <SignUp
          routing="hash"
          signInUrl="/auth/login"
          fallbackRedirectUrl="/dashboard"
        />
      </div>
    </main>
  )
}
