"use client"

import { useClerk } from "@clerk/clerk-react"

type ClerkEnvironmentShape = {
  userSettings?: {
    passwordSettings?: { min_length?: number }
    attributes?: {
      first_name?: { enabled?: boolean }
      last_name?: { enabled?: boolean }
    }
  }
}

// This @clerk/clerk-react version does not export useEnvironment and hides
// `environment` from the public Clerk type, but the instance is present at
// runtime. Auth screens read the live password policy and name attributes so
// they always match the Clerk instance instead of hardcoded assumptions.
export function useSignUpPolicy() {
  const clerk = useClerk()
  const environment = (clerk as unknown as { environment?: ClerkEnvironmentShape }).environment
  return {
    minPassword: environment?.userSettings?.passwordSettings?.min_length ?? 15,
    collectsNames: Boolean(
      environment?.userSettings?.attributes?.first_name?.enabled ||
        environment?.userSettings?.attributes?.last_name?.enabled,
    ),
  }
}
