"use client";

import { cn } from "@/lib/ui";
import { Check, ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Sheet } from "@/components/ui/sheet";

export function Select({
  label,
  hint,
  options,
  value,
  onChange,
  disabled,
  className,
  leading,
}: {
  label?: string;
  hint?: string;
  options: { value: string; label: string; color?: string }[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  leading?: ReactNode;
}) {
  const autoId = useId();
  const id = useId();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const hintId = `${autoId}-hint`;

  return (
    <div className={className}>
      {label && (
        <span id={autoId} className="mb-1.5 block text-[13px] font-medium text-ink2">
          {label}
        </span>
      )}
      <button
        type="button"
        id={id}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={label ? `${autoId} ${id}` : undefined}
        aria-describedby={hint ? hintId : undefined}
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          "press flex h-12 w-full items-center gap-2.5 rounded-xl border border-line2 bg-surface2 px-3.5 text-left text-[15px] text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          disabled && "opacity-60",
        )}
      >
        {leading}
        <span className={cn("min-w-0 flex-1 truncate", !selected && "text-ink3")}>
          {selected?.label ?? "Select"}
        </span>
        <ChevronDown className="size-[17px] shrink-0 text-ink3" />
      </button>
      {hint && (
        <p id={hintId} className="mt-1 text-[12px] text-ink3">
          {hint}
        </p>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title={label} height="tall">
        <div className="space-y-1.5 pb-4">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                "press flex min-h-12 w-full items-center gap-3 rounded-xl px-3.5 py-2 text-left text-[15px]",
                option.value === value ? "bg-accentsoft text-accent" : "bg-surface2 text-ink",
              )}
            >
              {option.color && (
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: option.color }}
                />
              )}
              <span className="min-w-0 flex-1 truncate font-medium">{option.label}</span>
              {option.value === value && <Check className="size-[18px] shrink-0" />}
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
