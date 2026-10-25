import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const enc = new TextEncoder();

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacHex(hash: "SHA-256" | "SHA-512", secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const HUB_TOLERANCE_MS = 5 * 60 * 1000;

function parseHubSignature(header: string): { t: string; v1: string } | null {
  let t = "";
  let v1 = "";
  for (const part of header.split(",")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key === "t") t = value;
    else if (key === "v1") v1 = value;
  }
  return t && v1 ? { t, v1 } : null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

interface PaystackEvent {
  event?: string;
  data?: {
    status?: string;
    amount?: number;
    reference?: string;
    channel?: string;
    paid_at?: string;
    metadata?: { sub_id?: string };
  };
}

function activateUpdate(data: NonNullable<PaystackEvent["data"]>) {
  const startedRaw = data.paid_at ? new Date(data.paid_at).getTime() : Date.now();
  const started = Number.isFinite(startedRaw) ? startedRaw : Date.now();
  const expires = new Date(started + 365 * 24 * 60 * 60 * 1000);
  return {
    status: "active",
    channel: data.channel ?? null,
    started_at: new Date(started).toISOString(),
    expires_at: expires.toISOString(),
    paystack_ref: data.reference,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }
  const raw = await req.text();

  const hubHeader = req.headers.get("x-hub-signature") ?? "";
  if (hubHeader) {
    const hubSecret = Deno.env.get("HUB_SIGNING_SECRET");
    if (!hubSecret) {
      return json({ error: "server not configured: HUB_SIGNING_SECRET required" }, 500);
    }
    const sig = parseHubSignature(hubHeader);
    if (!sig) {
      return json({ error: "invalid signature" }, 401);
    }
    const ts = Number(sig.t);
    if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > HUB_TOLERANCE_MS) {
      return json({ error: "invalid signature" }, 401);
    }
    let hubExpected = "";
    try {
      hubExpected = await hmacHex("SHA-256", hubSecret, `${sig.t}.${raw}`);
    } catch {
      return json({ error: "signature computation failed" }, 500);
    }
    if (!hubExpected || !safeEqualHex(sig.v1.toLowerCase(), hubExpected)) {
      return json({ error: "invalid signature" }, 401);
    }
  } else {
    const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secretKey) {
      return json({ error: "server not configured: PAYSTACK_SECRET_KEY required" }, 500);
    }

    const signatureHeader = req.headers.get("x-paystack-signature") ?? "";
    let expected = "";
    try {
      expected = await hmacHex("SHA-512", secretKey, raw);
    } catch {
      return json({ error: "signature computation failed" }, 500);
    }
    if (!expected || !safeEqualHex(signatureHeader.toLowerCase(), expected)) {
      return json({ error: "invalid signature" }, 401);
    }
  }

  let parsed: PaystackEvent;
  try {
    parsed = JSON.parse(raw) as PaystackEvent;
  } catch {
    return json({ error: "invalid payload" }, 400);
  }

  if (parsed.event !== "charge.success") {
    return json({ received: true, ignored: true });
  }
  const data = parsed.data;
  if (!data || data.status !== "success") {
    return json({ received: true, ignored: true });
  }
  const subId = data.metadata?.sub_id;
  if (!subId) {
    return json({ received: true, ignored: true });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "server not configured: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required" }, 500);
  }
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, amount")
    .eq("id", subId)
    .maybeSingle();
  if (!sub) {
    return json({ received: true, ignored: true });
  }
  if (typeof data.amount === "number" && data.amount !== sub.amount) {
    return json({ received: true, ignored: true, reason: "amount mismatch" });
  }

  const { error: updateErr } = await admin
    .from("subscriptions")
    .update(activateUpdate(data))
    .eq("id", subId);
  if (updateErr) {
    return json({ error: updateErr.message }, 500);
  }

  return json({ received: true });
});
