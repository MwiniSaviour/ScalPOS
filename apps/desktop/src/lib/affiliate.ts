export const AFFILIATE_CODE_RE = /^SCAL-[A-Z0-9]{8}$/
export const AFFILIATE_PROGRAM_URL = "https://affiliate.scalmint.com/apply"
export const AFFILIATE_STORAGE_KEY = "nova-pos-affiliate-v1"
export const AFFILIATE_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const AFFILIATE_REF_EVENT = "nova-affiliate-ref"

type StoredRef = { code: string; savedAt: number }

export function normalizeAffiliateRef(input: string | null | undefined): string | null {
  const code = (input ?? "").trim().toUpperCase()
  return AFFILIATE_CODE_RE.test(code) ? code : null
}

function readStored(): StoredRef | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(AFFILIATE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredRef>
    if (typeof parsed.code !== "string" || typeof parsed.savedAt !== "number") return null
    const code = normalizeAffiliateRef(parsed.code)
    if (!code) return null
    if (Date.now() - parsed.savedAt > AFFILIATE_TTL_MS) {
      window.localStorage.removeItem(AFFILIATE_STORAGE_KEY)
      return null
    }
    return { code, savedAt: parsed.savedAt }
  } catch {
    return null
  }
}

export function readAffiliateRef(): string | null {
  return readStored()?.code ?? null
}

export function saveAffiliateRef(input: string): string | null {
  const code = normalizeAffiliateRef(input)
  if (!code || typeof window === "undefined") return null
  try {
    const value: StoredRef = { code, savedAt: Date.now() }
    window.localStorage.setItem(AFFILIATE_STORAGE_KEY, JSON.stringify(value))
    window.dispatchEvent(new CustomEvent(AFFILIATE_REF_EVENT, { detail: code }))
    return code
  } catch {
    return null
  }
}

export function clearAffiliateRef(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(AFFILIATE_STORAGE_KEY)
  } catch {
    return
  }
  window.dispatchEvent(new CustomEvent(AFFILIATE_REF_EVENT, { detail: null }))
}

export function affiliateShareUrl(code: string): string {
  const normalized = normalizeAffiliateRef(code) ?? ""
  return normalized
    ? `https://pos.scalmint.com/?ref=${encodeURIComponent(normalized)}`
    : "https://pos.scalmint.com"
}

export function openAffiliateProgram(): void {
  window.open(AFFILIATE_PROGRAM_URL, "_blank", "noopener,noreferrer")
}
