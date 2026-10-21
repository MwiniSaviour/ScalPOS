"use client";

import { cn } from "@/lib/ui";
import { Search } from "lucide-react";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { forwardRef, useId } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  error?: string;
  money?: boolean; // ₵ prefix, tabular numbers
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, leading, trailing, error, money, className, ...rest },
  ref,
) {
  const autoId = useId();
  const id = rest.id ?? autoId;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-ink2">
          {label}
        </label>
      )}
      <div
        className={cn(
          "flex h-12 items-center gap-2.5 rounded-xl border bg-surface2 px-3.5 transition-colors",
          error ? "border-danger/50" : "border-line2 focus-within:border-accent/60",
        )}
      >
        {leading}
        <input
          ref={ref}
          id={id}
          className={cn(
            "h-full w-full bg-transparent text-[15px] text-ink outline-none",
            money && "tabnum font-semibold",
          )}
          {...rest}
        />
        {trailing}
      </div>
      {hint && <p className="mt-1 text-[12px] text-ink3">{hint}</p>}
      {error && (
        <p className={cn("text-[12px] text-danger", hint && "mt-0.5")}>{error}</p>
      )}
    </div>
  );
});

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string; error?: string }
>(
  function TextArea({ label, hint, error, className, style, ...rest }, ref) {
    const autoId = useId();
    return (
      <div className={className}>
        {label && (
          <label htmlFor={autoId} className="mb-1.5 block text-[13px] font-medium text-ink2">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={autoId}
          className="min-h-[96px] w-full rounded-xl border border-line2 bg-surface2 px-3.5 py-3 text-[15px] outline-none transition-colors focus:border-accent/60"
          style={style}
          {...rest}
        />
        {hint && !error && <p className="mt-1 text-[12px] text-ink3">{hint}</p>}
        {error && <p className="mt-1 text-[12px] text-danger">{error}</p>}
      </div>
    );
  },
);

/** in-flow search input */
export function SearchBar({
  value,
  onChange,
  placeholder,
  onOpenScanner,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onOpenScanner?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex h-12 items-center gap-2.5 rounded-2xl border border-line2 bg-surface px-3.5 transition-colors focus-within:border-accent/60", className)}>
      <Search className="size-[18px] shrink-0 text-ink3" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-full w-full bg-transparent text-[15px] outline-none"
      />
      {onOpenScanner && (
        <button aria-label="Scan barcode" onClick={onOpenScanner} className="press -mr-2 rounded-xl p-2.5 text-ink2 hover:bg-surface2">
          <ScanIcon />
        </button>
      )}
    </div>
  );
}

function ScanIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 7V5a1 1 0 0 1 1-1h2M18 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M6 20H5a1 1 0 0 1-1-1v-2M3 12h18" />
    </svg>
  );
}
