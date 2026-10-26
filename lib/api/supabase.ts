import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createSupabaseClient(token?: string): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    accessToken: token ? async () => token : undefined,
  });
}

export const getSupabase = createSupabaseClient;
export const getSupabaseClient = createSupabaseClient;
