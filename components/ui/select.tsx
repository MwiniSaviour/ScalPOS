"use client";

import { cn } from "@/lib/ui";
import { Check, ChevronDown, Pencil, Plus, Trash2, X } from "lucide-react";
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
  editable,
  onAddOption,
  onRenameOption,
  onDeleteOption,
}: {
  label?: string;
  hint?: string;
  options: { value: string; label: string; color?: string }[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  leading?: ReactNode;
  editable?: boolean;
  onAddOption?: (label: string) => void;
  onRenameOption?: (current: string, label: string) => void;
  onDeleteOption?: (value: string) => void;
}) {
  const autoId = useId();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const selected = options.find((option) => option.value === value);
  const hintId = `${autoId}-hint`;

  function save() {
    const clean = draft?.trim();
    if (!clean) return;
    if (editing) {
      onRenameOption?.(editing, clean);
      if (value === editing) onChange(clean);
    } else {
      onAddOption?.(clean);
      onChange(clean);
    }
    setDraft(null);
    setEditing(null);
  }

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
          {selected?.label ?? value ?? "Select"}
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
          {options.map((option) =>
            editing === option.value ? (
              <div key={option.value} className="flex items-center gap-2 rounded-xl bg-surface2 p-2">
                <input
                  autoFocus
                  value={draft ?? ""}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") save();
                    if (event.key === "Escape") {
                      setEditing(null);
                      setDraft(null);
                    }
                  }}
                  className="h-10 min-w-0 flex-1 rounded-lg border border-line2 bg-surface px-3 text-[15px] text-ink outline-none focus:border-accent/60"
                />
                <button
                  aria-label="Save source"
                  onClick={save}
                  className="press flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accentink"
                >
                  <Check className="size-[18px]" />
                </button>
                <button
                  aria-label="Cancel"
                  onClick={() => {
                    setEditing(null);
                    setDraft(null);
                  }}
                  className="press flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface text-ink2"
                >
                  <X className="size-[18px]" />
                </button>
              </div>
            ) : (
              <div
                key={option.value}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-xl px-3.5 py-2",
                  option.value === value ? "bg-accentsoft text-accent" : "bg-surface2 text-ink",
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="press flex min-w-0 flex-1 items-center gap-3 text-left"
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
                {editable && (
                  <>
                    <button
                      aria-label={`Edit ${option.label}`}
                      onClick={() => {
                        setEditing(option.value);
                        setDraft(option.label);
                      }}
                      className="press flex size-9 shrink-0 items-center justify-center rounded-lg text-ink3"
                    >
                      <Pencil className="size-[16px]" />
                    </button>
                    {options.length > 1 && onDeleteOption && (
                      <button
                        aria-label={`Delete ${option.label}`}
                        onClick={() => {
                          onDeleteOption(option.value);
                          if (value === option.value) onChange("");
                        }}
                        className="press flex size-9 shrink-0 items-center justify-center rounded-lg text-danger"
                      >
                        <Trash2 className="size-[16px]" />
                      </button>
                    )}
                  </>
                )}
              </div>
            ),
          )}
          {editable && editing === null && (
            draft !== null ? (
              <div className="flex items-center gap-2 rounded-xl bg-surface2 p-2">
                <input
                  autoFocus
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") save();
                    if (event.key === "Escape") setDraft(null);
                  }}
                  placeholder="Source name"
                  className="h-10 min-w-0 flex-1 rounded-lg border border-line2 bg-surface px-3 text-[15px] text-ink outline-none focus:border-accent/60"
                />
                <button
                  aria-label="Add source"
                  onClick={save}
                  className="press flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accentink"
                >
                  <Check className="size-[18px]" />
                </button>
                <button
                  aria-label="Cancel"
                  onClick={() => setDraft(null)}
                  className="press flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface text-ink2"
                >
                  <X className="size-[18px]" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDraft("")}
                className="press flex min-h-12 w-full items-center gap-3 rounded-xl border border-dashed border-line2 px-3.5 text-[15px] font-medium text-accent"
              >
                <Plus className="size-[18px]" />
                Add a new source
              </button>
            )
          )}
        </div>
      </Sheet>
    </div>
  );
}
