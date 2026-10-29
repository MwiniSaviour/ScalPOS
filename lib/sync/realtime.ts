import { getSupabase } from "@/lib/api/supabase";
import { freshToken } from "@/lib/api/session";

export type RealtimeChange = {
  table: string;
  eventType: string;
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
};

export function subscribe(
  orgId: string,
  tables: string[],
  onChange: (change: RealtimeChange) => void,
): () => void {
  let off: (() => void) | null = null;
  let dead = false;

  void (async () => {
    const sb = getSupabase((await freshToken()) ?? undefined);
    if (!sb || dead) return;
    const channel = sb.channel(`org:${orgId}.${Math.random().toString(36).slice(2, 8)}`);
    for (const table of tables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `org_id=eq.${orgId}` },
        (payload: { eventType?: string; new?: Record<string, unknown> | null; old?: Record<string, unknown> | null }) => {
          onChange({
            table,
            eventType: payload.eventType ?? "*",
            new: payload.new ?? null,
            old: payload.old ?? null,
          });
        },
      );
    }
    channel.subscribe();
    off = () => {
      void sb.removeChannel(channel);
    };
    if (dead) off();
  })();

  return () => {
    dead = true;
    off?.();
  };
}
