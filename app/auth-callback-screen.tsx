"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";

/**
 * OAuth landing inside the app. Reached after Google/SSO via the
 * `novapos://auth/callback` deep link (native) or /auth/callback (web).
 */
export default function AuthCallbackScreen() {
  return (
    <div className="anim-fade flex min-h-dvh flex-col items-center justify-center px-5 text-center">
      <h1 className="text-[22px] font-semibold text-ink">Finishing sign in…</h1>
      <p className="mt-1 text-[15px] text-ink3">Returning you to your register.</p>
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
