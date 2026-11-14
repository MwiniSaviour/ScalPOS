const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

export type ProvisionError =
  | "invalid_email"
  | "password_policy"
  | "terms_required"
  | "rate_limited"
  | "weak_password"
  | "not_configured"
  | "service_unavailable"
  | "network"

const MESSAGES: Record<ProvisionError, string> = {
  invalid_email: "Enter a valid email address.",
  password_policy: "Your password does not meet the password policy.",
  terms_required: "Please agree to the Terms and Privacy Policy to create your account.",
  rate_limited: "Too many attempts from this network. Wait a few minutes and try again.",
  weak_password:
    "That password is too common or has appeared in a data breach. Choose a different one.",
  not_configured: "Account creation is temporarily unavailable. Try again in a moment.",
  service_unavailable: "Account creation is temporarily unavailable. Try again in a moment.",
  network: "You appear to be offline. Check your connection and try again.",
}

export function provisionMessage(error: ProvisionError): string {
  return MESSAGES[error] ?? MESSAGES.service_unavailable
}

// Clerk's client-side sign-up never converts this instance's attempts into a
// user, so the account is created server-side and the client signs in with an
// email code afterwards. See backend/supabase/functions/provision-user.
export async function provisionAccount(input: {
  email: string
  password: string
  fullName: string
}): Promise<{ ok: true } | { ok: false; error: ProvisionError }> {
  if (!supabaseUrl || !supabaseKey) {
    return { ok: false, error: "not_configured" }
  }
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/provision-user`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        full_name: input.fullName,
        accept_terms: true,
      }),
      signal: AbortSignal.timeout(20_000),
    })
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
    if (res.ok && body.ok) return { ok: true }
    return { ok: false, error: (body.error as ProvisionError) || "service_unavailable" }
  } catch {
    return { ok: false, error: "network" }
  }
}
