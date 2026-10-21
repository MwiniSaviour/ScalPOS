import { cn, toneClasses, type Tone } from "@/lib/ui";

/* one consistent vocabulary, used everywhere */
export type StatusTone = Tone;

/* Eight statuses, four meanings. A settled order gets no colour at all. */
export function statusTone(status: string): { label: string; tone: Tone } {
  switch (status) {
    case "pending":
      return { label: "Pending", tone: "warn" };
    case "completed":
      return { label: "Completed", tone: "quiet" };
    case "refunded":
      return { label: "Refunded", tone: "neutral" };
    case "paid":
      return { label: "Paid", tone: "quiet" };
    case "unpaid":
      return { label: "Unpaid", tone: "danger" };
    case "partial":
      return { label: "Partial", tone: "warn" };
    case "low":
      return { label: "Low stock", tone: "warn" };
    case "out":
      return { label: "Out", tone: "neutral" };
    default:
      return { label: status, tone: "neutral" };
  }
}

export function StatusPill({ status, className, icon }: { status: string; className?: string; icon?: React.ReactNode }) {
  const { label, tone } = statusTone(status);
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold uppercase tracking-[.06em]",
        toneClasses[tone],
        className,
      )}
    >
      {icon}
      {label}
    </span>
  );
}
