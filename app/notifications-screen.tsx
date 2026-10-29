"use client";

import { ScreenHeader } from "@/components/shell/screenheader";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/emptystate";
import { countUnread, listNotifications, markNotifsSeen, notifSeenStamp, type OrgNotification } from "@/lib/api/notifications";
import { readConnection, type SyncConnection } from "@/lib/api/bootstrap";
import { timeAgo } from "@/lib/format";
import { usePos } from "@/lib/store";
import { useNow } from "@/lib/now";
import { Bell, LoaderCircle, AlertTriangle, ShoppingBag } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";

function kindIcon(kind: OrgNotification["kind"]): { node: ReactNode; tone: string } {
  if (kind === "sale") {
    return { node: <ShoppingBag className="size-[18px]" />, tone: "var(--accent)" };
  }
  return { node: <AlertTriangle className="size-[18px]" />, tone: "var(--warn)" };
}

export default function NotificationsScreen() {
  const toast = usePos((s) => s.toast);
  const now = useNow();
  const [data, setData] = useState<{ rows: OrgNotification[]; seen: string; conn: SyncConnection | null } | null>(null);

  const load = useCallback(() => {
    const c = readConnection();
    const stamp = notifSeenStamp();
    markNotifsSeen();
    const fetcher = c ? listNotifications(c) : Promise.resolve([] as OrgNotification[]);
    fetcher
      .then((rows) => setData({ rows, seen: stamp, conn: c }))
      .catch((e: unknown) => {
        toast(e instanceof Error ? e.message : "Could not load notifications", "error");
        setData({ rows: [], seen: stamp, conn: c });
      });
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <ScreenHeader title="Notifications" onBack />
      <div className="anim-fade min-h-dvh px-5 pt-3 pb-24">
        {data === null ? (
          <div className="flex items-center justify-center py-16 text-ink3">
            <LoaderCircle className="size-6 animate-spin" />
          </div>
        ) : data.rows.length === 0 ? (
          <EmptyState
            className="mt-8"
            icon={<Bell className="size-[19px]" />}
            title={data.conn ? "No notifications yet" : "Connect to receive alerts"}
            hint={
              data.conn
                ? "Alerts from the last 2 days show up here."
                : "Connect your shop from Settings to get sale and low stock alerts."
            }
            action={
              data.conn ? (
                <button data-testid="notif-retry" onClick={() => void load()} className="press text-[15px] font-medium text-accent">
                  Refresh
                </button>
              ) : undefined
            }
          />
        ) : (
          <Card inset data-testid="notif-list">
            {data.rows.map((r) => {
              const icon = kindIcon(r.kind);
              const unread = r.created_at > data.seen;
              return (
                <div
                  key={r.id}
                  data-testid="notif-row"
                  className={unread ? "bg-accent/5" : undefined}
                >
                  <div className="flex items-start gap-3 px-4 py-3.5">
                    <span
                      className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-surface2"
                      style={{ color: icon.tone }}
                    >
                      {icon.node}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={unread ? "block text-[16px] font-semibold text-ink" : "block text-[16px] font-medium text-ink"}>
                        {r.title}
                      </span>
                      {r.body && <span className="mt-0.5 block text-[14px] text-ink3">{r.body}</span>}
                      {r.kind === "sale" && (
                        <span className="mt-0.5 block text-[13px] text-ink3">Visible to owners and supervisors</span>
                      )}
                    </span>
                    <span className="shrink-0 text-[13px] text-ink3">
                      {timeAgo(new Date(r.created_at).getTime(), now)}
                      {unread && <span className="mt-1 block size-1.5 rounded-full bg-accent" />}
                    </span>
                  </div>
                </div>
              );
            })}
            <p className="px-4 py-3 text-center text-[13px] text-ink3">
              {countUnread(data.rows)} unread of {data.rows.length}
            </p>
          </Card>
        )}
      </div>
    </>
  );
}
