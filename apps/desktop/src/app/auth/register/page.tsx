"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSignUp } from "@clerk/clerk-react"
import { AuthError, AuthShell, GoogleMark } from "@/components/auth/auth-shell"
import { clerkCode, friendlyClerkError } from "@/lib/clerk-errors"

export default function RegisterPage() {
  const router = useRouter()
  const { isLoaded, signUp, setActive } = useSignUp()
  const [step, setStep] = useState<"form" | "verify">("form")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [consent, setConsent] = useState(false)
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function finish(sessionId: string | null | undefined) {
    if (!setActive || !sessionId) {
      setError("Account could not be completed. Try signing in instead.")
      return
    }
    await setActive({ session: sessionId })
    router.replace("/dashboard")
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!isLoaded || !signUp || busy) return
    setError(null)
    if (password !== confirm) {
      setError("Passwords do not match")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }
    if (!consent) {
      setError("Please agree to the Terms and Privacy Policy to create your account.")
      return
    }

    setBusy(true)
    try {
      const parts = name.trim().split(/\s+/)
      const firstName = parts.shift() ?? ""
      const lastName = parts.join(" ")
      const result = await signUp.create({
        emailAddress: email.trim(),
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      })
      if (result.status === "complete") {
        await finish(result.createdSessionId)
        return
      }
      await signUp.update({ legalAccepted: true })
      await signUp.prepareVerification({ strategy: "email_code" })
      setStep("verify")
    } catch (e) {
      if (clerkCode(e) === "form_identifier_exists") {
        setError("That email already has an account. Sign in instead.")
      } else {
        setError(friendlyClerkError(e))
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault()
    if (!signUp || busy) return
    setError(null)
    setBusy(true)
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: code.trim() })
      if (result.status === "complete") {
        await finish(result.createdSessionId)
        return
      }
      const missing = result.missingFields.filter((field) => field !== "email_address")
      setError(
        missing.length
          ? `More details are needed: ${missing.join(", ")}`
          : "That code didn't complete sign-up. Check it and try again.",
      )
    } catch (e) {
      setError(friendlyClerkError(e))
    } finally {
      setBusy(false)
    }
  }

  async function resend() {
    if (!signUp || busy) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await signUp.prepareVerification({ strategy: "email_code" })
      setNotice("A new code is on its way to your email.")
    } catch (e) {
      setError(friendlyClerkError(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogle() {
    if (!isLoaded || !signUp || busy) return
    setBusy(true)
    setError(null)
    try {
      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/auth/sso-callback",
        redirectUrlComplete: "/dashboard",
      })
    } catch (e) {
      setError(friendlyClerkError(e))
      setBusy(false)
    }
  }

  if (step === "verify") {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`Enter the 6-digit code we sent to ${email.trim()}.`}
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
            {busy ? "Verifying…" : "Verify & create account"}
          </button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => {
                setStep("form")
                setError(null)
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
      title="Create your account"
      subtitle="Use the same account on your phone and every sale stays in sync."
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
          <label htmlFor="name" className="label">
            Full name <span className="text-red-600">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            placeholder="Ama Mensah"
            autoComplete="name"
            required
          />
        </div>

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
          <label htmlFor="password" className="label">
            Password <span className="text-red-600">*</span>
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
          />
        </div>

        <div>
          <label htmlFor="confirm" className="label">
            Confirm password <span className="text-red-600">*</span>
          </label>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="input-field"
            placeholder="Repeat your password"
            autoComplete="new-password"
            required
          />
        </div>

        <label className="flex items-start gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
          />
          <span>
            I agree to the{" "}
            <a
              href="/legal?doc=terms"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary hover:underline"
            >
              Terms
            </a>{" "}
            and{" "}
            <a
              href="/legal?doc=privacy"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary hover:underline"
            >
              Privacy Policy
            </a>
            .
          </span>
        </label>

        <button type="submit" disabled={busy || !isLoaded} className="btn-primary w-full py-3">
          {busy ? "Creating account…" : "Create account"}
        </button>

        <p className="text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
