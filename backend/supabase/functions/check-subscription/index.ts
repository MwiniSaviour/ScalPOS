import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyClerkToken } from "../_shared/clerk.ts";

const HOUR_MS = 60 * 60 * 1000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function verifyWithPaystack(
  secretKey: string,
  reference: string,
): Promise<{ ok: boolean; data?: { amount?: number; channel?: string; paid_at?: string; reference?: string }; message?: string }> {
  try {
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    );
    const json = (await res.json().catch(() => ({}))) as {
      message?: string;
      data?: { status?: string; amount?: number; channel?: string; paid_at?: string; reference?: string };
    };
    if (!res.ok || json?.data?.status !== "success") {
      return { ok: false, message: json?.message ?? `verify failed (${res.status})` };
    }
    return { ok: true, data: json.data };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "paystack unreachable" };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }
  await req.json().catch(() => ({}));

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "server not configured: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required" }, 500);
  }

  const user = await verifyClerkToken(req);
  if (!user) {
    return json({ error: "invalid session" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: memberships, error: memErr } = await admin
    .from("memberships")
    .select("org_id")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .limit(1);
  if (memErr) {
    return json({ error: memErr.message }, 500);
  }
  const orgId = memberships?.[0]?.org_id as string | undefined;
  if (!orgId) {
    return json({ plan: null, status: "none" });
  }

  const { data: org } = await admin
    .from("orgs")
    .select("created_at")
    .eq("id", orgId)
    .maybeSingle();
  const trialEndMs = org?.created_at
    ? new Date(org.created_at as string).getTime() + 7 * 24 * 60 * 60 * 1000
    : NaN;

  const { data: sub, error: subErr } = await admin
    .from("subscriptions")
    .select("id, plan, status, amount, renewal, paystack_ref, expires_at, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (subErr) {
    return json({ error: subErr.message }, 500);
  }
  if (!sub) {
    if (Number.isFinite(trialEndMs) && Date.now() < trialEndMs) {
      return json({ org_id: orgId, plan: null, status: "trialing", expires_at: new Date(trialEndMs).toISOString() });
    }
    return json({ org_id: orgId, plan: null, status: "none", expires_at: null });
  }

  const expiresMs = sub.expires_at ? new Date(sub.expires_at as string).getTime() : NaN;

  if (sub.status === "active" && Number.isFinite(expiresMs) && expiresMs < Date.now()) {
    if (Number.isFinite(trialEndMs) && Date.now() < trialEndMs) {
      return json({ org_id: orgId, plan: null, status: "trialing", expires_at: new Date(trialEndMs).toISOString() });
    }
    const { error: expireErr } = await admin
      .from("subscriptions")
      .update({ status: "expired" })
      .eq("id", sub.id);
    if (expireErr) {
      return json({ error: expireErr.message }, 500);
    }
    return json({ org_id: orgId, plan: sub.plan, status: "expired", expires_at: sub.expires_at });
  }

  if (sub.status === "pending") {
    const createdMs = sub.created_at ? new Date(sub.created_at as string).getTime() : NaN;
    const fresh = Number.isFinite(createdMs) && Date.now() - createdMs < HOUR_MS;
    if (fresh) {
      if (!secretKey) {
        return json({ error: "server not configured: PAYSTACK_SECRET_KEY required" }, 500);
      }
      const verified = await verifyWithPaystack(secretKey, sub.paystack_ref);
      if (verified.ok && verified.data) {
        if (typeof verified.data.amount === "number" && verified.data.amount !== sub.amount) {
          return json({ org_id: orgId, plan: sub.plan, status: "pending", expires_at: null });
        }
        const startedRaw = verified.data.paid_at ? new Date(verified.data.paid_at).getTime() : Date.now();
        const started = Number.isFinite(startedRaw) ? startedRaw : Date.now();
        const expires = new Date(started + 365 * 24 * 60 * 60 * 1000);
        const { error: updErr } = await admin
          .from("subscriptions")
          .update({
            status: "active",
            channel: verified.data.channel ?? null,
            started_at: new Date(started).toISOString(),
            expires_at: expires.toISOString(),
            paystack_ref: verified.data.reference ?? sub.paystack_ref,
          })
          .eq("id", sub.id);
        if (updErr) {
          return json({ error: updErr.message }, 500);
        }
        return json({ org_id: orgId, plan: sub.plan, status: "active", renewal: sub.renewal ?? "manual", expires_at: expires.toISOString() });
      }
    }
    return json({ org_id: orgId, plan: sub.plan, status: "pending", expires_at: null });
  }

  return json({
    org_id: orgId,
    plan: sub.plan,
    status: sub.status,
    renewal: sub.renewal ?? "manual",
    expires_at: sub.expires_at,
  });
});
