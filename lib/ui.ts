export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* One small semantic palette. Colour only ever carries meaning:
   settled · needs attention · money owed · nothing to do — plus a quiet
   label for rows that are already settled. */
export const toneClasses = {
  ok: "text-accent bg-accent/10",
  warn: "text-warn bg-warn/10",
  danger: "text-danger bg-danger/10",
  neutral: "text-ink2 bg-ink2/10",
  quiet: "bg-surface2 text-ink2",
} as const;

export type Tone = keyof typeof toneClasses;

/* Avatars carry no per-person colour: a hue hashed from a name means
   nothing in a POS and reads as decoration. One quiet well for everyone. */
export const AVATAR_WELL = "bg-surface2 text-ink2";

export function avatarColor(): string {
  return AVATAR_WELL;
}

/** shared token palette for category swatches — legible on both themes */
export const TOKEN_COLORS = [
  { hex: "#059669", name: "Green" },
  { hex: "#2563eb", name: "Blue" },
  { hex: "#7c3aed", name: "Violet" },
  { hex: "#d97706", name: "Amber" },
  { hex: "#e11d48", name: "Rose" },
  { hex: "#b45309", name: "Gold" },
] as const;

/**
 * Categories store a plain hex, but the same hex cannot be legible on a white
 * page and on a near-black one. Every known palette hex is therefore mapped to
 * a CSS variable that resolves to the right step for the active theme — no
 * migration, no persisted change, and a colour the user picked survives.
 */
const HUE_VARS: Record<string, { c: string; s: string }> = {
  // green
  "#10b981": { c: "var(--hue-green)", s: "var(--hue-green)-soft" },
  "#34d399": { c: "var(--hue-green)", s: "var(--hue-green)-soft" },
  "#059669": { c: "var(--hue-green)", s: "var(--hue-green)-soft" },
  "#047857": { c: "var(--hue-green)", s: "var(--hue-green)-soft" },
  "#065f46": { c: "var(--hue-green)", s: "var(--hue-green)-soft" },
  // blue
  "#4c8dff": { c: "var(--hue-blue)", s: "var(--hue-blue)-soft" },
  "#3b82f6": { c: "var(--hue-blue)", s: "var(--hue-blue)-soft" },
  "#2563eb": { c: "var(--hue-blue)", s: "var(--hue-blue)-soft" },
  "#1d4ed8": { c: "var(--hue-blue)", s: "var(--hue-blue)-soft" },
  // violet
  "#8b7cf7": { c: "var(--hue-violet)", s: "var(--hue-violet)-soft" },
  "#a78bfa": { c: "var(--hue-violet)", s: "var(--hue-violet)-soft" },
  "#7c3aed": { c: "var(--hue-violet)", s: "var(--hue-violet)-soft" },
  "#6d28d9": { c: "var(--hue-violet)", s: "var(--hue-violet)-soft" },
  // amber
  "#f5a524": { c: "var(--hue-amber)", s: "var(--hue-amber)-soft" },
  "#d97706": { c: "var(--hue-amber)", s: "var(--hue-amber)-soft" },
  "#9a3412": { c: "var(--hue-amber)", s: "var(--hue-amber)-soft" },
  // rose
  "#f4586e": { c: "var(--hue-rose)", s: "var(--hue-rose)-soft" },
  "#e11d48": { c: "var(--hue-rose)", s: "var(--hue-rose)-soft" },
  "#be123c": { c: "var(--hue-rose)", s: "var(--hue-rose)-soft" },
  // gold
  "#f6c453": { c: "var(--hue-gold)", s: "var(--hue-gold)-soft" },
  "#b45309": { c: "var(--hue-gold)", s: "var(--hue-gold)-soft" },
  "#946200": { c: "var(--hue-gold)", s: "var(--hue-gold)-soft" },
  "#8a5a00": { c: "var(--hue-gold)", s: "var(--hue-gold)-soft" },
};

/** The colour a category should paint with on the current theme. */
export function hueColor(hex: string | undefined | null): string {
  if (!hex) return "var(--ink3)";
  return HUE_VARS[hex.toLowerCase()]?.c ?? hex;
}

/** The soft (tinted) fill that goes behind that colour. */
export function hueSoft(hex: string | undefined | null): string {
  if (!hex) return "var(--surface2)";
  return HUE_VARS[hex.toLowerCase()]?.s ?? "var(--surface2)";
}

