import { cn } from "@/lib/ui";
import type { ReactNode } from "react";

export function Card({
  children,
  className,
  inset = false,
}: {
  children: ReactNode;
  className?: string;
  inset?: boolean; // true = list-row section card (no padding, dividers)
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-surface border border-line2 overflow-hidden",
        inset && "divide-y divide-line",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-1">
      <h3 className="text-[15px] font-semibold text-ink">{children}</h3>
      {right}
    </div>
  );
}

