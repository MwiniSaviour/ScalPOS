import type { SyncConnection } from "@/lib/api/bootstrap";
import { createSupabaseClient } from "@/lib/api/supabase";
import { freshToken } from "@/lib/api/session";

async function teamClient(conn: SyncConnection) {
  return createSupabaseClient((await freshToken()) ?? conn.access_token ?? undefined);
}

export type TeamRole = "owner" | "supervisor" | "cashier";

export type TeamMember = {
  id: string;
  user_id: string;
  email: string | null;
  role: TeamRole;
  deleted_at: string | null;
  created_at: string;
};

export async function listMembers(conn: SyncConnection): Promise<TeamMember[]> {
  const sb = await teamClient(conn);
  if (!sb) throw new Error("Supabase not configured");
  const { data, error } = await sb
    .from("memberships")
    .select("id,user_id,email,role,created_at,deleted_at")
    .eq("org_id", conn.org_id)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as TeamMember[];
}

export async function setRole(conn: SyncConnection, memberId: string, role: TeamRole): Promise<void> {
  const sb = await teamClient(conn);
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb.from("memberships").update({ role }).eq("id", memberId);
  if (error) throw new Error(error.message);
}

export async function layoffMember(conn: SyncConnection, memberId: string): Promise<void> {
  const sb = await teamClient(conn);
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb
    .from("memberships")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", memberId);
  if (error) throw new Error(error.message);
}

export async function reinstateMember(conn: SyncConnection, memberId: string): Promise<void> {
  const sb = await teamClient(conn);
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb.from("memberships").update({ deleted_at: null }).eq("id", memberId);
  if (error) throw new Error(error.message);
}

export type InviteResult = {
  emailed: boolean;
  invite_url?: string;
};

export async function inviteMember(conn: SyncConnection, email: string, role: TeamRole = "cashier"): Promise<InviteResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!url) throw new Error("Supabase not configured");
  const bearer = (await freshToken()) ?? conn.access_token ?? "";
  if (!bearer) throw new Error("signed out — reconnect first");
  const res = await fetch(`${url}/functions/v1/invite-member`, {
    method: "POST",
    headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
    body: JSON.stringify({ org_id: conn.org_id, email, role }),
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => ({}))) as {
    emailed?: boolean;
    invite_url?: string;
    error?: string;
  };
  if (!res.ok) throw new Error(json.error ?? "invite failed");
  return { emailed: json.emailed !== false, invite_url: json.invite_url };
}
