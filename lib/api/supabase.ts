import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const FETCH_TIMEOUT_MS = 30_000;

async function timedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const signal = init.signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS);
  return fetch(input, { ...init, signal });
}

export function createSupabaseClient(token?: string): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    accessToken: token ? async () => token : undefined,
    global: { fetch: timedFetch },
  });
}

export const getSupabase = createSupabaseClient;
export const getSupabaseClient = createSupabaseClient;
