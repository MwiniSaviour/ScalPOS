-- 0014_pharmacy.sql — pharmacy data (batches, packs, prescriptions, allergies)
--
-- A pharmacy shop sells from batches with their own expiry, sells packs of a
-- base unit (a box = 10 strips), records a prescription reference on
-- prescription-only lines, and keeps patient allergies.
--
-- Every column is additive and nullable/defaulted, so a retail, restaurant or
-- salon shop is unaffected by this migration.
--
-- Idempotent: safe to re-run.

-- ---------- product_batches ----------

create table if not exists public.product_batches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  batch_no text not null default '',
  expiry date,
  qty numeric(12,3) not null default 0,
  cost numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  op_id uuid unique
);
create trigger product_batches_moddatetime
  before update on public.product_batches
  for each row execute function extensions.moddatetime('updated_at');
create index product_batches_org_updated_idx on public.product_batches (org_id, updated_at);
create index product_batches_org_active_idx on public.product_batches (org_id) where deleted_at is null;
create index product_batches_product_idx on public.product_batches (product_id);

-- The sync engine upserts on (org_id, local_id) like every other table.
alter table public.product_batches add column if not exists local_id text;
create unique index if not exists product_batches_org_local_id_key
  on public.product_batches (org_id, local_id);

-- ---------- purchase_orders ----------

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','sent','received')),
  -- lines: [{ "productId": "<uuid>", "packName": "Box" | null, "qty": 10, "unitCost": 3.5 }]
  lines jsonb not null default '[]'::jsonb,
  total numeric(12,2) not null default 0,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  op_id uuid unique
);
create trigger purchase_orders_moddatetime
  before update on public.purchase_orders
  for each row execute function extensions.moddatetime('updated_at');
create index purchase_orders_org_updated_idx on public.purchase_orders (org_id, updated_at);
create index purchase_orders_org_active_idx on public.purchase_orders (org_id) where deleted_at is null;

-- ---------- product / customer / order_item columns ----------

alter table public.products add column if not exists prescription_only boolean not null default false;
alter table public.products add column if not exists controlled boolean not null default false;
-- packs: [{ "name": "Box", "factor": 10 }]
alter table public.products add column if not exists packs jsonb;

alter table public.customers add column if not exists allergies text not null default '';

alter table public.order_items add column if not exists batch_allocations jsonb;
alter table public.order_items add column if not exists pack_name text;
alter table public.order_items add column if not exists prescription_ref text;
-- base units consumed (a pack line sells packs, stock moves in base units)
alter table public.order_items add column if not exists base_qty numeric(12,3);

-- ---------- stock_moves: batch id + expiry reason ----------

alter table public.stock_moves add column if not exists batch_id uuid;

-- The reason check was written before expiry existed — widen it.
alter table public.stock_moves drop constraint if exists stock_moves_reason_check;
alter table public.stock_moves
  add constraint stock_moves_reason_check
  check (reason in ('purchase','sale','adjust','damage','return','count','opening','expiry'));

-- ---------- row level security ----------

alter table public.product_batches enable row level security;

create policy product_batches_select on public.product_batches for select
  using (org_id in (select public.current_org_ids()));
create policy product_batches_insert on public.product_batches for insert
  with check (public.has_org_role(org_id, array['owner','supervisor']));
create policy product_batches_update on public.product_batches for update
  using (public.has_org_role(org_id, array['owner','supervisor']))
  with check (public.has_org_role(org_id, array['owner','supervisor']));
create policy product_batches_delete on public.product_batches for delete using (false);

create policy purchase_orders_select on public.purchase_orders for select
  using (org_id in (select public.current_org_ids()));
create policy purchase_orders_insert on public.purchase_orders for insert
  with check (public.has_org_role(org_id, array['owner','supervisor']));
create policy purchase_orders_update on public.purchase_orders for update
  using (public.has_org_role(org_id, array['owner','supervisor']))
  with check (public.has_org_role(org_id, array['owner','supervisor']));
create policy purchase_orders_delete on public.purchase_orders for delete using (false);

-- ---------- realtime ----------

alter table public.product_batches replica identity full;
alter table public.purchase_orders replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'product_batches'
  ) then
    alter publication supabase_realtime add table public.product_batches;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'purchase_orders'
  ) then
    alter publication supabase_realtime add table public.purchase_orders;
  end if;
end
$$;
