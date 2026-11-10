"use client";

/**
 * Clerk session JWTs live ~60s, so nothing may reuse conn.access_token.
 * TokenBridge (mounted inside ClerkProvider) registers the Clerk getToken
 * hook here; non-React callers (outbox drain, realtime) read fresh tokens
 * through freshToken().
 */

type Provider = () => Promise<string | null>;
type TokenListener = (token: string) => void;

let provider: Provider | null = null;
let lastToken: string | null = null;
let fetchedAt = 0;
const listeners = new Set<TokenListener>();

function publish(token: string) {
  lastToken = token;
  fetchedAt = Date.now();
  for (const cb of [...listeners]) {
    try {
      cb(token);
    } catch {
      /* listener must not break token flow */
    }
  }
}

export function registerTokenProvider(fn: Provider | null) {
  provider = fn;
  if (!fn) {
    lastToken = null;
    return;
  }
  void (async () => {
    try {
      const t = await fn();
      if (t) publish(t);
    } catch {
      /* Clerk may not be ready yet; freshToken() retries later */
    }
  })();
}

export async function freshToken(force = false): Promise<string | null> {
  const now = Date.now();
  if (!force && lastToken && now - fetchedAt < 25_000) return lastToken;
  const t = await provider?.();
  if (t) {
    publish(t);
    return t;
  }
  lastToken = null;
  return null;
}

export function cachedToken(): string | null {
  return lastToken;
}

/**
 * Fires once a Clerk token exists. Returns an unsubscribe function. Callers
 * that render before TokenBridge mounts (image downloads, realtime) use this
 * instead of silently giving up when freshToken() returns null.
 */
export function onTokenReady(cb: TokenListener): () => void {
  if (lastToken) {
    try {
      cb(lastToken);
    } catch {
      /* ignored */
    }
    return () => {};
  }
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
