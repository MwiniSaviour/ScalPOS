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

async function hmacSha512Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

  const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secretKey) {
    return json({ error: "server not configured: PAYSTACK_SECRET_KEY required" }, 500);
  }

  const signatureHeader = req.headers.get("x-paystack-signature") ?? "";
  let expected = "";
  try {
    expected = await hmacSha512Hex(secretKey, raw);
  } catch {
    return json({ error: "signature computation failed" }, 500);
  }
  if (!expected || !safeEqualHex(signatureHeader.toLowerCase(), expected)) {
    return json({ error: "invalid signature" }, 401);
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
