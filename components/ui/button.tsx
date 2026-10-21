"use client";

import { cn } from "@/lib/ui";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-accentink font-semibold",
  secondary:
    "bg-surface2 text-ink border border-line2 hover:bg-surface3",
  ghost: "text-ink2 hover:bg-surface2 hover:text-ink",
  danger: "bg-danger/10 text-danger border border-danger/25 hover:bg-danger/15",
  soft: "bg-accent/10 text-accent hover:bg-accent/15",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-3.5 rounded-lg text-[13px] gap-1.5 inline-flex",
  md: "h-12 px-4 rounded-xl text-[15px] gap-2 inline-flex",
  lg: "h-14 px-5 rounded-2xl text-[16px] gap-2 inline-flex",
};

export function Button({
  variant = "primary",
  size = "md",
  block = false,
  loading = false,
  icon,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      className={cn(
        "press inline-flex items-center justify-center whitespace-nowrap select-none disabled:opacity-45 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        variants[variant],
        sizes[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      aria-label={label}
      className={cn(
        "press size-11 rounded-full inline-flex items-center justify-center text-ink2 hover:bg-surface2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
