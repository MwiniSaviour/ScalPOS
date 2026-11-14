import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { preflight, json } from "./cors.ts";

// Clerk sign-up attempts on the current instance verify the email but never
// convert the attempt into a user (status stays "missing_requirements" with no
// missing fields, created_user_id stays null). Sign-in works, so new accounts
// are provisioned here through the Clerk Backend API and the client then signs
// in with an email code. Remove this function once the instance's sign-up
// conversion is fixed and the client flow is switched back.

const CLERK_API = "https://api.clerk.com/v1";
const MIN_PASSWORD = 15;
const MAX_PASSWORD = 72;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 10;
const RETENTION_MS = 2 * 24 * 60 * 60 * 1000;

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? "unknown";
}

function validEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const fullName = String(body?.full_name ?? "").trim().slice(0, 120);

  if (body?.accept_terms !== true) {
    return json({ ok: false, error: "terms_required" }, 400);
  }
  if (!validEmail(email)) {
    return json({ ok: false, error: "invalid_email" }, 400);
  }
  if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
    return json({ ok: false, error: "password_policy" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.error("provision-user: missing server configuration");
    return json({ ok: false, error: "not_configured" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  // The project-level CLERK_SECRET_KEY secret is stale (Clerk answers
  // clerk_key_invalid). The current key lives in the service-role-only
  // app_config table until the edge secret can be rotated.
  const { data: configRow } = await admin
    .from("app_config")
    .select("value")
    .eq("key", "clerk_secret_key")
    .limit(1);
  const clerkKey = configRow?.[0]?.value ?? Deno.env.get("CLERK_SECRET_KEY");
  if (!clerkKey) {
    console.error("provision-user: clerk key not configured");
    return json({ ok: false, error: "not_configured" }, 500);
  }
  const ip = clientIp(req);
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { count, error: countError } = await admin
    .from("provision_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", since);
  if (countError) console.warn("provision-user: rate-limit read failed", countError.message);
  if ((count ?? 0) >= MAX_ATTEMPTS_PER_WINDOW) {
    return json({ ok: false, error: "rate_limited" }, 429);
  }
  await admin.from("provision_attempts").insert({ ip });
  if (Math.random() < 0.05) {
    void admin
      .from("provision_attempts")
      .delete()
      .lt("created_at", new Date(Date.now() - RETENTION_MS).toISOString());
  }

  let res: Response;
  try {
    res = await fetch(`${CLERK_API}/users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clerkKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: [email],
        password,
        legal_accepted_at: new Date().toISOString(),
        ...(fullName ? { unsafe_metadata: { full_name: fullName } } : {}),
      }),
    });
  } catch {
    return json({ ok: false, error: "service_unavailable" }, 502);
  }

  if (res.ok) {
    return json({ ok: true });
  }

  const data = (await res.json().catch(() => null)) as { errors?: { code?: string }[] } | null;
  const code = data?.errors?.[0]?.code ?? "unknown";
  if (code === "form_identifier_exists") {
    // Existing account: the client continues to email-code sign-in, which proves
    // mailbox ownership before any session is issued. Do not reveal existence.
    return json({ ok: true, existing: true });
  }
  if (
    code === "form_password_pwned" ||
    code === "form_password_length_too_short" ||
    code === "form_password_length_too_long" ||
    code === "form_password_validation_failed"
  ) {
    return json({ ok: false, error: "weak_password" }, 400);
  }
  console.warn("provision-user: clerk create failed", res.status, code);
  return json({ ok: false, error: "service_unavailable" }, 502);
});
