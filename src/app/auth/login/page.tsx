"use client"

import { useState } from "react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { APP_NAME } from "@/lib/constants"

export const dynamic = "force-dynamic"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const { login, loading, error } = useAuth()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await login(email, password)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background overflow-hidden">
      {/* Background dots pattern */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-primary/10"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
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

        {/* Login card */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
          {/* Heading with green underline */}
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-foreground">
              Log in to your account
            </h2>
            <div className="mx-auto mt-2 h-1 w-16 rounded-full bg-primary" />
            <p className="mt-3 text-sm text-muted">
              Enter your email and password below to log in
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-danger-bg px-4 py-3 text-sm font-medium text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
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
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-semibold text-foreground">
                  Password <span className="text-danger">*</span>
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
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

            {/* Remember me */}
            <div className="flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
              />
              <label htmlFor="remember" className="text-sm text-text-secondary">
                Remember me
              </label>
            </div>

            {/* Sign in button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-3 text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            {/* Register link */}
            <p className="text-center text-sm text-muted">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/register"
                className="font-semibold text-primary hover:underline"
              >
                Create one
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

          {/* Quick Access */}
          <div className="text-center">
            <h3 className="mb-3 text-sm font-bold text-foreground">Quick Access</h3>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setEmail("admin@shop.com"); setPassword("admin123") }}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-bold text-white transition-all hover:bg-primary-hover"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => { setEmail("employee@shop.com"); setPassword("employee123") }}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-bold text-white transition-all hover:bg-primary-hover"
              >
                Employee
              </button>
            </div>
          </div>

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

          {/* Demo credentials hint */}
          <div className="text-center">
            <h3 className="mb-3 text-sm font-bold text-foreground">Demo Credentials</h3>
            <p className="text-xs text-muted">
              Register first at{" "}
              <Link href="/auth/register" className="text-primary hover:underline">
                /auth/register
              </Link>{" "}
              then sign in with your credentials
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
