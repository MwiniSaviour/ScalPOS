import { getSupabase } from "@/lib/api/supabase";

const STORAGE_KEY = "nova-pos-sync-v1";

export interface SyncConnection {
  org_id: string;
  user_id: string;
  access_token: string;
  email?: string;
  org_name?: string;
}

export function readConnection(): SyncConnection | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SyncConnection;
    if (!parsed?.org_id || !parsed?.user_id || !parsed?.access_token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeConnection(c: SyncConnection | null) {
  if (typeof window === "undefined") return;
  if (!c) window.localStorage.removeItem(STORAGE_KEY);
  else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

export async function bootstrapConnection(o: {
  access_token: string;
  user_id: string;
  email?: string | null;
}): Promise<SyncConnection> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const res = await fetch(`${url}/functions/v1/bootstrap-org`, {
    method: "POST",
    headers: { Authorization: `Bearer ${o.access_token}`, "Content-Type": "application/json" },
  });
  const json = (await res.json().catch(() => ({}))) as { org_id?: string; error?: string };
  if (!res.ok || !json.org_id) throw new Error(json.error ?? "bootstrap failed");

  let orgName = json.org_id;
  try {
    const sb = getSupabase();
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
