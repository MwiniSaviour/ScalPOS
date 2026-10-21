/** Whole calendar days between two moments (today = 0, yesterday = 1). */
export function dayGap(t: number, now: number): number {
  return Math.round((startOfDay(now) - startOfDay(t)) / 86400000);
}

/**
 * Relative time for recent-activity lists: "just now", "12 min ago",
 * "2 hours ago", "Yesterday", "3 days ago", then the date itself once it is
 * more than a week old. With no clock yet (server render, first paint) it
 * falls back to the clock time, which is always correct.
 */
export function timeAgo(t: number, now = Date.now()): string {
  if (!(now > 0)) return timeOf(t);
  const diff = now - t;
  if (diff < 60_000) return "just now";
  const m = Math.floor(diff / 60_000);
  if (m < 60) return m === 1 ? "1 min ago" : `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24 && isSameDay(t, now)) return h === 1 ? "1 hour ago" : `${h} hours ago`;
  const d = dayGap(t, now);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  return dateShort(t);
}

export function dateLong(t: number): string {
  return new Date(t).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

export function dateShort(t: number): string {
  const d = new Date(t);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function dateTime(t: number): string {
  const d = new Date(t);
  return `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`;
}

export function timeOf(t: number): string {
  return new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function isSameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
  );
}

export function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addDays(t: number, n: number): number {
  return t + n * 86400000;
}

export function greeting(nowTs: number): string {
  const h = new Date(nowTs).getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function pctDelta(pct: number): { text: string; up: boolean; flat: boolean } {
  const up = pct >= 0;
  const flat = pct === 0;
  return {
    text: `${up ? "+" : ""}${pct.toFixed(0)}%`,
    up,
    flat,
  };
}

// tiny local id generator (no extra deps, offline-safe)
export function id(prefix = ""): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function orderId(nextNo: number, now = Date.now()): string {
  const d = new Date(now);
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `ORD-${ymd}-${String(nextNo).padStart(4, "0")}`;
}

