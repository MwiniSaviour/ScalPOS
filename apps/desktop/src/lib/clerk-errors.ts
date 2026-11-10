export function clerkCode(error: unknown): string | null {
  if (
    error &&
    typeof error === "object" &&
    "errors" in error &&
    Array.isArray((error as { errors: unknown[] }).errors)
  ) {
    const first = (error as { errors: { code?: unknown }[] }).errors[0]
    if (first && typeof first.code === "string") return first.code
  }
  return null
}

export function clerkMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "errors" in error &&
    Array.isArray((error as { errors: unknown[] }).errors)
  ) {
    const first = (error as { errors: { message?: unknown }[] }).errors[0]
    if (first && typeof first.message === "string") return first.message
  }
  return error instanceof Error ? error.message : String(error)
}

const FRIENDLY: Record<string, string> = {
  form_identifier_not_found: "No account found for that email. Create one instead.",
  form_identifier_exists: "That email already has an account. Sign in instead.",
  form_password_incorrect: "Incorrect password. Try again or reset it.",
  form_password_length_too_short: "Password must be at least 8 characters.",
  form_password_pwned: "That password has appeared in a breach. Choose a different one.",
  form_code_incorrect: "That code is incorrect. Check the email and try again.",
  verification_expired: "That code expired. Send a new one.",
  form_param_format_invalid: "Check the email address and try again.",
}

export function friendlyClerkError(error: unknown): string {
  const code = clerkCode(error)
  if (code && FRIENDLY[code]) return FRIENDLY[code]
  return clerkMessage(error) || "Something went wrong. Try again."
}
