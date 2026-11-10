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

function b64urlEncode(obj: unknown): string {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
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
  const orgId = body?.org_id as string | undefined;
  const email = body?.email as string | undefined;
  const role = (body?.role as string | undefined) ?? "cashier";
  if (!orgId || !email) {
    return json({ error: "org_id and email required" }, 400);
  }
  if (!["owner", "supervisor", "cashier"].includes(role)) {
    return json({ error: "invalid role" }, 400);
  }

  const user = await verifyClerkToken(req);
  if (!user) {
    return json({ error: "invalid session" }, 401);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // caller must be owner/supervisor of org
  const { data: callerMem } = await admin
    .from("memberships")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .limit(1);
  if (!callerMem || callerMem.length === 0 || !["owner", "supervisor"].includes(callerMem[0].role)) {
    return json({ error: "not allowed" }, 403);
  }

  // only owner can invite owners
  if (role === "owner" && callerMem[0].role !== "owner") {
    return json({ error: "only owner can invite owners" }, 403);
  }

  // cloud/team features are gated: trialing, active enterprise, or tester only
  const entitled = await orgEntitled(admin, orgId, (user.email ?? "").toLowerCase());
  if (!entitled) {
    return json({ error: "enterprise_required" }, 403);
  }

  const payload = {
    org_id: orgId,
    email: email.toLowerCase(),
    role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const data = b64urlEncode(payload);
  const sig = await hmacSign(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, data);
  const token = `${data}.${sig}`;

  const siteUrl = Deno.env.get("SITE_URL") ?? "https://pos.scalmint.com";
  const inviteUrl = `${siteUrl}/accept-invite?token=${encodeURIComponent(token)}`;

  // Send a Clerk-native invitation when configured. The redirect carries the
  // signed org/role token so the invitee joins the correct shop after sign-up.
  let emailed = false;
  const clerkKey = Deno.env.get("CLERK_SECRET_KEY");
  if (clerkKey) {
    try {
      const res = await fetch("https://api.clerk.com/v1/invitations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clerkKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email_address: payload.email,
          redirect_url: inviteUrl,
          notify: true,
          ignore_existing: true,
          expires_in_days: 7,
        }),
      });
      emailed = res.ok;
      if (!res.ok) console.warn("clerk invite failed", res.status, await res.text());
    } catch (e) {
      console.warn("clerk invite error", e instanceof Error ? e.message : String(e));
    }
  }

  return json({ token, org_id: orgId, role, invite_url: inviteUrl, emailed }, 200);
});
