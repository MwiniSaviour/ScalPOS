import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyClerkToken } from "./clerk.ts";
import { preflight, json } from "./cors.ts";

const DEMO_PREFIX = "Demo — ";

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }
  const user = await verifyClerkToken(req);
  if (!user) {
    return json({ error: "invalid session" }, 401);
  }
  const body = await req.json().catch(() => ({}));
  const action =
    body?.action === "create"
      ? "create"
      : body?.action === "create-demo"
        ? "create-demo"
        : "connect";

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Idempotent: split the user's existing memberships into real and demo orgs
  // so a demo membership never satisfies a connect/create request.
  const { data: memRows } = await admin
    .from("memberships")
    .select("org_id")
    .eq("user_id", user.id)
    .is("deleted_at", null);
  const orgIds = (memRows ?? []).map((r) => r.org_id);
  let realOrgId: string | null = null;
  let demoOrgId: string | null = null;
  if (orgIds.length > 0) {
    const { data: orgRows } = await admin
      .from("orgs")
      .select("id, name")
      .in("id", orgIds);
    for (const o of orgRows ?? []) {
      if (o.name && o.name.startsWith(DEMO_PREFIX)) {
        if (!demoOrgId) demoOrgId = o.id;
      } else if (!realOrgId) {
        realOrgId = o.id;
      }
    }
  }
  if (action === "create-demo") {
    if (demoOrgId) {
      return json({ org_id: demoOrgId, created: false });
    }
  } else if (realOrgId) {
    return json({ org_id: realOrgId, created: false });
  }

  // Role-based: only an explicit owner action creates a new shop. Everyone
  // else must be invited — never auto-create a personal org here.
  if (action !== "create" && action !== "create-demo") {
    return json(
      {
        error: "no_shop",
        detail: "This account doesn't belong to a shop yet. Ask your owner for an invite link, or create a shop if you're the owner.",
      },
      403,
    );
  }

  const isDemo = action === "create-demo";
  const localPart = user.email ? user.email.split("@")[0] : "me";
  const shopName = isDemo
    ? `${DEMO_PREFIX}${localPart}'s shop`
    : user.email
      ? `${localPart}'s shop`
      : "My shop";

  const insertRow: Record<string, unknown> = { name: shopName };
  if (!isDemo) {
    // Persist the client's trial start (0011 entitlement enforcement),
    // clamped to server now so a skewed device clock can't extend the
    // 7-day trial window.
    const trialRaw = body?.trial_started_at;
    if (typeof trialRaw === "string") {
      const trialAt = Date.parse(trialRaw);
      if (Number.isFinite(trialAt)) {
        insertRow.trial_started_at = new Date(
          Math.min(trialAt, Date.now()),
        ).toISOString();
      }
    }
  }

  const { data: org, error: orgErr } = await admin
    .from("orgs")
    .insert(insertRow)
    .select("id")
    .single();
  if (orgErr || !org) {
    return json({ error: orgErr?.message ?? "org create failed" }, 500);
  }

  const { error: memErr } = await admin.from("memberships").insert({
    org_id: org.id,
    user_id: user.id,
    role: "owner",
    ...(user.email ? { email: user.email } : {}),
  });
  if (memErr) {
    return json({ error: memErr.message }, 500);
  }

  // seed a default settings row
  await admin.from("settings").insert({
    org_id: org.id,
    shop_name: isDemo ? `Demo · ${localPart}'s shop` : shopName,
  });

  return json({ org_id: org.id, created: true });
});
