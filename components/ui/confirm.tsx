"use client";

import { Button } from "./button";
import { Sheet } from "./sheet";

export function Confirm({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Confirm",
  tone = "neutral",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  confirmLabel?: string;
  tone?: "neutral" | "danger";
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      height="auto"
      title={<span className={tone === "danger" ? "text-danger" : undefined}>{title}</span>}
      footer={
        <div className="flex gap-2.5">
          <Button variant="secondary" block onClick={onClose}>
            Cancel
          </Button>
          <Button
            block
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="pb-4 text-[14px] leading-6 text-ink2">{body}</p>
    </Sheet>
  );
}
