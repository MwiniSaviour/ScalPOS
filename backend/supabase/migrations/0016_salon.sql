-- 0016_salon.sql — salon data (appointments, packages, services, commissions)
--
-- A salon shop sells services instead of goods: they have a duration and a
-- stylist, they never touch stock. Clients book appointments, buy service
-- packages whose credits pay for later visits, and every visit records who
-- served it and what the stylist earned.
--
-- Every column is additive and nullable/defaulted, so a retail, pharmacy or
-- restaurant shop is unaffected by this migration.
--
-- Idempotent: safe to re-run.

-- ---------- appointments ----------

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  staff_id uuid references public.staff(id) on delete set null,
  -- the services booked: [{ "productId": "<uuid>", "price": 80 }]
  service_lines jsonb not null default '[]'::jsonb,
  start timestamptz not null default now(),
  duration_min int not null default 30,
  status text not null default 'booked'
    check (status in ('booked','arrived','in-service','done','no-show','cancelled')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  op_id uuid unique
);
create trigger appointments_moddatetime
  before update on public.appointments
  for each row execute function extensions.moddatetime('updated_at');
create index appointments_org_updated_idx on public.appointments (org_id, updated_at);
create index appointments_org_active_idx on public.appointments (org_id) where deleted_at is null;
create index appointments_start_idx on public.appointments (org_id, start);

alter table public.appointments add column if not exists local_id text;
create unique index if not exists appointments_org_local_id_key
  on public.appointments (org_id, local_id);

-- ---------- packages ----------

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null default '',
  price numeric(12,2) not null default 0,
  -- what the package carries: [{ "productId": "<uuid>", "qty": 2 }]
  credits jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  op_id uuid unique
);
create trigger packages_moddatetime
  before update on public.packages
  for each row execute function extensions.moddatetime('updated_at');
create index packages_org_updated_idx on public.packages (org_id, updated_at);
create index packages_org_active_idx on public.packages (org_id) where deleted_at is null;

alter table public.packages add column if not exists local_id text;
create unique index if not exists packages_org_local_id_key
  on public.packages (org_id, local_id);

-- ---------- product / customer / order / order_item / staff columns ----------

-- "product" (goods off the shelf) or "service" (sold by appointment)
alter table public.products add column if not exists kind text;
alter table public.products add column if not exists duration_min int;

-- notes the stylist left on a visit: [{ "t": 1731400000000, "text": "..." }]
alter table public.customers add column if not exists visit_notes jsonb;
-- package credits the client still owns: [{ "packageId": "<uuid>", "remaining": 2 }]
alter table public.customers add column if not exists package_credits jsonb;

-- who served the visit
alter table public.orders add column if not exists staff_id uuid;
-- the appointment the visit came from
alter table public.orders add column if not exists appointment_id uuid;

-- who served the line
alter table public.order_items add column if not exists service_staff_id uuid;
-- what the line earned its stylist
alter table public.order_items add column if not exists commission_amt numeric(12,2);
-- the line was paid for with a package credit
alter table public.order_items add column if not exists use_credit boolean not null default false;
-- the package the line belongs to (a package purchase or a credit line)
alter table public.order_items add column if not exists package_id uuid;
-- how many units of the line a package credit paid for
alter table public.order_items add column if not exists credited_qty numeric(12,3);
-- "product" or "service" — a service never touches stock
alter table public.order_items add column if not exists kind text;

-- the services this staff member is trained for — product ids
alter table public.staff add column if not exists skills jsonb;
-- when this staff member works: [{ "day": 1, "start": "09:00", "end": "17:00" }]
alter table public.staff add column if not exists schedule jsonb;
-- the share of a service price this staff member earns, in percent
alter table public.staff add column if not exists commission_pct numeric(6,2);

-- ---------- row level security ----------

alter table public.appointments enable row level security;
alter table public.packages enable row level security;

create policy appointments_select on public.appointments for select
  using (org_id in (select public.current_org_ids()));
create policy appointments_insert on public.appointments for insert
  with check (public.has_org_role(org_id, array['owner','supervisor']));
create policy appointments_update on public.appointments for update
  using (public.has_org_role(org_id, array['owner','supervisor']))
  with check (public.has_org_role(org_id, array['owner','supervisor']));
create policy appointments_delete on public.appointments for delete using (false);

create policy packages_select on public.packages for select
  using (org_id in (select public.current_org_ids()));
create policy packages_insert on public.packages for insert
  with check (public.has_org_role(org_id, array['owner','supervisor']));
create policy packages_update on public.packages for update
  using (public.has_org_role(org_id, array['owner','supervisor']))
  with check (public.has_org_role(org_id, array['owner','supervisor']));
create policy packages_delete on public.packages for delete using (false);

-- ---------- realtime ----------

alter table public.appointments replica identity full;
alter table public.packages replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'appointments'
  ) then
    alter publication supabase_realtime add table public.appointments;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'packages'
  ) then
    alter publication supabase_realtime add table public.packages;
  end if;
end
$$;
