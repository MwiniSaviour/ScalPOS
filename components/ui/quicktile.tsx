"use client";

import { cn } from "@/lib/ui";
import type { ReactNode } from "react";

const TONES = {
  accent: "bg-accent/12 text-accent",
  info: "bg-info/12 text-info",
  warn: "bg-warn/12 text-warn",
  violet: "bg-violet/12 text-violet",
  danger: "bg-danger/12 text-danger",
} as const;

export type QuickTileTone = keyof typeof TONES;

/** Compact icon tile + centred label — the quick-action pattern used on Home and More. */
export function QuickTile({
  icon,
  label,
  onClick,
  tone = "accent",
  className,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  tone?: QuickTileTone;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn("press flex min-w-0 flex-1 flex-col items-center gap-2", className)}
    >
      <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-[18px]", TONES[tone])}>
        {icon}
      </span>
      <span className="w-full text-center text-[12px] font-medium leading-tight text-ink2">
        {label}
      </span>
    </button>
  );
}
