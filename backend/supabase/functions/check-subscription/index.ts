import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyClerkToken } from "./clerk.ts";
import { preflight, json } from "./cors.ts";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const TRIAL_MS = 7 * DAY_MS;



type VerifyResult =
  | { state: "paid"; data: { amount?: number; channel?: string; paid_at?: string; reference?: string } }
  | { state: "unpaid" }
  | { state: "unknown" };

async function verifyWithPaystack(secretKey: string, reference: string): Promise<VerifyResult> {
  try {
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secretKey}` }, signal: AbortSignal.timeout(15_000) },
    );
    const json = (await res.json().catch(() => ({}))) as {
      message?: string;
      data?: { status?: string; amount?: number; channel?: string; paid_at?: string; reference?: string };
    };
    if (res.ok && json?.data?.status === "success") {
      return { state: "paid", data: json.data };
    }
    if (res.ok && json?.data) {
      return { state: "unpaid" };
    }
    if (res.status === 400 || res.status === 404) {
      return { state: "unpaid" };
    }
    return { state: "unknown" };
  } catch {
    return { state: "unknown" };
  }
}

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }
  const body = await req.json().catch(() => ({}));

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

  // The app tells us which shop it is looking at so billing follows the org
  // on screen, not whichever membership happens to sort first.
  const requestedOrg = typeof body?.org_id === "string" ? body.org_id : "";
  const { data: memberships, error: memErr } = await admin
    .from("memberships")
    .select("org_id,email")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(20);
  if (memErr) {
    return json({ error: memErr.message }, 500);
  }
  const memberRow = requestedOrg
    ? (memberships ?? []).find((m) => m.org_id === requestedOrg)
    : (memberships ?? [])[0];
  if (requestedOrg && !memberRow) {
    return json({ error: "not a member of that shop" }, 403);
  }
  const orgId = memberRow?.org_id as string | undefined;
  const email = (user.email ?? memberRow?.email ?? "").toLowerCase();

  // Test-phase licences: comped by email so a tester keeps access even if
  // they recreate their shop. Managed by the service role only.
  if (email) {
    const { data: tester } = await admin
      .from("testers")
      .select("expires_at")
      .eq("email", email)
      .maybeSingle();
    const until = tester?.expires_at ? new Date(tester.expires_at as string).getTime() : NaN;
    if (Number.isFinite(until) && until > Date.now()) {
      return json({
        org_id: orgId,
        plan: "enterprise",
        status: "active",
        renewal: "manual",
        expires_at: tester!.expires_at,
        tester: true,
      });
    }
  }

  if (!orgId) {
    return json({ plan: null, status: "none" });
  }

  const { data: org } = await admin
    .from("orgs")
    .select("created_at,trial_started_at")
    .eq("id", orgId)
    .maybeSingle();

  // The device trial anchor (clamped by bootstrap-org) wins over org creation,
  // so connecting or recreating a shop cannot restart the 7-day clock.
  const trialAnchor = org?.trial_started_at ?? org?.created_at;
  const trialEndMs = trialAnchor
    ? new Date(trialAnchor as string).getTime() + TRIAL_MS
    : NaN;

  const { data: subRows, error: subErr } = await admin
    .from("subscriptions")
    .select("id, plan, status, amount, renewal, paystack_ref, started_at, expires_at, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (subErr) {
    return json({ error: subErr.message }, 500);
  }

  type SubRow = {
    id: string;
    plan: string;
    status: string;
    amount: number;
    renewal: string;
    paystack_ref: string;
    started_at: string | null;
    expires_at: string | null;
    created_at: string;
  };
  const rows = (subRows ?? []) as SubRow[];
  const now = Date.now();
  const expiresMsOf = (row: SubRow) =>
    row.expires_at ? new Date(row.expires_at).getTime() : NaN;
  const active = rows.find(
    (row) =>
      row.status === "active" &&
      (!Number.isFinite(expiresMsOf(row)) || expiresMsOf(row) > now),
  );
  const lapsed = active ? undefined : rows.find((row) => row.status === "active");
  const pending = rows.find((row) => row.status === "pending");
  let pendingOpen = false;

  if (pending) {
    const createdMs = new Date(pending.created_at).getTime();
    const fresh = Number.isFinite(createdMs) && now - createdMs < HOUR_MS;
    pendingOpen = true;
    if (!secretKey) {
      if (!active) {
        return json({ error: "server not configured: PAYSTACK_SECRET_KEY required" }, 500);
      }
    } else {
      const verified = await verifyWithPaystack(secretKey, pending.paystack_ref);
      if (verified.state === "paid") {
        const amountOk =
          typeof verified.data.amount !== "number" || verified.data.amount === pending.amount;
        if (amountOk) {
          const startedRaw = verified.data.paid_at
            ? new Date(verified.data.paid_at).getTime()
            : now;
          const started = Number.isFinite(startedRaw) ? startedRaw : now;
          const expires = new Date(started + 365 * 24 * 60 * 60 * 1000);
          const { error: updErr } = await admin
            .from("subscriptions")
            .update({
              status: "active",
              channel: verified.data.channel ?? null,
              started_at: new Date(started).toISOString(),
              expires_at: expires.toISOString(),
              paystack_ref: verified.data.reference ?? pending.paystack_ref,
            })
            .eq("id", pending.id)
            .eq("status", "pending");
          if (updErr) {
            return json({ error: updErr.message }, 500);
          }
          // A new purchase supersedes any older live plan for this shop,
          // so the upgraded plan is the only one the org reads as active.
          await admin
            .from("subscriptions")
            .update({ status: "expired" })
            .eq("org_id", orgId)
            .eq("status", "active")
            .ne("id", pending.id);
          return json({
            org_id: orgId,
            plan: pending.plan,
            status: "active",
            renewal: pending.renewal,
            expires_at: expires.toISOString(),
          });
        }
      } else if (verified.state === "unpaid" && !fresh) {
        const { error: expireErr } = await admin
          .from("subscriptions")
          .update({ status: "expired" })
          .eq("id", pending.id)
          .eq("status", "pending");
        if (expireErr) {
          return json({ error: expireErr.message }, 500);
        }
        pendingOpen = false;
      }
    }
  }

  // A pending checkout that lapsed before its payment landed (webhook
  // missed, popup closed, user paid late) must still be honoured: verify
  // the reference of the most recent never-activated expired row and
  // revive it if Paystack says it was paid.
  const stalePaid = secretKey
    ? rows.find(
        (row) =>
          row.status === "expired" &&
          !row.started_at &&
          row.paystack_ref &&
          now - new Date(row.created_at).getTime() < 7 * DAY_MS,
      )
    : undefined;
  if (stalePaid) {
    const verified = await verifyWithPaystack(secretKey, stalePaid.paystack_ref);
    if (
      verified.state === "paid" &&
      (typeof verified.data.amount !== "number" || verified.data.amount === stalePaid.amount)
    ) {
      const startedRaw = verified.data.paid_at ? new Date(verified.data.paid_at).getTime() : now;
      const started = Number.isFinite(startedRaw) ? startedRaw : now;
      const expires = new Date(started + 365 * DAY_MS);
      const { error: updErr } = await admin
        .from("subscriptions")
        .update({
          status: "active",
          channel: verified.data.channel ?? null,
          started_at: new Date(started).toISOString(),
          expires_at: expires.toISOString(),
          paystack_ref: verified.data.reference ?? stalePaid.paystack_ref,
        })
        .eq("id", stalePaid.id)
        .eq("status", "expired");
      if (updErr) {
        return json({ error: updErr.message }, 500);
      }
      await admin
        .from("subscriptions")
        .update({ status: "expired" })
        .eq("org_id", orgId)
        .eq("status", "active")
        .ne("id", stalePaid.id);
      return json({
        org_id: orgId,
        plan: stalePaid.plan,
        status: "active",
        renewal: stalePaid.renewal,
        expires_at: expires.toISOString(),
      });
    }
  }

  if (active) {
    return json({
      org_id: orgId,
      plan: active.plan,
      status: "active",
      renewal: active.renewal,
      expires_at: active.expires_at,
    });
  }

  if (pending && pendingOpen) {
    return json({ org_id: orgId, plan: pending.plan, status: "pending", expires_at: null });
  }

  if (lapsed) {
    const { error: expireErr } = await admin
      .from("subscriptions")
      .update({ status: "expired" })
      .eq("id", lapsed.id)
      .eq("status", "active");
    if (expireErr) {
      return json({ error: expireErr.message }, 500);
    }
    if (Number.isFinite(trialEndMs) && now < trialEndMs) {
      return json({ org_id: orgId, plan: null, status: "trialing", expires_at: new Date(trialEndMs).toISOString() });
    }
    return json({
      org_id: orgId,
      plan: lapsed.plan,
      status: "expired",
      renewal: lapsed.renewal,
      expires_at: lapsed.expires_at,
    });
  }

  const lastPaid = rows.find((row) => row.status === "expired" && row.started_at);
  if (lastPaid) {
    return json({
      org_id: orgId,
      plan: lastPaid.plan,
      status: "expired",
      renewal: lastPaid.renewal,
      expires_at: lastPaid.expires_at,
    });
  }

  if (Number.isFinite(trialEndMs) && now < trialEndMs) {
    return json({ org_id: orgId, plan: null, status: "trialing", expires_at: new Date(trialEndMs).toISOString() });
  }
  return json({ org_id: orgId, plan: null, status: "none", expires_at: null });
});
