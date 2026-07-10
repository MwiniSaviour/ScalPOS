"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function useAuth() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function login(email: string, password: string) {
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return false
    }

    router.push("/dashboard")
    router.refresh()
    return true
  }

  async function register(email: string, password: string, name: string) {
    setLoading(true)
    setError(null)

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return false
    }

    if (data.user) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        name,
        email,
        role: "employee",
      })
    }

    router.push("/dashboard")
    router.refresh()
    return true
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  return { login, register, logout, loading, error }
}
