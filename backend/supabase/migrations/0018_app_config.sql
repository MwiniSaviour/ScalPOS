-- Service-role-only runtime configuration for edge functions. Values live in
-- the database instead of edge-function secrets because the project-level
-- CLERK_SECRET_KEY secret is stale (Clerk answers clerk_key_invalid).
-- Never store customer data here, and keep RLS on with no policies.
create table if not exists public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

revoke all on table public.app_config from anon, authenticated;
