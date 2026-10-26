import { getSupabase } from "@/lib/api/supabase";
import { readConnection } from "@/lib/api/bootstrap";

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
  const sb = getSupabase(readConnection()?.access_token);
  if (!sb) return () => {};

  const channel = sb.channel(`org:${orgId}`);
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
  return () => {
    void sb.removeChannel(channel);
  };
}
