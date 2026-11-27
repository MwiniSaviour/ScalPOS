"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Button, IconButton } from "@/components/ui/button";
import { UseCasePicker, labelForUseCase } from "@/components/ui/business-type-picker";
import { usePos } from "@/lib/store";
import type { BusinessType } from "@/lib/types";

export function UseCaseScreen() {
  const router = useRouter();
  const updateSettings = usePos((s) => s.updateSettings);
  const [selected, setSelected] = useState<BusinessType | null>(null);

  function proceed() {
    if (!selected) return;
    updateSettings({ businessType: selected });
    router.push("/shop/create");
  }

  return (
    <div className="anim-fade flex min-h-dvh flex-col px-5 pt-4">
      <div className="safe-t" />
      <header className="flex items-center gap-1">
        <IconButton
          label="Back"
          onClick={() => router.back()}
          className="-ml-2 shrink-0 text-ink"
        >
          <ChevronLeft className="size-[24px]" strokeWidth={2.2} />
        </IconButton>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[22px]/7 font-bold tracking-[-0.02em] text-ink">
            Set up ScalPOS
          </h1>
          <p className="text-[13px] text-ink3">One choice, then a few details</p>
        </div>
      </header>

      <div className="mt-6 flex-1">
        <UseCasePicker value={selected} onChange={setSelected} />
      </div>

      <footer className="sticky bottom-0 mt-6 border-t border-line bg-bg2/95 pt-3 pb-[calc(var(--nova-sab)+12px)] backdrop-blur">
        <p className="mb-2 text-center text-[13px] text-ink3">
          {selected ? (
            <>
              Selected: <span className="font-semibold text-ink">{labelForUseCase(selected)}</span>
            </>
          ) : (
            "Pick one to continue"
          )}
        </p>
        <Button block size="lg" onClick={proceed} disabled={!selected}>
          Continue
        </Button>
      </footer>
    </div>
  );
}
