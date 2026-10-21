"use client";

import { cn } from "@/lib/ui";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <div className={cn("flex gap-1 rounded-xl bg-surface2 p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "press h-10 flex-1 rounded-lg text-[13px] font-medium transition-colors",
            value === o.value ? "bg-surface text-ink ring-1 ring-line2" : "text-ink3",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

