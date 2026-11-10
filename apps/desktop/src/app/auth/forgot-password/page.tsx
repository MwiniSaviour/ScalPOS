"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSignIn } from "@clerk/clerk-react"
import { AuthError, AuthShell } from "@/components/auth/auth-shell"
import { friendlyClerkError } from "@/lib/clerk-errors"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { isLoaded, signIn, setActive } = useSignIn()
  const [step, setStep] = useState<"email" | "reset">("email")
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function requestCode(event: React.FormEvent) {
    event.preventDefault()
    if (!isLoaded || !signIn || busy) return
    setBusy(true)
    setError(null)
    try {
      await signIn.create({ strategy: "reset_password_email_code", identifier: email.trim() })
      setStep("reset")
    } catch (e) {
      setError(friendlyClerkError(e))
    } finally {
      setBusy(false)
    }
  }

  async function resetPassword(event: React.FormEvent) {
    event.preventDefault()
    if (!signIn || busy) return
    setError(null)
    if (password !== confirm) {
      setError("Passwords do not match")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }
    setBusy(true)
    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: code.trim(),
        password,
      })
      if (result.status === "complete" && result.createdSessionId && setActive) {
        await setActive({ session: result.createdSessionId })
        router.replace("/dashboard")
        return
      }
      setError(`Reset needs another step (${result.status}). Try again.`)
    } catch (e) {
      setError(friendlyClerkError(e))
    } finally {
      setBusy(false)
    }
  }

  if (step === "reset") {
    return (
      <AuthShell
        title="Choose a new password"
        subtitle={`Enter the code we sent to ${email.trim()} and pick a new password.`}
      >
        <AuthError message={error} />
        <form onSubmit={resetPassword} className="space-y-5">
          <div>
            <label htmlFor="code" className="label">
              Reset code
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
          <div>
            <label htmlFor="password" className="label">
              New password
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
              Confirm new password
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
          <button type="submit" disabled={busy} className="btn-primary w-full py-3">
            {busy ? "Resetting…" : "Reset password"}
          </button>
          <p className="text-center text-sm text-muted">
            <button
              type="button"
              onClick={() => {
                setStep("email")
                setError(null)
              }}
              className="font-medium text-primary hover:underline"
            >
              Use a different email
            </button>
          </p>
        </form>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll email you a code to verify it's you."
    >
      <AuthError message={error} />
      <form onSubmit={requestCode} className="space-y-5">
        <div>
          <label htmlFor="email" className="label">
            Email
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
        <button type="submit" disabled={busy || !isLoaded} className="btn-primary w-full py-3">
          {busy ? "Sending code…" : "Send reset code"}
        </button>
        <p className="text-center text-sm text-muted">
          Remembered it?{" "}
          <Link href="/auth/login" className="font-semibold text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
