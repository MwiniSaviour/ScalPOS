"use client";

import { useSyncStatus } from "@/lib/net";

export function SyncStatus() {
  const { online, syncing, pendingCount, error } = useSyncStatus();

  if (error) {
    return (
      <div className="safe-t pointer-events-none fixed inset-x-0 top-0 z-[45]">
        <div className="mx-auto flex max-w-[440px] justify-start px-4 pt-2">
          <div
            title={error}
            className="anim-fade flex max-w-full items-center gap-2 rounded-full bg-danger/10 px-3.5 py-2 text-[13px] font-medium leading-tight text-danger"
          >
            <span>Sync error</span>
            <span className="max-w-[220px] truncate opacity-80">{error}</span>
          </div>
        </div>
      </div>
    );
  }
  if (syncing) {
    return (
      <div className="safe-t pointer-events-none fixed inset-x-0 top-0 z-[45]">
        <div className="mx-auto flex max-w-[440px] justify-start px-4 pt-2">
          <div className="anim-fade flex items-center gap-2 rounded-full bg-accent/10 px-3.5 py-2 text-[13px] font-medium leading-tight text-accent">
            <span>Syncing…</span>
          </div>
        </div>
      </div>
    );
  }
  if (!online) {
    return (
      <div className="safe-t pointer-events-none fixed inset-x-0 top-0 z-[45]">
        <div className="mx-auto flex max-w-[440px] justify-start px-4 pt-2">
          <div className="anim-fade flex items-center gap-2 rounded-full bg-warn/10 px-3.5 py-2 text-[13px] font-medium leading-tight text-warn">
            <span>Offline — {pendingCount} pending</span>
          </div>
        </div>
      </div>
    );
  }
  if (pendingCount > 0) {
    return (
      <div className="safe-t pointer-events-none fixed inset-x-0 top-0 z-[45]">
        <div className="mx-auto flex max-w-[440px] justify-start px-4 pt-2">
          <div className="anim-fade flex items-center gap-2 rounded-full bg-accent/10 px-3.5 py-2 text-[13px] font-medium leading-tight text-accent">
            <span>Syncing…</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
