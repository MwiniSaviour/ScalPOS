create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  plan text not null check (plan in ('standard','enterprise')),
  status text not null check (status in ('pending','active','expired')) default 'pending',
  amount integer not null,
  currency text not null default 'GHS',
  paystack_ref text unique not null,
  channel text,
  started_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger subscriptions_moddatetime
  before update on public.subscriptions
  for each row execute function extensions.moddatetime('updated_at');
create index subscriptions_org_created_idx on public.subscriptions (org_id, created_at);

alter table public.subscriptions enable row level security;

create policy subscriptions_select on public.subscriptions for select
  using (org_id in (select public.current_org_ids()));
