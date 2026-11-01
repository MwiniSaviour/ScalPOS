"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"

export const dynamic = "force-dynamic"

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [localError, setLocalError] = useState<string | null>(null)
  const [dots, setDots] = useState<{ left: number; top: number }[]>([])

  useEffect(() => {
    setDots(
      Array.from({ length: 40 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
      }))
    )
  }, [])
  const { register, loading, error } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError(null)

    if (password !== confirm) {
      setLocalError("Passwords do not match")
      return
    }
    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters")
      return
    }

    await register(email, password, name)
  }

  const displayError = localError || error

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background overflow-hidden">
      {/* Background dots pattern */}
      <div className="absolute inset-0 pointer-events-none">
        {dots.map((d, i) => (
          <div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-primary/10"
            style={{
              left: `${d.left}%`,
              top: `${d.top}%`,
            }}
          />
        ))}
      </div>

      {/* Green accent lines */}
      <div className="absolute left-0 top-1/4 h-32 w-1 rounded-r-full bg-primary/20" />
      <div className="absolute right-0 bottom-1/3 h-24 w-1 rounded-l-full bg-primary/20" />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight">
            <span className="text-primary">S</span>
            <span className="text-foreground">HOP</span>
            <span className="text-primary">M</span>
            <span className="text-foreground">ANAGER</span>
          </h1>
        </div>

        {/* Register card */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
          {/* Heading with green underline */}
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-foreground">
              Create your account
            </h2>
            <div className="mx-auto mt-2 h-1 w-16 rounded-full bg-primary" />
            <p className="mt-3 text-sm text-muted">
              Fill in the details below to get started
            </p>
          </div>

          {displayError && (
            <div className="mb-4 rounded-lg bg-danger-bg px-4 py-3 text-sm font-medium text-danger">
              {displayError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-foreground">
                Full Name <span className="text-danger">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="John Doe"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-foreground">
                Email <span className="text-danger">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="you@example.com"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-foreground">
                Password <span className="text-danger">*</span>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="••••••••"
                required
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm" className="mb-1.5 block text-sm font-semibold text-foreground">
                Confirm Password <span className="text-danger">*</span>
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="••••••••"
                required
              />
            </div>

            {/* Create account button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-3 text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>

            {/* Login link */}
            <p className="text-center text-sm text-muted">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="font-semibold text-primary hover:underline"
              >
                Sign in
              </Link>
            </p>
          </form>

          {/* Divider with diamond */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-card">
                <div className="h-2.5 w-2.5 rotate-45 bg-primary" />
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="text-center">
            <h3 className="mb-3 text-sm font-bold text-foreground">Getting Started</h3>
            <p className="text-xs text-muted">
              After registering, you&apos;ll be assigned the <span className="font-semibold text-primary">Employee</span> role. 
              Contact your admin to upgrade to <span className="font-semibold text-primary">Admin</span> if needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
