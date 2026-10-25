"use client";

import { Capacitor } from "@capacitor/core";

/**
 * Chooses the OAuth return targets for the current runtime. Native completes
 * inside the webview via the `novapos://` deep link; web builds complete on
 * the site itself.
 */
export function oauthRedirectTargets(): { redirectUrl: string; redirectUrlComplete: string } {
  if (Capacitor.isNativePlatform()) {
    return { redirectUrl: "novapos://auth/callback", redirectUrlComplete: "/connect" };
  }
  return {
    redirectUrl: "https://pos.scalmint.com/auth/callback",
    redirectUrlComplete: "https://pos.scalmint.com/connect",
  };
}
