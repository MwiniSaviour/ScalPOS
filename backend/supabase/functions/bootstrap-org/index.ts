import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "missing authorization" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "invalid session" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const user = userData.user;

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
    return new Response(
      JSON.stringify({ org_id: existing[0].org_id, created: false }),
      { status: 200, headers: { "Content-Type": "application/json" } },
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
    return new Response(
      JSON.stringify({ error: orgErr?.message ?? "org create failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const { error: memErr } = await admin.from("memberships").insert({
    org_id: org.id,
    user_id: user.id,
    role: "owner",
    ...(user.email ? { email: user.email } : {}),
  });
  if (memErr) {
    return new Response(JSON.stringify({ error: memErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // seed a default settings row
  await admin.from("settings").insert({ org_id: org.id, shop_name: shopName });

  return new Response(JSON.stringify({ org_id: org.id, created: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
