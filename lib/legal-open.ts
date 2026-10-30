"use client";

import { Capacitor } from "@capacitor/core";

export type LegalDocParam = "terms" | "privacy" | "refunds";

/** Hosted legal page on the marketing site — the app no longer bundles the
 *  full legal text on device. Web builds navigate to the route directly. */
export const LEGAL_URL = "https://pos.scalmint.com/legal";

/**
 * Opens the legal docs on the marketing page. Native uses the system browser
 * (@capacitor/browser); web falls back to an in-app route (same bundle).
 * Returns true when handled in-app (web), so callers keep their <Link>.
 */
export async function openLegal(doc?: LegalDocParam): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  const url = doc ? `${LEGAL_URL}?doc=${doc}` : LEGAL_URL;
  try {
    const mod = await import("@capacitor/browser");
    await mod.Browser.open({ url });
  } catch {
    /* browser plugin missing — fall back to the in-app route */
    return true;
  }
  return false;
}
