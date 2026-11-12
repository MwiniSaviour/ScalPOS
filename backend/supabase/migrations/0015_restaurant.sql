-- 0015_restaurant.sql — restaurant data (tables, recipes, order types, kitchen tickets)
--
-- A restaurant shop serves order types (dine-in / takeaway / delivery), keeps
-- dining tables with open tabs, runs a kitchen ticket pipeline, offers
-- modifiers and size variants on menu items, and consumes ingredient stock
-- through recipes.
--
-- Every column is additive and nullable/defaulted, so a retail, pharmacy or
-- salon shop is unaffected by this migration.
--
-- Idempotent: safe to re-run.

-- ---------- restaurant_tables ----------

create table if not exists public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null default '',
  seats int not null default 4,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  op_id uuid unique
);
create trigger restaurant_tables_moddatetime
  before update on public.restaurant_tables
  for each row execute function extensions.moddatetime('updated_at');
create index restaurant_tables_org_updated_idx on public.restaurant_tables (org_id, updated_at);
create index restaurant_tables_org_active_idx on public.restaurant_tables (org_id) where deleted_at is null;

alter table public.restaurant_tables add column if not exists local_id text;
create unique index if not exists restaurant_tables_org_local_id_key
  on public.restaurant_tables (org_id, local_id);

-- ---------- recipes ----------

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  -- lines: [{ "ingredientProductId": "<uuid>", "qty": 150, "wastePct": 5 }]
  lines jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  op_id uuid unique
);
create trigger recipes_moddatetime
  before update on public.recipes
  for each row execute function extensions.moddatetime('updated_at');
create index recipes_org_updated_idx on public.recipes (org_id, updated_at);
create index recipes_org_active_idx on public.recipes (org_id) where deleted_at is null;
create index recipes_product_idx on public.recipes (product_id);

alter table public.recipes add column if not exists local_id text;
create unique index if not exists recipes_org_local_id_key
  on public.recipes (org_id, local_id);

-- ---------- product / order / order_item columns ----------

-- modifiers: [{ "id": "m1", "name": "No onions", "priceDelta": 0 }]
alter table public.products add column if not exists modifiers jsonb;
-- variants:  [{ "id": "v1", "name": "Large", "priceDelta": 50 }]
alter table public.products add column if not exists variants jsonb;
-- the item is off the menu until this date (inclusive)
alter table public.products add column if not exists unavailable_until date;

alter table public.orders add column if not exists order_type text;
alter table public.orders add column if not exists table_id uuid;
alter table public.orders add column if not exists ticket_status text;

alter table public.order_items add column if not exists modifier_ids jsonb;
alter table public.order_items add column if not exists modifier_names jsonb;
alter table public.order_items add column if not exists variant_id text;
alter table public.order_items add column if not exists variant_name text;
-- ingredients this line consumed: [{ "productId": "<uuid>", "qty": 315 }]
alter table public.order_items add column if not exists recipe_consumption jsonb;

-- ---------- row level security ----------

alter table public.restaurant_tables enable row level security;
alter table public.recipes enable row level security;

create policy restaurant_tables_select on public.restaurant_tables for select
  using (org_id in (select public.current_org_ids()));
create policy restaurant_tables_insert on public.restaurant_tables for insert
  with check (public.has_org_role(org_id, array['owner','supervisor']));
create policy restaurant_tables_update on public.restaurant_tables for update
  using (public.has_org_role(org_id, array['owner','supervisor']))
  with check (public.has_org_role(org_id, array['owner','supervisor']));
create policy restaurant_tables_delete on public.restaurant_tables for delete using (false);

create policy recipes_select on public.recipes for select
  using (org_id in (select public.current_org_ids()));
create policy recipes_insert on public.recipes for insert
  with check (public.has_org_role(org_id, array['owner','supervisor']));
create policy recipes_update on public.recipes for update
  using (public.has_org_role(org_id, array['owner','supervisor']))
  with check (public.has_org_role(org_id, array['owner','supervisor']));
create policy recipes_delete on public.recipes for delete using (false);

-- ---------- realtime ----------

alter table public.restaurant_tables replica identity full;
alter table public.recipes replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'restaurant_tables'
  ) then
    alter publication supabase_realtime add table public.restaurant_tables;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'recipes'
  ) then
    alter publication supabase_realtime add table public.recipes;
  end if;
end
$$;
