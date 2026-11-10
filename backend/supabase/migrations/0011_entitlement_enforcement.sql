-- 0011_entitlement_enforcement.sql — plan-level entitlement enforcement
--
-- Desktop and staff/invite features are Enterprise-only; a new org gets a
-- 7-day trial anchored on orgs.trial_started_at (client-sent, clamped by
-- bootstrap-org) falling back to created_at. Demo orgs (name prefixed
-- "Demo — ", em dash, see bootstrap-org) always keep cloud access.
--
-- Enforcement lives in one SECURITY DEFINER predicate, public.org_has_cloud,
-- which the amended RLS policies append after the membership checks.
-- Edges (invite-member, accept-invite, check-subscription) keep their own
-- copy of the same logic because Deno functions cannot import from the
-- database.

-- ---------- trial anchor ----------

alter table public.orgs add column if not exists trial_started_at timestamptz;

-- ---------- testers ----------

-- Manual allow-list read only by the service role (edges); RLS enabled with
-- no policies so no client can read or write it directly. The checker joins
-- memberships.email to it case-insensitively, so email is stored lowercase.
create table if not exists public.testers (
  email text primary key,
  expires_at timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now()
);
alter table public.testers enable row level security;

-- ---------- entitlement predicate ----------

-- true when the org may use cloud/team features at all:
--   demo orgs (static name prefix)         — always
--   active enterprise subscription         — always
--   not yet 7 days past the trial anchor   — trial window
--   any active member is on the tester list with unexpired access
create or replace function public.org_has_cloud(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.orgs o
    where o.id = org
      and (
        o.name like 'Demo — %'
        or exists (
          select 1 from public.subscriptions s
          where s.org_id = o.id
            and s.plan = 'enterprise'
            and s.status = 'active'
        )
        or coalesce(o.trial_started_at, o.created_at) > now() - interval '7 days'
      )
  )
  or exists (
    select 1
    from public.memberships m
    join public.testers t on lower(m.email) = lower(t.email)
    where m.org_id = org
      and m.deleted_at is null
      and t.expires_at > now()
  )
$$;

-- ----------
do $$ begin if exists (select 1 from pg_roles where rolname = 'authenticated') then
  grant execute on function public.org_has_cloud(uuid) to authenticated;
end if;
if exists (select 1 from pg_roles where rolname = 'anon') then
  grant execute on function public.org_has_cloud(uuid) to anon;
end if;
if exists (select 1 from pg_roles where rolname = 'service_role') then
  grant execute on function public.org_has_cloud(uuid) to service_role;
end if;
end $$;

-- ---------- core-table policies (select/insert/update get entitlement gate) ----------
--
-- Postgres cannot create-or-replace a policy, so each amended policy is
-- dropped and recreated with `and public.org_has_cloud(org_id)` appended.
-- orgs / memberships / delete policies are untouched: delete policies are
-- all `using (false)` anyway, and memberships writes go through the edges
-- (service role bypasses RLS).

-- categories
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories for select
  using (org_id in (select public.current_org_ids()) and public.org_has_cloud(org_id));
drop policy if exists categories_insert on public.categories;
create policy categories_insert on public.categories for insert
  with check (public.has_org_role(org_id, array['owner','supervisor']) and public.org_has_cloud(org_id));
drop policy if exists categories_update on public.categories;
create policy categories_update on public.categories for update
  using (public.has_org_role(org_id, array['owner','supervisor']) and public.org_has_cloud(org_id))
  with check (public.has_org_role(org_id, array['owner','supervisor']) and public.org_has_cloud(org_id));

-- products
drop policy if exists products_select on public.products;
create policy products_select on public.products for select
  using (org_id in (select public.current_org_ids()) and public.org_has_cloud(org_id));
drop policy if exists products_insert on public.products;
create policy products_insert on public.products for insert
  with check (public.has_org_role(org_id, array['owner','supervisor']) and public.org_has_cloud(org_id));
drop policy if exists products_update on public.products;
create policy products_update on public.products for update
  using (public.has_org_role(org_id, array['owner','supervisor']) and public.org_has_cloud(org_id))
  with check (public.has_org_role(org_id, array['owner','supervisor']) and public.org_has_cloud(org_id));

-- customers (cashier+ write)
drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers for select
  using (org_id in (select public.current_org_ids()) and public.org_has_cloud(org_id));
drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers for insert
  with check (public.has_org_role(org_id, array['owner','supervisor','cashier']) and public.org_has_cloud(org_id));
drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers for update
  using (public.has_org_role(org_id, array['owner','supervisor','cashier']) and public.org_has_cloud(org_id))
  with check (public.has_org_role(org_id, array['owner','supervisor','cashier']) and public.org_has_cloud(org_id));

-- orders (cashier+ write)
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders for select
  using (org_id in (select public.current_org_ids()) and public.org_has_cloud(org_id));
drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders for insert
  with check (public.has_org_role(org_id, array['owner','supervisor','cashier']) and public.org_has_cloud(org_id));
drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders for update
  using (public.has_org_role(org_id, array['owner','supervisor','cashier']) and public.org_has_cloud(org_id))
  with check (public.has_org_role(org_id, array['owner','supervisor','cashier']) and public.org_has_cloud(org_id));

-- order_items (cashier+ write)
drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items for select
  using (org_id in (select public.current_org_ids()) and public.org_has_cloud(org_id));
drop policy if exists order_items_insert on public.order_items;
create policy order_items_insert on public.order_items for insert
  with check (public.has_org_role(org_id, array['owner','supervisor','cashier']) and public.org_has_cloud(org_id));
drop policy if exists order_items_update on public.order_items;
create policy order_items_update on public.order_items for update
  using (public.has_org_role(org_id, array['owner','supervisor','cashier']) and public.org_has_cloud(org_id))
  with check (public.has_org_role(org_id, array['owner','supervisor','cashier']) and public.org_has_cloud(org_id));

-- stock_moves
drop policy if exists stock_moves_select on public.stock_moves;
create policy stock_moves_select on public.stock_moves for select
  using (org_id in (select public.current_org_ids()) and public.org_has_cloud(org_id));
drop policy if exists stock_moves_insert on public.stock_moves;
create policy stock_moves_insert on public.stock_moves for insert
  with check (public.has_org_role(org_id, array['owner','supervisor']) and public.org_has_cloud(org_id));
drop policy if exists stock_moves_update on public.stock_moves;
create policy stock_moves_update on public.stock_moves for update
  using (public.has_org_role(org_id, array['owner','supervisor']) and public.org_has_cloud(org_id))
  with check (public.has_org_role(org_id, array['owner','supervisor']) and public.org_has_cloud(org_id));

-- settings
drop policy if exists settings_select on public.settings;
create policy settings_select on public.settings for select
  using (org_id in (select public.current_org_ids()) and public.org_has_cloud(org_id));
drop policy if exists settings_insert on public.settings;
create policy settings_insert on public.settings for insert
  with check (public.has_org_role(org_id, array['owner','supervisor']) and public.org_has_cloud(org_id));
drop policy if exists settings_update on public.settings;
create policy settings_update on public.settings for update
  using (public.has_org_role(org_id, array['owner','supervisor']) and public.org_has_cloud(org_id))
  with check (public.has_org_role(org_id, array['owner','supervisor']) and public.org_has_cloud(org_id));

-- staff
drop policy if exists staff_select on public.staff;
create policy staff_select on public.staff for select
  using (org_id in (select public.current_org_ids()) and public.org_has_cloud(org_id));
drop policy if exists staff_insert on public.staff;
create policy staff_insert on public.staff for insert
  with check (public.has_org_role(org_id, array['owner','supervisor']) and public.org_has_cloud(org_id));
drop policy if exists staff_update on public.staff;
create policy staff_update on public.staff for update
  using (public.has_org_role(org_id, array['owner','supervisor']) and public.org_has_cloud(org_id))
  with check (public.has_org_role(org_id, array['owner','supervisor']) and public.org_has_cloud(org_id));
