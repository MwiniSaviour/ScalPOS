import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyClerkToken } from "../_shared/clerk.ts";

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

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }
  const body = await req.json().catch(() => ({}));
  const orgId = body?.org_id as string | undefined;
  const email = body?.email as string | undefined;
  const role = (body?.role as string | undefined) ?? "cashier";
  if (!orgId || !email) {
    return new Response(JSON.stringify({ error: "org_id and email required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!["owner", "supervisor", "cashier"].includes(role)) {
    return new Response(JSON.stringify({ error: "invalid role" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const user = await verifyClerkToken(req);
  if (!user) {
    return new Response(JSON.stringify({ error: "invalid session" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
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
    return new Response(JSON.stringify({ error: "not allowed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // only owner can invite owners
  if (role === "owner" && callerMem[0].role !== "owner") {
    return new Response(JSON.stringify({ error: "only owner can invite owners" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
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

  return new Response(
    JSON.stringify({ token, org_id: orgId, role, invite_url: inviteUrl, emailed }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
});
