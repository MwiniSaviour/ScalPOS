import { getSupabase } from "@/lib/api/supabase";

const STORAGE_KEY = "nova-pos-sync-v1";

export interface SyncConnection {
  org_id: string;
  user_id: string;
  access_token: string;
  email?: string;
  org_name?: string;
}

export class BootstrapError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

let connRawCache: string | null | undefined;
let connParsedCache: SyncConnection | null = null;

export function readConnection(): SyncConnection | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  let unreadable = false;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    unreadable = true;
  }
  const key = unreadable ? "" : raw;
  if (connRawCache !== undefined && key === connRawCache) return connParsedCache;
  connRawCache = key;
  connParsedCache = null;
  if (!unreadable && raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<SyncConnection> | null;
      if (parsed && typeof parsed.org_id === "string" && typeof parsed.user_id === "string" && typeof parsed.access_token === "string") {
        connParsedCache = parsed as SyncConnection;
      }
    } catch {
      connParsedCache = null;
    }
  }
  return connParsedCache;
}

export function writeConnection(c: SyncConnection | null) {
  if (typeof window === "undefined") return;
  if (!c) window.localStorage.removeItem(STORAGE_KEY);
  else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  connRawCache = undefined;
  connParsedCache = null;
}

export async function acceptInviteToken(token: string, access_token: string): Promise<{ org_id: string; role: string; joined: boolean }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const res = await fetch(`${url}/functions/v1/accept-invite`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const json = (await res.json().catch(() => ({}))) as { org_id?: string; role?: string; joined?: boolean; error?: string };
  if (!res.ok || !json.org_id) throw new Error(json.error ?? "invite failed");
  return { org_id: json.org_id, role: json.role ?? "cashier", joined: json.joined ?? true };
}

export async function bootstrapConnection(o: {
  access_token: string;
  user_id: string;
  email?: string | null;
  action?: "create";
}): Promise<SyncConnection> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const res = await fetch(`${url}/functions/v1/bootstrap-org`, {
    method: "POST",
    headers: { Authorization: `Bearer ${o.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify(o.action ? { action: o.action } : {}),
  });
  const json = (await res.json().catch(() => ({}))) as { org_id?: string; error?: string; detail?: string };
  if (!res.ok || !json.org_id) {
    throw new BootstrapError(json.error ?? "bootstrap failed", json.detail ?? json.error ?? "bootstrap failed");
  }

  let orgName = json.org_id;
  try {
    const sb = getSupabase(o.access_token);
    if (sb) {
      const { data } = await sb.from("orgs").select("name").eq("id", json.org_id).maybeSingle();
      if (data && typeof (data as { name?: string }).name === "string") {
        orgName = (data as { name: string }).name;
      }
    }
  } catch {
  }

  const c: SyncConnection = {
    org_id: json.org_id,
    user_id: o.user_id,
    access_token: o.access_token,
    email: o.email ?? undefined,
    org_name: orgName,
  };
  writeConnection(c);
  return c;
}
