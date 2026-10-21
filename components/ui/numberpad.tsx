"use client";

import { cn } from "@/lib/ui";
import type { ReactNode } from "react";

/** cash keypad — delete key clears; big tabular display up top is parent's job */
export function NumberPad({
  onDigit,
  onDelete,
  children,
  className,
}: {
  onDigit: (d: string) => void;
  onDelete: () => void;
  children?: ReactNode;
  className?: string;
}) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"];
  return (
    <div className={cn("grid grid-cols-3 gap-1.5", className)}>
      {keys.map((k) => (
        <button
          key={k}
          onClick={() => onDigit(k)}
          className="press tabnum flex h-12 items-center justify-center rounded-xl border border-line/60 bg-surface2 text-[18px] font-semibold text-ink hover:bg-surface3"
        >
          {k}
        </button>
      ))}
      <button
        onClick={onDelete}
        className="press flex items-center justify-center rounded-xl bg-surface2 text-ink2 hover:bg-surface3"
        aria-label="Backspace"
      >
        <IconBack />
      </button>
      {children}
    </div>
  );
}

function IconBack() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 5H9a2 2 0 0 0-1.7 1L4 12l3.3 6A2 2 0 0 0 9 19h11a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Z" />
      <path d="m18 9-6 6M12 9l6 6" />
    </svg>
  );
}
