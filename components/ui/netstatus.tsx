"use client";

import { WifiOff } from "lucide-react";
import { useNet } from "@/lib/net";

/**
 * Offline pill — fixed top-right under the safe area (same lane as the
 * floating filter chips, mirrored to the top). Renders nothing while
 * online; pointer-events-none so it never blocks what it floats over.
 */
export function NetStatus() {
  const { online } = useNet();
  if (online) return null;
  return (
    <div className="safe-t pointer-events-none fixed inset-x-0 top-0 z-[45]">
      <div className="mx-auto flex max-w-[440px] justify-end px-4 pt-2">
        <div className="anim-fade flex items-center gap-2 rounded-full bg-warn/10 px-3.5 py-2 text-[13px] font-medium leading-tight text-warn">
          <WifiOff className="size-4 shrink-0" />
          <span>Offline — working locally, changes save on device</span>
        </div>
      </div>
    </div>
  );
}
