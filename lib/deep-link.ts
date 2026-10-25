"use client";

import { Capacitor } from "@capacitor/core";

/**
 * OAuth round-trips through the system browser and returns via the
 * `novapos://` deep-link scheme (registered in AndroidManifest). Clerk needs
 * the callback params in the webview URL to finish sign-in, so an incoming
 * link is rewritten onto the same-document callback route before
 * <AuthenticateWithRedirectCallback /> runs.
 */

export const OAUTH_CALLBACK_QUERY_PREFIX = "/auth/callback?";

export function readCallbackQuery(deepLinkUrl: string): string | null {
  try {
    const u = new URL(deepLinkUrl);
    if (!/^novapos:$/i.test(u.protocol)) return null;
    const qs = u.search;
    if (qs && qs.length > 1) return qs.slice(1);
    const hash = u.hash;
    if (hash && hash.length > 1) return hash.slice(1);
    return null;
  } catch {
    return null;
  }
}

/** Rewrites the webview URL (history + state) to a canonical SPA route. */
export function rewriteLocation(pathWithQuery: string): void {
  const target = new URL(pathWithQuery, window.location.origin);
  window.history.replaceState(null, "", target.pathname + target.search);
}

export async function initDeepLinking(): Promise<{
  unregister: () => void;
} | null> {
  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("App")) return null;
  const mod = await import("@capacitor/app");
  const handle = await mod.App.addListener("appUrlOpen", (event: { url: string }) => {
    const qs = readCallbackQuery(event.url);
    if (!qs) return;
    rewriteLocation(`/auth/callback?${qs}`);
    window.location.reload();
  });
  return {
    unregister: () => {
      void handle.remove();
    },
  };
}
