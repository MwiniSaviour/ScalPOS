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
