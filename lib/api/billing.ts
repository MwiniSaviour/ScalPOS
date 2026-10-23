import type { SyncConnection } from "@/lib/api/bootstrap";

export type SubPlan = "standard" | "enterprise";

export type Renewal = "manual" | "auto";

export type SubscriptionState = {
  plan: SubPlan | null;
  status: "none" | "pending" | "active" | "expired" | "trialing";
  renewal: Renewal;
  expires_at: string | null;
};

function supabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

async function edgePost(conn: SyncConnection, fn: string, body: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const res = await fetch(`${supabaseUrl()}/functions/v1/${fn}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${conn.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(typeof json.error === "string" ? json.error : `${fn} failed (${res.status})`);
  }
  return json;
}

export async function getSubscription(conn: SyncConnection): Promise<SubscriptionState> {
  const json = await edgePost(conn, "check-subscription");
  const plan = json.plan === "standard" || json.plan === "enterprise" ? json.plan : null;
  const status =
    json.status === "none" || json.status === "pending" || json.status === "active" ||
    json.status === "expired" || json.status === "trialing"
      ? json.status
      : "none";
  return {
    plan: plan as SubscriptionState["plan"],
    status: status as SubscriptionState["status"],
    renewal: json.renewal === "auto" ? "auto" : "manual",
    expires_at: typeof json.expires_at === "string" ? json.expires_at : null,
  };
}

export async function startSubscription(
  conn: SyncConnection,
  plan: SubPlan,
  renewal: Renewal = "manual",
): Promise<void> {
  const json = await edgePost(conn, "subscribe-init", { plan, renewal });
  const url = typeof json.authorization_url === "string" ? json.authorization_url : "";
  if (!url) throw new Error("checkout link missing");
  try {
    const mod = await import("@/lib/appchrome");
    await mod.appChrome.openUrl({ url });
  } catch {
    if (typeof window !== "undefined") window.open(url, "_blank");
  }
}
