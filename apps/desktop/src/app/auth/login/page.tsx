"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { useSignIn } from "@clerk/clerk-react"
import { AuthError, AuthShell, GoogleMark } from "@/components/auth/auth-shell"
import { friendlyClerkError } from "@/lib/clerk-errors"

export default function LoginPage() {
  const router = useRouter()
  const { isLoaded, signIn, setActive } = useSignIn()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function finish(sessionId: string | null | undefined) {
    if (!setActive || !sessionId) {
      setError("Sign-in could not be completed. Try again.")
      return
    }
    await setActive({ session: sessionId })
    router.replace("/dashboard")
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!isLoaded || !signIn || busy) return
    setBusy(true)
    setError(null)
    try {
      const result = await signIn.create({ identifier: email.trim(), password })
      if (result.status === "complete") {
        await finish(result.createdSessionId)
        return
      }
      if (result.status === "needs_second_factor") {
        setError("This account uses two-step verification. Contact support to sign in here.")
        return
      }
      setError(`Sign-in needs another step (${result.status}). Try again or reset your password.`)
    } catch (e) {
      setError(friendlyClerkError(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogle() {
    if (!isLoaded || !signIn || busy) return
    setBusy(true)
    setError(null)
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/auth/sso-callback",
        redirectUrlComplete: "/dashboard",
      })
    } catch (e) {
      setError(friendlyClerkError(e))
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Log in to your account"
      subtitle="Use the same account you use on your phone."
    >
      <AuthError message={error} />

      <button
        type="button"
        onClick={() => void handleGoogle()}
        disabled={busy || !isLoaded}
        className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-card py-3 text-sm font-semibold text-foreground transition-colors hover:bg-sidebar-hover disabled:opacity-60"
      >
        <GoogleMark />
        Continue with Google
      </button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-card px-3 text-xs uppercase tracking-wider text-muted">or</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="label">
            Email <span className="text-red-600">*</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="label mb-0">
              Password <span className="text-red-600">*</span>
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-sm font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field pr-11"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-foreground"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={busy || !isLoaded} className="btn-primary w-full py-3">
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-center text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="font-semibold text-primary hover:underline">
            Create one
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
