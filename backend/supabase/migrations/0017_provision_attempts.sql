-- Sign-up provisioning is a public endpoint (the caller has no Clerk session
-- yet), so it rate-limits by client IP with this append-only log. Only the
-- service role ever touches it: RLS is enabled with no policies.
create table if not exists public.provision_attempts (
  id bigint generated always as identity primary key,
  ip text not null,
  created_at timestamptz not null default now()
);

create index if not exists provision_attempts_ip_created_idx
  on public.provision_attempts (ip, created_at desc);

alter table public.provision_attempts enable row level security;
