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
  { hex: "#34d399", name: "Green" },
  { hex: "#4c8dff", name: "Blue" },
  { hex: "#a78bfa", name: "Violet" },
  { hex: "#f5a524", name: "Amber" },
  { hex: "#f4586e", name: "Rose" },
  { hex: "#f6c453", name: "Gold" },
  { hex: "#14b8a6", name: "Teal" },
  { hex: "#06b6d4", name: "Cyan" },
  { hex: "#6366f1", name: "Indigo" },
  { hex: "#f97316", name: "Orange" },
  { hex: "#ec4899", name: "Pink" },
  { hex: "#84cc16", name: "Lime" },
  { hex: "#0ea5e9", name: "Sky" },
  { hex: "#c026d3", name: "Fuchsia" },
  { hex: "#ef4444", name: "Red" },
  { hex: "#eab308", name: "Yellow" },
  { hex: "#8d6e63", name: "Cocoa" },
  { hex: "#94a3b8", name: "Slate" },
  { hex: "#b0668f", name: "Mauve" },
  { hex: "#94b394", name: "Sage" },
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
  // teal
  "#14b8a6": { c: "var(--hue-teal)", s: "var(--hue-teal)-soft" },
  "#2dd4bf": { c: "var(--hue-teal)", s: "var(--hue-teal)-soft" },
  "#0d9488": { c: "var(--hue-teal)", s: "var(--hue-teal)-soft" },
  "#0f766e": { c: "var(--hue-teal)", s: "var(--hue-teal)-soft" },
  // cyan
  "#06b6d4": { c: "var(--hue-cyan)", s: "var(--hue-cyan)-soft" },
  "#22d3ee": { c: "var(--hue-cyan)", s: "var(--hue-cyan)-soft" },
  "#0891b2": { c: "var(--hue-cyan)", s: "var(--hue-cyan)-soft" },
  "#67e8f9": { c: "var(--hue-cyan)", s: "var(--hue-cyan)-soft" },
  // indigo
  "#6366f1": { c: "var(--hue-indigo)", s: "var(--hue-indigo)-soft" },
  "#818cf8": { c: "var(--hue-indigo)", s: "var(--hue-indigo)-soft" },
  "#4f46e5": { c: "var(--hue-indigo)", s: "var(--hue-indigo)-soft" },
  "#4338ca": { c: "var(--hue-indigo)", s: "var(--hue-indigo)-soft" },
  // orange
  "#f97316": { c: "var(--hue-orange)", s: "var(--hue-orange)-soft" },
  "#fb923c": { c: "var(--hue-orange)", s: "var(--hue-orange)-soft" },
  "#ea580c": { c: "var(--hue-orange)", s: "var(--hue-orange)-soft" },
  "#c2410c": { c: "var(--hue-orange)", s: "var(--hue-orange)-soft" },
  // pink
  "#ec4899": { c: "var(--hue-pink)", s: "var(--hue-pink)-soft" },
  "#f472b6": { c: "var(--hue-pink)", s: "var(--hue-pink)-soft" },
  "#be185d": { c: "var(--hue-pink)", s: "var(--hue-pink)-soft" },
  // lime
  "#84cc16": { c: "var(--hue-lime)", s: "var(--hue-lime)-soft" },
  "#a3e635": { c: "var(--hue-lime)", s: "var(--hue-lime)-soft" },
  "#4d7c0f": { c: "var(--hue-lime)", s: "var(--hue-lime)-soft" },
  "#3f6212": { c: "var(--hue-lime)", s: "var(--hue-lime)-soft" },
  // sky
  "#0ea5e9": { c: "var(--hue-sky)", s: "var(--hue-sky)-soft" },
  "#7dd3fc": { c: "var(--hue-sky)", s: "var(--hue-sky)-soft" },
  "#0369a1": { c: "var(--hue-sky)", s: "var(--hue-sky)-soft" },
  // fuchsia
  "#c026d3": { c: "var(--hue-fuchsia)", s: "var(--hue-fuchsia)-soft" },
  "#e879f9": { c: "var(--hue-fuchsia)", s: "var(--hue-fuchsia)-soft" },
  "#a21caf": { c: "var(--hue-fuchsia)", s: "var(--hue-fuchsia)-soft" },
  // red
  "#ef4444": { c: "var(--hue-red)", s: "var(--hue-red)-soft" },
  "#f87171": { c: "var(--hue-red)", s: "var(--hue-red)-soft" },
  "#b91c1c": { c: "var(--hue-red)", s: "var(--hue-red)-soft" },
  // yellow
  "#eab308": { c: "var(--hue-yellow)", s: "var(--hue-yellow)-soft" },
  "#facc15": { c: "var(--hue-yellow)", s: "var(--hue-yellow)-soft" },
  "#a16207": { c: "var(--hue-yellow)", s: "var(--hue-yellow)-soft" },
  // cocoa
  "#8d6e63": { c: "var(--hue-cocoa)", s: "var(--hue-cocoa)-soft" },
  "#c98f5b": { c: "var(--hue-cocoa)", s: "var(--hue-cocoa)-soft" },
  "#7c4a1e": { c: "var(--hue-cocoa)", s: "var(--hue-cocoa)-soft" },
  // slate
  "#94a3b8": { c: "var(--hue-slate)", s: "var(--hue-slate)-soft" },
  "#64748b": { c: "var(--hue-slate)", s: "var(--hue-slate)-soft" },
  "#475569": { c: "var(--hue-slate)", s: "var(--hue-slate)-soft" },
  // mauve
  "#b0668f": { c: "var(--hue-mauve)", s: "var(--hue-mauve)-soft" },
  "#d68fb7": { c: "var(--hue-mauve)", s: "var(--hue-mauve)-soft" },
  "#93365f": { c: "var(--hue-mauve)", s: "var(--hue-mauve)-soft" },
  // sage
  "#94b394": { c: "var(--hue-sage)", s: "var(--hue-sage)-soft" },
  "#a7c4a9": { c: "var(--hue-sage)", s: "var(--hue-sage)-soft" },
  "#4d6b50": { c: "var(--hue-sage)", s: "var(--hue-sage)-soft" },
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

