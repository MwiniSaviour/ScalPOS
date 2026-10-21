-- 0002_rls.sql — Row Level Security (multi-tenant)
--
-- Every policy resolves membership through SECURITY DEFINER helpers.
-- Inlining `select ... from public.memberships` inside a policy on
-- public.memberships makes the policy recurse into itself
-- ("infinite recursion detected in policy") — the helpers avoid that by
-- running with the definer's rights, which bypass RLS.

-- Enable RLS on every table
alter table public.orgs enable row level security;
alter table public.memberships enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.stock_moves enable row level security;
alter table public.settings enable row level security;
alter table public.staff enable row level security;

-- ---------- helpers ----------

-- orgs the current user belongs to (active memberships only)
create or replace function public.current_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id
  from public.memberships
  where user_id = auth.uid()
    and deleted_at is null
$$;

-- true when the current user holds any of the given roles in any org
create or replace function public.has_role(roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where user_id = auth.uid()
      and deleted_at is null
      and role = any (roles)
  )
$$;

-- true when the current user holds one of the given roles in the given org
create or replace function public.has_org_role(org uuid, roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where user_id = auth.uid()
      and org_id = org
      and deleted_at is null
      and role = any (roles)
  )
$$;

-- grant execute to the Supabase auth roles when they exist (they do on
-- Supabase; a plain Postgres check like ours has no 'authenticated' role)
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.current_org_ids() to authenticated;
    grant execute on function public.has_role(text[]) to authenticated;
    grant execute on function public.has_org_role(uuid, text[]) to authenticated;
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant execute on function public.current_org_ids() to anon;
    grant execute on function public.has_role(text[]) to anon;
    grant execute on function public.has_org_role(uuid, text[]) to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.current_org_ids() to service_role;
    grant execute on function public.has_role(text[]) to service_role;
    grant execute on function public.has_org_role(uuid, text[]) to service_role;
  end if;
end $$;

-- ---------- orgs ----------
create policy orgs_select on public.orgs for select
  using (id in (select public.current_org_ids()));
create policy orgs_insert on public.orgs for insert
  with check (false);
create policy orgs_update on public.orgs for update
  using (public.has_org_role(id, array['owner']))
  with check (public.has_org_role(id, array['owner']));
create policy orgs_delete on public.orgs for delete using (false);

-- ---------- memberships ----------
create policy memberships_select on public.memberships for select
  using (org_id in (select public.current_org_ids()));
create policy memberships_insert on public.memberships for insert
  with check (public.has_org_role(org_id, array['owner','supervisor']));
create policy memberships_update on public.memberships for update
  using (public.has_org_role(org_id, array['owner']))
  with check (public.has_org_role(org_id, array['owner']));
create policy memberships_delete on public.memberships for delete using (false);

-- ---------- categories (owner/supervisor write) ----------
create policy categories_select on public.categories for select
  using (org_id in (select public.current_org_ids()));
create policy categories_insert on public.categories for insert
  with check (public.has_org_role(org_id, array['owner','supervisor']));
create policy categories_update on public.categories for update
  using (public.has_org_role(org_id, array['owner','supervisor']))
  with check (public.has_org_role(org_id, array['owner','supervisor']));
create policy categories_delete on public.categories for delete using (false);

-- ---------- products (owner/supervisor write) ----------
create policy products_select on public.products for select
  using (org_id in (select public.current_org_ids()));
create policy products_insert on public.products for insert
  with check (public.has_org_role(org_id, array['owner','supervisor']));
create policy products_update on public.products for update
  using (public.has_org_role(org_id, array['owner','supervisor']))
  with check (public.has_org_role(org_id, array['owner','supervisor']));
create policy products_delete on public.products for delete using (false);

-- ---------- customers (cashier+ write) ----------
create policy customers_select on public.customers for select
  using (org_id in (select public.current_org_ids()));
create policy customers_insert on public.customers for insert
  with check (public.has_org_role(org_id, array['owner','supervisor','cashier']));
create policy customers_update on public.customers for update
  using (public.has_org_role(org_id, array['owner','supervisor','cashier']))
  with check (public.has_org_role(org_id, array['owner','supervisor','cashier']));
create policy customers_delete on public.customers for delete using (false);

-- ---------- orders (cashier+ write) ----------
create policy orders_select on public.orders for select
  using (org_id in (select public.current_org_ids()));
create policy orders_insert on public.orders for insert
  with check (public.has_org_role(org_id, array['owner','supervisor','cashier']));
create policy orders_update on public.orders for update
  using (public.has_org_role(org_id, array['owner','supervisor','cashier']))
  with check (public.has_org_role(org_id, array['owner','supervisor','cashier']));
create policy orders_delete on public.orders for delete using (false);

-- ---------- order_items (cashier+ write) ----------
create policy order_items_select on public.order_items for select
  using (org_id in (select public.current_org_ids()));
create policy order_items_insert on public.order_items for insert
  with check (public.has_org_role(org_id, array['owner','supervisor','cashier']));
create policy order_items_update on public.order_items for update
  using (public.has_org_role(org_id, array['owner','supervisor','cashier']))
  with check (public.has_org_role(org_id, array['owner','supervisor','cashier']));
create policy order_items_delete on public.order_items for delete using (false);

-- ---------- stock_moves (owner/supervisor write) ----------
create policy stock_moves_select on public.stock_moves for select
  using (org_id in (select public.current_org_ids()));
create policy stock_moves_insert on public.stock_moves for insert
  with check (public.has_org_role(org_id, array['owner','supervisor']));
create policy stock_moves_update on public.stock_moves for update
  using (public.has_org_role(org_id, array['owner','supervisor']))
  with check (public.has_org_role(org_id, array['owner','supervisor']));
create policy stock_moves_delete on public.stock_moves for delete using (false);

-- ---------- settings (owner/supervisor write) ----------
create policy settings_select on public.settings for select
  using (org_id in (select public.current_org_ids()));
create policy settings_insert on public.settings for insert
  with check (public.has_org_role(org_id, array['owner','supervisor']));
create policy settings_update on public.settings for update
  using (public.has_org_role(org_id, array['owner','supervisor']))
  with check (public.has_org_role(org_id, array['owner','supervisor']));
create policy settings_delete on public.settings for delete using (false);

-- ---------- staff (owner/supervisor write) ----------
create policy staff_select on public.staff for select
  using (org_id in (select public.current_org_ids()));
create policy staff_insert on public.staff for insert
  with check (public.has_org_role(org_id, array['owner','supervisor']));
create policy staff_update on public.staff for update
  using (public.has_org_role(org_id, array['owner','supervisor']))
  with check (public.has_org_role(org_id, array['owner','supervisor']));
create policy staff_delete on public.staff for delete using (false);
