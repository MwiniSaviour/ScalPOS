import { cn } from "@/lib/ui";
import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  hint,
  action,
  className,
  framed = true,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
  /**
   * Draw the 1px frame around the icon tile. Turn it off when the screen
   * already frames the empty state, so the icon never ends up boxed in a box.
   */
  framed?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center px-8 py-14 text-center", className)}>
      <div
        className={cn(
          "mb-4 flex size-16 items-center justify-center rounded-2xl text-ink3",
          framed ? "border border-line bg-surface2" : "bg-surface2",
        )}
      >
        {icon}
      </div>
      <div className="text-[16px] font-semibold text-ink">{title}</div>
      {hint && <p className="mt-1 max-w-[260px] text-[13px] leading-5 text-ink3">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
