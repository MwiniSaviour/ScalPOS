import { freshToken } from "@/lib/auth/session"

export type SubPlan = "standard" | "enterprise"

export type Renewal = "manual" | "auto"

export type SubscriptionState = {
  plan: SubPlan | null
  status: "none" | "pending" | "active" | "expired" | "trialing"
  renewal: Renewal
  expires_at: string | null
}

export class BillingAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "BillingAuthError"
  }
}

function supabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
}

async function edgePost(fn: string, body: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const token = await freshToken(true)
  if (!token) throw new BillingAuthError("Your session expired. Sign in again to continue.")
  let res: Response
  try {
    res = await fetch(`${supabaseUrl()}/functions/v1/${fn}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    })
  } catch {
    throw new Error(`${fn} timed out — check your connection`)
  }
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    if (res.status === 401) throw new BillingAuthError("Your session expired. Sign in again to continue.")
    const raw = typeof json.error === "string" ? json.error : `${fn} failed (${res.status})`
    throw new Error(raw)
  }
  return json
}

export async function getSubscription(orgId?: string): Promise<SubscriptionState> {
  const json = await edgePost("check-subscription", orgId ? { org_id: orgId } : {})
  const plan = json.plan === "standard" || json.plan === "enterprise" ? json.plan : null
  const status =
    json.status === "none" || json.status === "pending" || json.status === "active" ||
    json.status === "expired" || json.status === "trialing"
      ? json.status
      : "none"
  return {
    plan: plan as SubscriptionState["plan"],
    status: status as SubscriptionState["status"],
    renewal: json.renewal === "auto" ? "auto" : "manual",
    expires_at: typeof json.expires_at === "string" ? json.expires_at : null,
  }
}

export type CheckoutPayload = {
  public_key: string
  access_code: string
  reference: string
  email: string
  amount: number
  currency: string
  metadata: Record<string, unknown>
  authorization_url?: string
}

export async function startCheckout(
  orgId: string,
  plan: SubPlan,
  renewal: Renewal = "manual",
  affiliateCode?: string | null,
): Promise<CheckoutPayload> {
  const body: Record<string, unknown> = { plan, renewal, org_id: orgId }
  if (affiliateCode) body.affiliate_code = affiliateCode
  const json = await edgePost("subscribe-init", body)
  const public_key = typeof json.public_key === "string" ? json.public_key : ""
  const access_code = typeof json.access_code === "string" ? json.access_code : ""
  const reference = typeof json.reference === "string" ? json.reference : ""
  if (!public_key || !access_code || !reference) {
    throw new Error("checkout session incomplete")
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
  }
}
