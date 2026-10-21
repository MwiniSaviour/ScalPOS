const SYMBOL = "\u20B5"; // ₵

/** Standard money line: ₵1,250.50 — always 2 decimals, comma grouping. */
export function fmtMoney(n: number): string {
  const safe = Number.isFinite(n) ? n : 0;
  const s = Math.abs(safe).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${safe < 0 ? "-" : ""}${SYMBOL}${s}`;
}

/** Whole-cedi variant for chips/badges: ₵125 or ₵125.50 */
export function fmtMoneyCompact(n: number): string {
  const safe = Number.isFinite(n) ? n : 0;
  if (Number.isInteger(safe)) return `${SYMBOL}${Math.abs(safe).toLocaleString("en-GH")}`;
  return fmtMoney(safe);
}

/** Space-constrained format for tiny widgets: ₵1.2k */
export function fmtShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 100000) return `${SYMBOL}${trimZero((n / 100000).toFixed(1))}L`;
  if (abs >= 10000) return `${SYMBOL}${trimZero((n / 1000).toFixed(0))}k`;
  if (abs >= 1000) return `${SYMBOL}${trimZero((n / 1000).toFixed(1))}k`;
  return fmtMoneyCompact(n);
}

export function fmtqty(n: number, unit?: string): string {
  const safe = Number.isFinite(n) ? n : 0;
  const q = Number.isInteger(safe) ? safe.toLocaleString("en-GH") : toFixed(safe, 2);
  return unit ? `${q} ${unit}` : q;
}

export function cashierDenominations(): number[] {
  return [1, 2, 5, 10, 20, 50, 100, 200];
}

export function parsePrice(input: string): number {
  const n = parseFloat(input.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function toFixed(n: number, d = 2): string {
  return (Number.isFinite(n) ? n : 0).toFixed(d);
}

function trimZero(s: string): string {
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

export const CURRENCY_SYMBOL = SYMBOL;
