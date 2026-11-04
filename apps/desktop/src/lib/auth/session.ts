type Provider = () => Promise<string | null>

let provider: Provider | null = null
let lastToken: string | null = null
let fetchedAt = 0

export function registerTokenProvider(fn: Provider | null) {
  provider = fn
  if (!fn) {
    lastToken = null
    fetchedAt = 0
  }
}

export async function freshToken(force = false): Promise<string | null> {
  const now = Date.now()
  if (!force && lastToken && now - fetchedAt < 25_000) return lastToken
  const token = await provider?.()
  if (token) {
    lastToken = token
    fetchedAt = now
    return token
  }
  lastToken = null
  return null
}

export function cachedToken(): string | null {
  return lastToken
}
