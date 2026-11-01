"use client";

/** Device-side trial anchor. The server's org trial always wins when we have
 * a cached subscription state; this covers shops that never connect. */
export const TRIAL_MS = 7 * 24 * 60 * 60 * 1000;
const TRIAL_KEY = "nova-pos-trial-start";

export function readTrialStart(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TRIAL_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/** First call pins the trial start; later calls never move it. */
export function ensureTrialStart(now = Date.now()): number {
  const existing = readTrialStart();
  if (existing) return existing;
  try {
    window.localStorage.setItem(TRIAL_KEY, String(now));
  } catch {
    /* storage unavailable */
  }
  return now;
}

export function trialEndsAt(): number | null {
  const start = readTrialStart();
  return start ? start + TRIAL_MS : null;
}
