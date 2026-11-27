export type LinkedConnection = { org_id: string; org_name?: string } | null;
export type LinkedShop = { id: string; name: string; role: "owner" };

export function shopForConnection(conn: LinkedConnection): LinkedShop {
  if (!conn?.org_id) return { id: "local", name: "This computer", role: "owner" };
  return { id: conn.org_id, name: conn.org_name || "My shop", role: "owner" };
}
