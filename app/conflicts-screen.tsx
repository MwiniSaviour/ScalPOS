"use client";

import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/emptystate";
import { listConflicts, removeConflict } from "@/lib/sync/outbox";
import type { Conflict } from "@/lib/sync/types";
import { CheckCircle2, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ConflictsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const list = await listConflicts();
    setItems(Array.isArray(list) ? list : []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, []);

  async function resolve(c: Conflict, _action: "mine" | "theirs" | "merge") {
    void _action;
    await removeConflict(c.table, c.id);
    await refresh();
  }

  return (
    <div className="anim-fade px-5 pt-4">
      <header className="flex items-center gap-1">
        <IconButton label="Back" onClick={() => router.back()} className="-ml-2 shrink-0 text-ink">
          <ChevronLeft className="size-[24px]" strokeWidth={2.2} />
        </IconButton>
        <h1 className="min-w-0 flex-1 truncate text-[26px]/7 font-bold tracking-[-0.02em] text-ink">
          Sync conflicts
        </h1>
      </header>
      <p className="mt-0.5 text-[15px] text-ink3">Resolve records changed on multiple devices.</p>

      <section className="mt-6">
        {loading ? null : items.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="size-[24px]" />}
            title="No conflicts — everything is in sync."
            hint="Conflicts appear here when the same record is edited offline on two devices."
          />
        ) : (
          <Card inset>
            {items.map((c) => (
              <div key={`${c.table}:${c.id}`} className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface2 text-ink2">
                    <span className="text-[12px] font-bold">{c.table.slice(0, 2).toUpperCase()}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px] font-semibold text-ink">{c.table}</span>
                    <span className="block truncate text-[14px] text-ink3">{c.id}</span>
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="secondary" block onClick={() => void resolve(c, "mine")}>
                    Keep mine
                  </Button>
                  <Button size="sm" variant="secondary" block onClick={() => void resolve(c, "theirs")}>
                    Take theirs
                  </Button>
                  <Button size="sm" block onClick={() => void resolve(c, "merge")}>
                    Merge
                  </Button>
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
