import { cn } from "@/lib/ui";
import type { BusinessType } from "@/lib/types";
import {
  Pill,
  Scissors,
  Store,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

export const BUSINESS_TYPE_OPTIONS: Array<{
  value: BusinessType;
  label: string;
  example: string;
  icon: LucideIcon;
}> = [
  { value: "retail", label: "Retail", example: "Sell goods over the counter", icon: Store },
  {
    value: "pharmacy",
    label: "Pharmacy",
    example: "Sell medicines in packs and strips",
    icon: Pill,
  },
  {
    value: "restaurant",
    label: "Restaurant",
    example: "Serve food and drinks at tables",
    icon: UtensilsCrossed,
  },
  {
    value: "salon",
    label: "Salon",
    example: "Book appointments and services",
    icon: Scissors,
  },
];

export function businessTypeLabel(value: BusinessType): string {
  return BUSINESS_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? "Retail";
}

export function BusinessTypePicker({
  value,
  onChange,
  className,
}: {
  value: BusinessType;
  onChange: (value: BusinessType) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Business type"
      className={cn("grid grid-cols-2 gap-2.5", className)}
    >
      {BUSINESS_TYPE_OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "press flex min-h-[108px] flex-col items-start gap-2 rounded-xl border p-3 text-left",
              active ? "border-accent bg-accent/10" : "border-line2 bg-surface2",
            )}
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full",
                active ? "bg-accent/15 text-accent" : "bg-surface3 text-ink2",
              )}
            >
              <Icon className="size-[18px]" />
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-[15px] font-semibold text-ink">{option.label}</span>
              {option.value === "retail" && (
                <span className="rounded-full bg-surface3 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[.06em] text-ink3">
                  Default
                </span>
              )}
            </span>
            <span className="text-[12px] leading-4 text-ink3">{option.example}</span>
          </button>
        );
      })}
    </div>
  );
}
