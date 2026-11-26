import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ChevronRight } from "lucide-react";
import { cn, hueColor, hueSoft } from "@/lib/ui";
import { FINANCE_METHOD_LABELS } from "@/lib/finance";
import { fmtMoney } from "@/lib/money";
import { timeAgo } from "@/lib/format";
import type { FinanceCategory, FinanceEntry } from "@/lib/types";

export function FinanceEntryRow({
  entry,
  category,
  now,
}: {
  entry: FinanceEntry;
  category?: FinanceCategory | null;
  now: number;
}) {
  const funds = entry.kind === "funds";
  const title = funds ? entry.source || "Funds in" : category?.name ?? "Uncategorised";
  const detail = [entry.note, FINANCE_METHOD_LABELS[entry.method], timeAgo(entry.t, now)]
    .filter(Boolean)
    .join(" · ");
  const href = funds ? `/funds?id=${entry.id}` : `/expense?id=${entry.id}`;
  const Icon = funds ? ArrowDownLeft : ArrowUpRight;
  return (
    <Link
      href={href}
      className="press flex items-center gap-3 px-4 py-3.5 hover:bg-surface2/50"
    >
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-full"
        style={{
          background: funds ? "var(--accentsoft)" : hueSoft(category?.color),
          color: funds ? "var(--accent)" : hueColor(category?.color),
        }}
      >
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[17px] font-semibold leading-tight text-ink">
          {title}
        </span>
        <span className="mt-1 block truncate text-[14px] text-ink3">{detail}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <span
          className={cn(
            "tabnum text-[17px] font-bold",
            funds ? "text-accent" : "text-ink",
          )}
        >
          {funds ? "+" : "−"}
          {fmtMoney(entry.amount)}
        </span>
        <ChevronRight className="size-4 text-ink3" />
      </span>
    </Link>
  );
}
