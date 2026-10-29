"use client";

import { useEffect } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/api/supabase";
import { readConnection, type SyncConnection } from "@/lib/api/bootstrap";
import { freshToken } from "@/lib/api/session";
import { useCurrentStaff } from "@/lib/staff";
import { hasAlertPermission, notifyLocal } from "@/lib/notify";

type NotificationRow = {
  id: string;
  kind: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export default function NotificationWatcher() {
  const staff = useCurrentStaff();

  useEffect(() => {
    void hasAlertPermission();
  }, []);

  useEffect(() => {
    const conn = readConnection() as SyncConnection | null;
    if (!conn) return;
    let cancelled = false;
    let localSb: ReturnType<typeof getSupabase> | null = null;
    let localChannel: RealtimeChannel | null = null;
    void (async () => {
      const sb = getSupabase((await freshToken()) ?? conn.access_token);
      if (!sb || cancelled) return;
      localSb = sb;

      const role = staff?.role ?? "cashier";
      const channel = sb.channel(`alerts:${conn.org_id}`).on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `org_id=eq.${conn.org_id}` },
        (payload: { new?: Record<string, unknown> | null }) => {
          const row = payload.new as Partial<NotificationRow> | null;
          if (!row || typeof row.id !== "string") return;
          if (row.kind === "sale" && role !== "owner" && role !== "supervisor") return;
          const data = row.data ?? {};
          const key =
            row.kind === "low_stock" && typeof data.product_id === "string"
              ? `low:${data.product_id}`
              : `row:${row.id}`;
          void notifyLocal(row.title ?? "", row.body ?? "", key);
        },
      );
      if (cancelled) return;
      localChannel = channel;
      channel.subscribe();
    })();
    return () => {
      cancelled = true;
      if (localSb && localChannel) void localSb.removeChannel(localChannel);
    };
    // staff role changes re-arm the listener filter
  }, [staff?.role]);

  return null;
}
