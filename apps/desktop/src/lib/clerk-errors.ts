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
  identifier_not_found: "No account found for that email. Create one instead.",
  form_identifier_exists: "That email already has an account. Sign in instead.",
  form_password_incorrect: "Incorrect password. Try again or reset it.",
  // No password-length override: Clerk's own message ("Passwords must be at
  // least 15 characters or more.") reflects the instance policy, which our
  // static text got wrong.
  form_param_unknown: "We couldn't complete that. Please check the form and try again.",
  form_password_pwned: "That password has appeared in a breach. Choose a different one.",
  form_code_incorrect: "That code is incorrect. Check the email and try again.",
  verification_expired: "That code expired. Send a new one.",
  verification_already_verified: "That code was already used. Send a new one.",
  session_exists: "You're already signed in.",
  form_param_format_invalid: "Check the email address and try again.",
  form_email_address_invalid: "Check the email address and try again.",
  network_failure: "Network problem. Check your connection and try again.",
}

// Clerk internals ("is unknow", internal_error) must never reach the user —
// they read as gibberish and blame the customer for a server hiccup.
const OPAQUE_PATTERN = /is unknow|unknown error|internal_error|unexpected_error/i

function looksOpaque(message: string): boolean {
  if (!message) return true
  return OPAQUE_PATTERN.test(message)
}

export function friendlyClerkError(error: unknown): string {
  const code = clerkCode(error)
  if (code && FRIENDLY[code]) return FRIENDLY[code]
  const message = clerkMessage(error)
  if (looksOpaque(message)) {
    return "Something went wrong on our side. Please try again in a moment."
  }
  return message
}

export function friendlyNetworkError(error: unknown): string {
  if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
    return "You appear to be offline. Check your connection and try again."
  }
  return friendlyClerkError(error)
}
