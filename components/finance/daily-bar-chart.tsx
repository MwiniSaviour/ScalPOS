"use client";

import { cn } from "@/lib/ui";

export type DailyChartRow = {
  label: string | null;
  spent: number;
  funds?: number;
  today?: boolean;
};

export function DailyBarChart({
  rows,
  max,
  dual = false,
}: {
  rows: DailyChartRow[];
  max: number;
  dual?: boolean;
}) {
  return (
    <div className="mt-3">
      <div
        className="no-scrollbar overflow-x-auto overscroll-x-contain touch-pan-x"
        tabIndex={rows.length > 7 ? 0 : undefined}
        role="group"
        aria-label={dual ? "Daily spending and money in" : "Daily spending"}
      >
        <div className="min-w-max">
          <div className="flex h-28 items-end gap-1 border-b border-line pb-px">
            {rows.map((row, index) => {
              const description = `${row.label ?? "Day"}: ${fmt(row.spent)} spent${
                dual ? `, ${fmt(row.funds ?? 0)} in` : ""
              }`;
              return (
                <div
                  key={index}
                  role="img"
                  aria-label={description}
                  className="flex h-full w-9 shrink-0 flex-col justify-end"
                >
                  {dual ? (
                    <div className="flex h-full items-end justify-center gap-[2px]">
                      <Bar
                        value={row.spent}
                        max={max}
                        className={row.today ? "bg-accent" : "bg-[var(--chart-bar)]"}
                      />
                      <Bar
                        value={row.funds ?? 0}
                        max={max}
                        className={row.today ? "bg-accent" : "bg-accent/70"}
                      />
                    </div>
                  ) : (
                    <div className="mx-auto flex h-full w-6 items-end">
                      <Bar
                        value={row.spent}
                        max={max}
                        className={row.today ? "bg-accent" : "bg-[var(--chart-bar)]"}
                        wide
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-1.5 flex gap-1 text-center text-[12px] text-ink3">
            {rows.map((row, index) => (
              <span key={index} className="w-9 shrink-0 truncate">
                {row.label ?? ""}
              </span>
            ))}
          </div>
        </div>
      </div>
      {rows.length > 7 && (
        <p className="mt-2 text-[12px] text-ink3">Swipe horizontally to see every day</p>
      )}
    </div>
  );
}

function Bar({
  value,
  max,
  className,
  wide = false,
}: {
  value: number;
  max: number;
  className: string;
  wide?: boolean;
}) {
  return (
    <div className={cn("relative h-full", wide ? "w-full" : "w-1/2 max-w-3.5")}>
      <div className="absolute inset-0 rounded-[3px] bg-[var(--chart-track)]" />
      <div
        className={cn("absolute inset-x-0 bottom-0 rounded-t-[4px]", className)}
        style={{ height: value > 0 && max > 0 ? `${(value / max) * 100}%` : 0 }}
      />
    </div>
  );
}

function fmt(value: number): string {
  return `GHS ${value.toFixed(2)}`;
}
