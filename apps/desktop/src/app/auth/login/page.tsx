"use client"

import { SignIn } from "@clerk/clerk-react"

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Welcome back</h1>
          <p className="mt-1 text-sm text-muted">
            Sign in with the same account you use on your phone.
          </p>
        </div>
        <SignIn
          routing="hash"
          signUpUrl="/auth/register"
          fallbackRedirectUrl="/dashboard"
        />
      </div>
    </main>
  )
}
