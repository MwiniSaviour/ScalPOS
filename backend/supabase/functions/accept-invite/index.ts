import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const enc = new TextEncoder();

async function hmacSign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  return atob(b64);
}

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
  const body = await req.json().catch(() => ({}));
  const token = body?.token as string | undefined;
  if (!token) {
    return new Response(JSON.stringify({ error: "token required" }), {
      status: 400,
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

  const parts = token.split(".");
  if (parts.length !== 2) {
    return new Response(JSON.stringify({ error: "malformed token" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const [data, sig] = parts;
  const expected = await hmacSign(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, data);
  if (sig !== expected) {
    return new Response(JSON.stringify({ error: "invalid signature" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: { org_id: string; email: string; role: string; exp: number };
  try {
    payload = JSON.parse(b64urlDecode(data));
  } catch {
    return new Response(JSON.stringify({ error: "invalid payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!payload.exp || Date.now() > payload.exp) {
    return new Response(JSON.stringify({ error: "token expired" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (payload.email !== (user.email ?? "").toLowerCase()) {
    return new Response(JSON.stringify({ error: "email mismatch" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // idempotent: existing membership?
  const { data: existing } = await admin
    .from("memberships")
    .select("org_id, role")
    .eq("org_id", payload.org_id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .limit(1);
  if (existing && existing.length > 0) {
    return new Response(
      JSON.stringify({ org_id: payload.org_id, role: existing[0].role, joined: false }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const { error: memErr } = await admin
    .from("memberships")
    .upsert(
      {
        org_id: payload.org_id,
        user_id: user.id,
        role: payload.role,
        email: user.email ?? null,
        deleted_at: null,
      },
      { onConflict: "org_id,user_id" },
    );
  if (memErr) {
    return new Response(JSON.stringify({ error: memErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({ org_id: payload.org_id, role: payload.role, joined: true }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
