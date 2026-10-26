import type { SyncConnection } from "@/lib/api/bootstrap";
import { createSupabaseClient } from "@/lib/api/supabase";

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
  const sb = createSupabaseClient(conn.access_token);
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
  const sb = createSupabaseClient(conn.access_token);
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb.from("memberships").update({ role }).eq("id", memberId);
  if (error) throw new Error(error.message);
}

export async function layoffMember(conn: SyncConnection, memberId: string): Promise<void> {
  const sb = createSupabaseClient(conn.access_token);
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb
    .from("memberships")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", memberId);
  if (error) throw new Error(error.message);
}

export async function reinstateMember(conn: SyncConnection, memberId: string): Promise<void> {
  const sb = createSupabaseClient(conn.access_token);
  if (!sb) throw new Error("Supabase not configured");
  const { error } = await sb.from("memberships").update({ deleted_at: null }).eq("id", memberId);
  if (error) throw new Error(error.message);
}
