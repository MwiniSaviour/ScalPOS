import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

export function createSupabaseClient(token?: string): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!token && cached) return cached;
  const client = createClient(url, key);
  if (token) {
    // Attach the Clerk JWT as a per-request header via fetch override is not
    // supported by supabase-js v2 directly; instead we rely on the JWT template
    // configured in Clerk → Supabase integration. The token is passed through
    // bootstrapConnection as the access_token for Supabase DB calls.
  }
  if (!token) cached = client;
  return client;
}

export const getSupabase = createSupabaseClient;
export const getSupabaseClient = createSupabaseClient;
