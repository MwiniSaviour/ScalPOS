import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { freshToken } from "@/lib/auth/session"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

let client: SupabaseClient | null = null

export function supabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseKey)
}

export function getSupabase(): SupabaseClient {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase is not configured for this build.")
  }
  if (!client) {
    client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      accessToken: async () => (await freshToken()) ?? "",
      global: {
        fetch: (input, init = {}) =>
          fetch(input, {
            ...init,
            signal: init.signal ?? AbortSignal.timeout(30_000),
          }),
      },
    })
  }
  return client
}

export async function bootstrapOrg(create = false, providedToken?: string): Promise<
  | { status: "ok"; orgId: string }
  | { status: "no_shop" }
> {
  const token = providedToken ?? (await freshToken(true))
  if (!token) throw new Error("Your session expired. Sign in again.")

  const res = await fetch(`${supabaseUrl}/functions/v1/bootstrap-org`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(create ? { action: "create" } : {}),
  })

  const json = (await res.json().catch(() => ({}))) as {
    org_id?: string
    error?: string
    detail?: string
  }
  if (res.status === 403 && json.error === "no_shop") {
    return { status: "no_shop" }
  }
  if (!res.ok || !json.org_id) {
    throw new Error(json.detail ?? json.error ?? "Could not connect to your shop.")
  }
  return { status: "ok", orgId: json.org_id }
}

export async function createDemoOrg(providedToken?: string): Promise<string> {
  const token = providedToken ?? (await freshToken(true))
  if (!token) throw new Error("Your session expired. Sign in again.")

  const res = await fetch(`${supabaseUrl}/functions/v1/bootstrap-org`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "create-demo" }),
  })

  const json = (await res.json().catch(() => ({}))) as {
    org_id?: string
    error?: string
    detail?: string
  }
  if (!res.ok || !json.org_id) {
    throw new Error(json.detail ?? json.error ?? "Failed to prepare demo workspace.")
  }
  return json.org_id
}
