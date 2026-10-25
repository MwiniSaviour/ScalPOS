import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PRICES: Record<string, number> = {
  standard: 12000,
  enterprise: 36000,
};

function randomSuffix(len = 10): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

function makeRef(orgId: string, plan: string): string {
  return `NOVA-${orgId.slice(0, 6).toUpperCase()}-${plan.slice(0, 3)}-${randomSuffix(10)}`;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "missing authorization" }, 401);
  }
  const body = await req.json().catch(() => ({}));
  const plan = typeof body?.plan === "string" ? body.plan : "";
  if (!PRICES[plan]) {
    return json({ error: "plan must be standard or enterprise" }, 400);
  }
  const renewal = body?.renewal === "auto" ? "auto" : "manual";

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json({ error: "invalid session" }, 401);
  }
  const user = userData.user;
  if (!user.email) {
    return json({ error: "account has no email to bill" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "server not configured: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required" }, 500);
  }
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: memberships, error: memErr } = await admin
    .from("memberships")
    .select("org_id, role")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .limit(1);
  if (memErr) {
    return json({ error: memErr.message }, 500);
  }
  const membership = memberships?.[0];
  if (!membership) {
    return json({ error: "no org membership found" }, 403);
  }
  if (membership.role !== "owner") {
    return json({ error: "only the shop owner can manage billing" }, 403);
  }

  const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secretKey) {
    return json({ error: "server not configured: PAYSTACK_SECRET_KEY required" }, 500);
  }
  const publicKey = Deno.env.get("PAYSTACK_PUBLIC_KEY");
  if (!publicKey) {
    return json({ error: "server not configured: PAYSTACK_PUBLIC_KEY required" }, 500);
  }

  let subId = "";
  let reference = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    reference = makeRef(membership.org_id, plan);
    const { data: row, error: insertErr } = await admin
      .from("subscriptions")
      .insert({
        org_id: membership.org_id,
        plan,
        renewal,
        status: "pending",
        amount: PRICES[plan],
        currency: "GHS",
        paystack_ref: reference,
      })
      .select("id")
      .single();
    if (!insertErr && row) {
      subId = row.id as string;
      break;
    }
    if (attempt === 1) {
      return json({ error: insertErr?.message ?? "subscription row create failed" }, 500);
    }
  }
  if (!subId) {
    return json({ error: "subscription row create failed" }, 500);
  }

  const siteUrl = Deno.env.get("SITE_URL") ?? "https://pos.scalmint.com";
  const planCode =
    renewal === "auto"
      ? plan === "enterprise"
        ? Deno.env.get("PAYSTACK_PLAN_ENTERPRISE")
        : Deno.env.get("PAYSTACK_PLAN_STANDARD")
      : undefined;
  const payBody: Record<string, unknown> = {
    email: user.email,
    currency: "GHS",
    channels: ["mobile_money", "card", "bank_transfer"],
    reference,
    metadata: { org_id: membership.org_id, plan, sub_id: subId },
    callback_url: `${siteUrl}/paystack/callback`,
  };
  if (planCode) {
    payBody.plan = planCode;
  } else {
    payBody.amount = PRICES[plan];
  }
  let payRes: Response;
  try {
    payRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payBody),
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "paystack unreachable" }, 502);
  }

  const payJson = (await payRes.json().catch(() => ({}))) as {
    message?: string;
    data?: { authorization_url?: string; access_code?: string; reference?: string };
  };
  if (!payRes.ok || !payJson?.data?.access_code) {
    return json(
      { error: payJson?.message ?? `paystack initialization failed (${payRes.status})` },
      502,
    );
  }

  return json({
    authorization_url: payJson.data.authorization_url,
    access_code: payJson.data.access_code,
    reference: reference,
    public_key: publicKey,
    email: user.email,
    amount: PRICES[plan],
    currency: "GHS",
    metadata: payBody.metadata,
  });
});
