import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyClerkToken } from "./clerk.ts";
import { preflight, json } from "./cors.ts";

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
  const action = body?.action === "create" ? "create" : "connect";

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Idempotent: existing membership?
  const { data: existing } = await admin
    .from("memberships")
    .select("org_id")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .limit(1);
  if (existing && existing.length > 0) {
    return json({ org_id: existing[0].org_id, created: false });
  }

  // Role-based: only an explicit owner action creates a new shop. Everyone
  // else must be invited — never auto-create a personal org here.
  if (action !== "create") {
    return json(
      {
        error: "no_shop",
        detail: "This account doesn't belong to a shop yet. Ask your owner for an invite link, or create a shop if you're the owner.",
      },
      403,
    );
  }

  const shopName = user.email
    ? `${user.email.split("@")[0]}'s shop`
    : "My shop";

  const { data: org, error: orgErr } = await admin
    .from("orgs")
    .insert({ name: shopName })
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
  await admin.from("settings").insert({ org_id: org.id, shop_name: shopName });

  return json({ org_id: org.id, created: true });
});
