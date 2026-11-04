import { demoData } from "./seed";

export const DEMO_FLAG_KEY = "nova-pos-demo-v1";
const DEMO_BACKUP_KEY = "nova-pos-demo-backup-v1";
const PERSIST_KEY = "nova-pos-v1";

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DEMO_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

export function enableDemo(): void {
  if (typeof window === "undefined" || isDemoMode()) return;
  try {
    const raw = window.localStorage.getItem(PERSIST_KEY);
    window.localStorage.setItem(DEMO_BACKUP_KEY, JSON.stringify({ had: raw !== null, data: raw }));
    window.localStorage.setItem(DEMO_FLAG_KEY, "1");
    window.localStorage.setItem(PERSIST_KEY, JSON.stringify({ state: demoData(), version: 0 }));
  } catch {
    try {
      window.localStorage.removeItem(DEMO_FLAG_KEY);
    } catch {
      /* storage unavailable */
    }
    return;
  }
  window.location.reload();
}

export function exitDemo(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(DEMO_BACKUP_KEY);
    const backup = raw ? (JSON.parse(raw) as { had?: boolean; data?: string | null }) : null;
    if (backup?.had && typeof backup.data === "string") {
      window.localStorage.setItem(PERSIST_KEY, backup.data);
    } else {
      window.localStorage.removeItem(PERSIST_KEY);
    }
    window.localStorage.removeItem(DEMO_FLAG_KEY);
    window.localStorage.removeItem(DEMO_BACKUP_KEY);
  } catch {
    return;
  }
  window.location.reload();
}
