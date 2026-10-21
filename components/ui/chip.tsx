"use client";

import { cn } from "@/lib/ui";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Chip({
  active = false,
  color,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  color?: string; // optional brand tint when active
  children: ReactNode;
}) {
  return (
    <button
      className={cn(
        "press h-11 shrink-0 inline-flex items-center gap-1.5 rounded-full border px-4 text-[13px] font-medium",
        active
          ? "border-transparent bg-accent/15 text-accent"
          : "border-line2 bg-surface text-ink2 hover:text-ink hover:bg-surface2",
        className,
      )}
      style={active && color ? { background: color + "22", color } : undefined}
      {...rest}
    >
      {children}
    </button>
  );
}
