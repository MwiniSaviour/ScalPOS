"use client";

/**
 * Clerk session JWTs live ~60s, so nothing may reuse conn.access_token.
 * TokenBridge (mounted inside ClerkProvider) registers the Clerk getToken
 * hook here; non-React callers (outbox drain, realtime) read fresh tokens
 * through freshToken().
 */

type Provider = () => Promise<string | null>;

let provider: Provider | null = null;
let lastToken: string | null = null;
let fetchedAt = 0;

export function registerTokenProvider(fn: Provider | null) {
  provider = fn;
}

export async function freshToken(force = false): Promise<string | null> {
  const now = Date.now();
  if (!force && lastToken && now - fetchedAt < 25_000) return lastToken;
  const t = await provider?.();
  if (t) {
    lastToken = t;
    fetchedAt = now;
    return t;
  }
  lastToken = null;
  return null;
}

export function cachedToken(): string | null {
  return lastToken;
}
