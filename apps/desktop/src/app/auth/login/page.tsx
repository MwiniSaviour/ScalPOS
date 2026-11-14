"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { useSignIn } from "@clerk/clerk-react"
import { AuthError, AuthShell, GoogleMark } from "@/components/auth/auth-shell"
import { clerkCode, friendlyClerkError } from "@/lib/clerk-errors"

type EmailCodeFactor = { strategy: "email_code"; emailAddressId?: string }

export default function LoginPage() {
  const router = useRouter()
  const { isLoaded, signIn, setActive } = useSignIn()
  const [step, setStep] = useState<"password" | "code">("password")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [code, setCode] = useState("")
  const [emailAddressId, setEmailAddressId] = useState<string | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

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
        const factor = (
          result.supportedSecondFactors as EmailCodeFactor[] | null | undefined
        )?.find((candidate) => candidate.strategy === "email_code")
        if (!factor) {
          setError("This account uses two-step verification we can't complete here. Contact support.")
          return
        }
        await signIn.prepareSecondFactor({
          strategy: "email_code",
          emailAddressId: factor.emailAddressId,
        })
        setEmailAddressId(factor.emailAddressId)
        setStep("code")
        return
      }
      setError(`Sign-in needs another step (${result.status}). Try again or reset your password.`)
    } catch (e) {
      if (clerkCode(e) === "session_exists") {
        router.replace("/dashboard")
        return
      }
      setError(friendlyClerkError(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault()
    if (!signIn || busy) return
    setError(null)
    setBusy(true)
    try {
      const result = await signIn.attemptSecondFactor({
        strategy: "email_code",
        code: code.trim(),
      })
      if (result.status === "complete") {
        await finish(result.createdSessionId)
        return
      }
      setError("That code didn't complete sign-in. Check it and try again.")
    } catch (e) {
      setError(friendlyClerkError(e))
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    if (!signIn || !emailAddressId || busy) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await signIn.prepareSecondFactor({ strategy: "email_code", emailAddressId })
      setNotice("A new code is on its way to your email.")
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

  if (step === "code") {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`Enter the 6-digit code we sent to ${email.trim()} to finish signing in.`}
      >
        <AuthError message={error} />
        {notice && (
          <p className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            {notice}
          </p>
        )}
        <form onSubmit={handleVerify} className="space-y-5">
          <div>
            <label htmlFor="code" className="label">
              Verification code
            </label>
            <input
              id="code"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="input-field text-center text-xl tracking-[0.4em]"
              placeholder="000000"
              autoComplete="one-time-code"
              autoFocus
              required
            />
          </div>
          <button type="submit" disabled={busy || code.length < 6} className="btn-primary w-full py-3">
            {busy ? "Verifying…" : "Verify & sign in"}
          </button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => {
                setStep("password")
                setCode("")
                setError(null)
                setNotice(null)
              }}
              className="font-medium text-muted hover:text-foreground"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => void resend()}
              disabled={busy}
              className="font-semibold text-primary hover:underline disabled:opacity-60"
            >
              Resend code
            </button>
          </div>
        </form>
      </AuthShell>
    )
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
