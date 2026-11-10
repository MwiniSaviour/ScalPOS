"use client"

import Image from "next/image"
import type { ReactNode } from "react"

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute left-0 top-1/4 h-32 w-1 rounded-r-full bg-primary/20" />
      <div className="pointer-events-none absolute bottom-1/3 right-0 h-24 w-1 rounded-l-full bg-primary/20" />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <Image
            src="/brandmark.png"
            alt="ScalPOS logo"
            width={36}
            height={36}
            unoptimized
            className="h-9 w-9 rounded-lg"
          />
          <span className="text-2xl font-extrabold tracking-tight text-foreground">ScalPOS</span>
        </div>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            <div className="mx-auto mt-2 h-1 w-16 rounded-full bg-primary" />
            <p className="mt-3 text-sm text-muted">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{message}</p>
  )
}

export function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.5 11.5 0 0 0 12 0 11.99 11.99 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  )
}
