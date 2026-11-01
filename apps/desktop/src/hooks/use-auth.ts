"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function useAuth() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function login(email: string, password: string) {
    setLoading(true)
    setError(null)

    const form = document.createElement("form")
    form.method = "POST"
    form.action = "/auth/api/login"
    form.style.display = "none"

    const e = document.createElement("input")
    e.name = "email"
    e.value = email
    form.appendChild(e)

    const p = document.createElement("input")
    p.name = "password"
    p.value = password
    form.appendChild(p)

    document.body.appendChild(form)
    form.submit()
  }

  async function register(email: string, password: string, name: string) {
    setLoading(true)
    setError(null)

    const form = document.createElement("form")
    form.method = "POST"
    form.action = "/auth/api/register"
    form.style.display = "none"

    const n = document.createElement("input")
    n.name = "name"
    n.value = name
    form.appendChild(n)

    const e = document.createElement("input")
    e.name = "email"
    e.value = email
    form.appendChild(e)

    const p = document.createElement("input")
    p.name = "password"
    p.value = password
    form.appendChild(p)

    document.body.appendChild(form)
    form.submit()
    return true
  }

  async function logout() {
    await fetch("/auth/api/logout", { method: "POST" })
    router.push("/auth/login")
    router.refresh()
  }

  return { login, register, logout, loading, error }
}