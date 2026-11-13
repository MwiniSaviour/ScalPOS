-- 0013b_suppliers.sql — suppliers referenced by purchase_orders (0014)
--
-- 0014_pharmacy.sql creates purchase_orders with an FK to public.suppliers,
-- so the table must exist first. Kept in its own migration instead of
-- editing the already-applied 0014 file.
--
-- Suppliers belong to an org: a shop tracks who it buys stock from.
-- Used by desktop /dashboard/suppliers and pharmacy purchase orders.
--
-- Idempotent: safe to re-run.

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null default '',
  contact_person text,
  email text,
  phone text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  op_id uuid unique
);
create trigger suppliers_moddatetime
  before update on public.suppliers
  for each row execute function extensions.moddatetime('updated_at');
create index suppliers_org_updated_idx on public.suppliers (org_id, updated_at);
create index suppliers_org_active_idx on public.suppliers (org_id) where deleted_at is null;

-- The sync engine upserts on (org_id, local_id) like every other table.
alter table public.suppliers add column if not exists local_id text;
create unique index if not exists suppliers_org_local_id_key
  on public.suppliers (org_id, local_id);

-- ---------- row level security ----------

alter table public.suppliers enable row level security;

create policy suppliers_select on public.suppliers for select
  using (org_id in (select public.current_org_ids()));
create policy suppliers_insert on public.suppliers for insert
  with check (public.has_org_role(org_id, array['owner','supervisor']));
create policy suppliers_update on public.suppliers for update
  using (public.has_org_role(org_id, array['owner','supervisor']))
  with check (public.has_org_role(org_id, array['owner','supervisor']));
create policy suppliers_delete on public.suppliers for delete using (false);

-- ---------- realtime ----------

alter table public.suppliers replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'suppliers'
  ) then
    alter publication supabase_realtime add table public.suppliers;
  end if;
end
$$;
