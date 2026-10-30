/**
 * Single source of brand art. Uses the processed app tile from /public —
 * keep most shapes textual, no comments in screens importing it.
 */
"use client";

import { cn } from "@/lib/ui";

export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src="/brandmark.png"
      alt="ScalPOS"
      className={cn("size-12 rounded-2xl", className)}
      draggable={false}
    />
  );
}
