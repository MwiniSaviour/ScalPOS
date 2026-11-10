import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyClerkToken } from "./clerk.ts";
import { preflight, json } from "./cors.ts";

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

const TRIAL_MS = 7 * 24 * 60 * 60 * 1000;

async function orgEntitled(
  admin: SupabaseClient,
  orgId: string,
  testerEmail: string,
): Promise<boolean> {
  const { data: sub } = await admin
    .from("subscriptions")
    .select("id")
    .eq("org_id", orgId)
    .eq("plan", "enterprise")
    .eq("status", "active")
    .limit(1);
  if (sub && sub.length > 0) return true;

  try {
    const { data: tester } = await admin
      .from("testers")
      .select("email")
      .eq("email", testerEmail)
      .gt("expires_at", new Date().toISOString())
      .limit(1);
    if (tester && tester.length > 0) return true;
  } catch {
    // testers table absent until 0011 lands: treat as no match
  }

  const { data: org } = await admin
    .from("orgs")
    .select("created_at, trial_started_at")
    .eq("id", orgId)
    .limit(1);
  if (org && org.length > 0) {
    const row = org[0] as { created_at: string | null; trial_started_at: string | null };
    const anchor = row.trial_started_at ?? row.created_at;
    if (anchor && Date.now() - new Date(anchor).getTime() < TRIAL_MS) return true;
  }
  return false;
}

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }
  const body = await req.json().catch(() => ({}));
  const token = body?.token as string | undefined;
  if (!token) {
    return json({ error: "token required" }, 400);
  }

  const user = await verifyClerkToken(req);
  if (!user) {
    return json({ error: "invalid session" }, 401);
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return json({ error: "malformed token" }, 400);
  }
  const [data, sig] = parts;
  const expected = await hmacSign(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, data);
  if (sig !== expected) {
    return json({ error: "invalid signature" }, 403);
  }

  let payload: { org_id: string; email: string; role: string; exp: number };
  try {
    payload = JSON.parse(b64urlDecode(data));
  } catch {
    return json({ error: "invalid payload" }, 400);
  }
  if (!payload.exp || Date.now() > payload.exp) {
    return json({ error: "token expired" }, 403);
  }
  if (payload.email !== (user.email ?? "").toLowerCase()) {
    return json({ error: "email mismatch" }, 403);
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
    return json({ org_id: payload.org_id, role: existing[0].role, joined: false }, 200);
  }

  // cloud/team features are gated: trialing, active enterprise, or tester only
  const entitled = await orgEntitled(admin, payload.org_id, (user.email ?? "").toLowerCase());
  if (!entitled) {
    return json({ error: "enterprise_required" }, 403);
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
    return json({ error: memErr.message }, 500);
  }

  return json({ org_id: payload.org_id, role: payload.role, joined: true }, 200);
});
