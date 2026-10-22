"use client";

import { cn } from "@/lib/ui";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  height = "auto",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  height?: "auto" | "full" | "tall";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const heightCls =
    height === "full" ? "h-[94dvh]" : height === "tall" ? "h-[78dvh]" : "max-h-[88dvh]";

  return (
    <div className="fixed inset-0 z-50">
      <div className="anim-fade absolute inset-0 bg-[var(--scrim)]" onClick={onClose} />
      <div
        className={cn(
          "anim-sheet absolute inset-x-0 bottom-0 flex flex-col rounded-t-[28px] border-t border-line2 bg-bg2",
          heightCls,
        )}
      >
        <div className="relative px-5 pt-3">
          <div className="mx-auto h-1 w-9 rounded-full bg-ink4/50" />
          <button
            aria-label="Close sheet"
            onClick={onClose}
            className="press absolute right-2 top-0 flex size-11 items-center justify-center rounded-full text-ink3 hover:bg-surface2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="size-4" />
          </button>
        </div>
        {title && (
          <div className="pt-2 pr-14 pb-2 pl-5 text-[17px] font-semibold text-ink">{title}</div>
        )}
        <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="border-t border-line/70 bg-surface px-5 py-3.5 pb-[calc(var(--nova-sab)+14px)]">{footer}</div>}
      </div>
    </div>
  );
}
