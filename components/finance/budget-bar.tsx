import { cn } from "@/lib/ui";

export function BudgetBar({
  spent,
  budget,
  className,
}: {
  spent: number;
  budget: number;
  className?: string;
}) {
  const ratio = budget > 0 ? spent / budget : 0;
  const width = Math.min(100, Math.max(0, ratio * 100));
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-surface3", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-[width]",
          ratio > 1 ? "bg-danger" : ratio >= 0.8 ? "bg-warn" : "bg-accent",
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
