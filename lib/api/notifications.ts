import type { SyncConnection } from "@/lib/api/bootstrap";
import { createSupabaseClient } from "@/lib/api/supabase";

export type NotifKind = "sale" | "low_stock";

export type OrgNotification = {
  id: string;
  org_id: string;
  kind: NotifKind;
  title: string;
  body: string;
  data: Record<string, unknown>;
  created_at: string;
};

const SEEN_KEY = "nova-pos-notifs-seen";

export function notifSeenStamp(): string {
  return localStorage.getItem(SEEN_KEY) ?? "";
}

export function markNotifsSeen(): void {
  localStorage.setItem(SEEN_KEY, new Date().toISOString());
}

export function countUnread(rows: OrgNotification[]): number {
  const seen = notifSeenStamp();
  return rows.filter((r) => r.created_at > seen).length;
}

export async function listNotifications(
  conn: SyncConnection,
  limit = 40,
): Promise<OrgNotification[]> {
  const sb = createSupabaseClient(conn.access_token);
  if (!sb) throw new Error("Supabase not configured");
  const { data, error } = await sb
    .from("notifications")
    .select("id,org_id,kind,title,body,data,created_at")
    .eq("org_id", conn.org_id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as OrgNotification[];
}

export async function insertLowStockNotification(
  conn: SyncConnection,
  productName: string,
  qtyLeft: number,
  unit: string,
  productId: string,
): Promise<void> {
  const sb = createSupabaseClient(conn.access_token);
  if (!sb) return;
  await sb.from("notifications").insert({
    org_id: conn.org_id,
    kind: "low_stock",
    title: `Low stock: ${productName}`,
    body: `Only ${qtyLeft} ${unit} left`,
    data: { product_id: productId },
  });
}
