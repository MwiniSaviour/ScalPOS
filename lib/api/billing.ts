import type { SyncConnection } from "@/lib/api/bootstrap";
import { freshToken } from "@/lib/api/session";

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
  const token = (await freshToken(true)) ?? conn.access_token ?? "";
  if (!token) throw new Error("signed out — reconnect first");
  let res: Response;
  try {
    res = await fetch(`${supabaseUrl()}/functions/v1/${fn}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new Error(`${fn} timed out — check your connection`);
  }
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const raw = typeof json.error === "string" ? json.error : `${fn} failed (${res.status})`;
    throw new Error(res.status === 401 ? `${raw} — open Connect and reconnect` : raw);
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

export type CheckoutPayload = {
  public_key: string;
  access_code: string;
  reference: string;
  email: string;
  amount: number;
  currency: string;
  metadata: Record<string, unknown>;
  authorization_url?: string;
};

export async function startCheckout(
  conn: SyncConnection,
  plan: SubPlan,
  renewal: Renewal = "manual",
): Promise<CheckoutPayload> {
  const json = await edgePost(conn, "subscribe-init", { plan, renewal });
  const public_key = typeof json.public_key === "string" ? json.public_key : "";
  const access_code = typeof json.access_code === "string" ? json.access_code : "";
  const reference = typeof json.reference === "string" ? json.reference : "";
  if (!public_key || !access_code || !reference) {
    throw new Error("checkout session incomplete");
  }
  return {
    public_key,
    access_code,
    reference,
    email: typeof json.email === "string" ? json.email : "",
    amount: typeof json.amount === "number" ? json.amount : 0,
    currency: typeof json.currency === "string" ? json.currency : "GHS",
    metadata: json.metadata && typeof json.metadata === "object" ? (json.metadata as Record<string, unknown>) : {},
    authorization_url: typeof json.authorization_url === "string" ? json.authorization_url : undefined,
  };
}
