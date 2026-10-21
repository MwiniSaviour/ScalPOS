"use client";

import { cn, hueColor, hueSoft } from "@/lib/ui";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Chip({
  active = false,
  color,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  color?: string; // optional category colour when active
  children: ReactNode;
}) {
  const tint = color ? hueColor(color) : null;
  const fill = color ? hueSoft(color) : null;
  return (
    <button
      className={cn(
        "press h-11 shrink-0 inline-flex items-center gap-1.5 rounded-full border px-4 text-[13px] font-medium",
        active
          ? tint
            ? "border-transparent"
            : "border-transparent bg-accent/12 text-accent"
          : "border-line2 bg-surface text-ink2",
        className,
      )}
      style={active && tint && fill ? { background: fill, color: tint } : undefined}
      {...rest}
    >
      {children}
    </button>
  );
}
