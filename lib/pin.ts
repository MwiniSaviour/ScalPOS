import { useState, useCallback } from "react";

/**
 * Device PIN lock.
 *
 * The PIN is NEVER stored in the clear. It is hashed with a random per-shop
 * salt using Web Crypto (SHA-256) and kept in `nova-pos-pin-v1`. Verification
 * re-hashes `salt + input` and compares, so a leaked store does not reveal the
 * PIN. This is a device lock, not forensic security — it is meant to keep
 * casual eyes off the register, not to defeat an attacker with full disk
 * access.
 *
 * Web Crypto (`crypto.subtle`) is used because it is the only standard, correct
 * SHA-256 source that does not require a third-party dependency. It is exposed
 * in all modern browsers and in the Chromium WebView (a `file://` origin is a
 * trustworthy context), so no secure-context gate is needed on Android.
 */

export const PIN_KEY = "nova-pos-pin-v1";
/** Legacy key from builds that kept the unlock flag in sessionStorage. */
export const SESSION_KEY = "nova-pos-pin-unlocked";

/**
 * Unlock state is deliberately in-memory only. sessionStorage survives
 * Android WebView restores, which silently disabled the PIN on relaunch.
 * A JS process restart (app relaunch) must always re-lock.
 */
let unlockedThisSession = false;
const lockListeners = new Set<() => void>();

/** Subscribe to unlock-flag changes (used by the gate to re-render in place). */
export function subscribeLock(cb: () => void): () => void {
  lockListeners.add(cb);
  return () => {
    lockListeners.delete(cb);
  };
}

if (typeof window !== "undefined") {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* best effort */
  }
}

export interface StoredPin {
  hash: string; // sha256(salt + pin)
  salt: string; // 16 hex chars
  updatedAt: number;
}

function readStore(): StoredPin | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PIN_KEY);
    return raw ? (JSON.parse(raw) as StoredPin) : null;
  } catch {
    return null;
  }
}

function writeStore(pin: StoredPin): void {
  try {
    window.localStorage.setItem(PIN_KEY, JSON.stringify(pin));
  } catch {
    /* storage full / unavailable — best effort */
  }
}

export function clearPinStore(): void {
  try {
    window.localStorage.removeItem(PIN_KEY);
  } catch {
    /* best effort */
  }
}

/** True when a PIN hash has ever been saved on this device. */
export function hasPin(): boolean {
  return readStore() !== null;
}

function getCrypto(): Crypto | null {
  if (typeof globalThis === "undefined") return null;
  return globalThis.crypto || null;
}

/**
 * 16 hex chars chosen with the platform CSPRNG when available.
 * Falls back to a seeded PRNG when the CSPRNG is missing (non-secure context),
 * which is only a fallback for the salt's uniqueness, not for secrecy.
 */
function randomSalt(): string {
  const cryptoObj = getCrypto();
  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    const buf = new Uint8Array(16);
    cryptoObj.getRandomValues(buf);
    return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  let seed = Date.now() ^ (Math.random() * 0xffffffff);
  return Array.from({ length: 16 }, () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed >>> 0).toString(16).padStart(2, "0");
  }).join("");
}

async function sha256Hex(input: string): Promise<string> {
  const cryptoObj = getCrypto();
  const subtle = cryptoObj?.subtle;
  if (subtle && typeof subtle.digest === "function") {
    const buf = new TextEncoder().encode(input);
    const hash = await subtle.digest("SHA-256", buf);
    const bytes = new Uint8Array(hash);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  throw new Error(
    "PIN hashing requires Web Crypto (a secure context). Please use a supported browser.",
  );
}

/** Hash the PIN for storage: sha256(salt + pin). */
export async function savePin(pin: string): Promise<StoredPin> {
  const salt = randomSalt();
  const hash = await sha256Hex(salt + pin);
  const next: StoredPin = { salt, hash, updatedAt: Date.now() };
  writeStore(next);
  return next;
}

/** Verify the entered PIN against the stored hash. False if no PIN is stored. */
export async function verifyPin(input: string): Promise<boolean> {
  const store = readStore();
  if (!store) return false;
  const computed = await sha256Hex(store.salt + input);
  return computed === store.hash;
}

/**
 * True when a PIN is set and the user has NOT yet unlocked this tab.
 * Content screens should block whenever this is true.
 */
export function isContentLocked(): boolean {
  return hasPin() && !sessionUnlocked();
}

export function sessionUnlocked(): boolean {
  return unlockedThisSession;
}

export function setSessionUnlocked(enabled: boolean): void {
  if (unlockedThisSession === enabled) return;
  unlockedThisSession = enabled;
  for (const cb of lockListeners) cb();
}

/**
 * Reactive PIN lock state for a screen.
 *
 * - `unlocked`  — content is visible in this tab right now
 * - `attemptPin` — verify + unlock (async)
 * - `setPin`    — save a brand-new PIN (async)
 */
export function usePinLock() {
  const [store, setStore] = useState<StoredPin | null>(() => readStore());
  const [unlocked, setUnlockedState] = useState<boolean>(() => sessionUnlocked());

  const setUnlocked = useCallback((value: boolean) => {
    setSessionUnlocked(value);
    setUnlockedState(value);
  }, []);

  const attemptPin = useCallback(
    async (input: string): Promise<boolean> => {
      const ok = await verifyPin(input);
      if (ok) {
        setUnlocked(true);
        setSessionUnlocked(true);
        setStore(readStore());
      }
      return ok;
    },
    [setUnlocked],
  );

  const setPin = useCallback(
    async (pin: string): Promise<StoredPin | null> => {
      const next = await savePin(pin);
      if (next) setStore(next);
      return next;
    },
    [],
  );

  const clearPin = useCallback(() => {
    clearPinStore();
    setStore(null);
  }, []);

  return { store, hasPin: () => store !== null, unlocked, setUnlocked, attemptPin, setPin, clearPin };
}
