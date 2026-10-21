"use client";

import { usePos } from "@/lib/store";
import { cn } from "@/lib/ui";
import { Check } from "lucide-react";

export function Toaster() {
  const toasts = usePos((s) => s.toasts);
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+188px)] z-[70] flex flex-col items-center gap-2 px-4">
      {toasts.slice(-2).map((t) => (
        <div
          key={t.id}
          className={cn(
            "anim-toast flex min-h-11 max-w-full items-center gap-2 rounded-xl border border-line2 bg-surface px-4 py-2.5 text-[13px] font-medium",
            t.kind === "ok" && "text-ink",
            t.kind === "warn" && "text-warn",
            t.kind === "error" && "text-danger",
          )}
        >
          {t.kind === "ok" && <Check className="size-4 shrink-0 text-accent" strokeWidth={2.5} />}
          {t.msg}
        </div>
      ))}
    </div>
  );
}
