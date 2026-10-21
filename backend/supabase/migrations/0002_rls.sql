-- 0002_rls.sql — Row Level Security (multi-tenant)

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

-- Helper predicate (inlined in policies):
--   org_id in (select org_id from public.memberships where user_id = auth.uid() and deleted_at is null)

-- ---------- orgs ----------
create policy orgs_select on public.orgs for select
  using (id in (select org_id from public.memberships where user_id = auth.uid() and deleted_at is null));
create policy orgs_insert on public.orgs for insert
  with check (false);
create policy orgs_update on public.orgs for update
  using (id in (select org_id from public.memberships where user_id = auth.uid() and role = 'owner' and deleted_at is null))
  with check (id in (select org_id from public.memberships where user_id = auth.uid() and role = 'owner' and deleted_at is null));
create policy orgs_delete on public.orgs for delete using (false);

-- ---------- memberships ----------
create policy memberships_select on public.memberships for select
  using (org_id in (select org_id from public.memberships m where m.user_id = auth.uid() and m.deleted_at is null));
create policy memberships_insert on public.memberships for insert
  with check (org_id in (select org_id from public.memberships m where m.user_id = auth.uid() and m.role in ('owner','supervisor') and m.deleted_at is null));
create policy memberships_update on public.memberships for update
  using (org_id in (select org_id from public.memberships m where m.user_id = auth.uid() and m.role = 'owner' and m.deleted_at is null))
  with check (org_id in (select org_id from public.memberships m where m.user_id = auth.uid() and m.role = 'owner' and m.deleted_at is null));
create policy memberships_delete on public.memberships for delete using (false);

-- ---------- categories (owner/supervisor write) ----------
create policy categories_select on public.categories for select
  using (org_id in (select org_id from public.memberships where user_id = auth.uid() and deleted_at is null));
create policy categories_insert on public.categories for insert
  with check (org_id in (select org_id from public.memberships where user_id = auth.uid() and role in ('owner','supervisor') and deleted_at is null));
create policy categories_update on public.categories for update
  using (org_id in (select org_id from public.memberships where user_id = auth.uid() and role in ('owner','supervisor') and deleted_at is null))
  with check (org_id in (select org_id from public.memberships where user_id = auth.uid() and role in ('owner','supervisor') and deleted_at is null));
create policy categories_delete on public.categories for delete using (false);

-- ---------- products (owner/supervisor write) ----------
create policy products_select on public.products for select
  using (org_id in (select org_id from public.memberships where user_id = auth.uid() and deleted_at is null));
create policy products_insert on public.products for insert
  with check (org_id in (select org_id from public.memberships where user_id = auth.uid() and role in ('owner','supervisor') and deleted_at is null));
create policy products_update on public.products for update
  using (org_id in (select org_id from public.memberships where user_id = auth.uid() and role in ('owner','supervisor') and deleted_at is null))
  with check (org_id in (select org_id from public.memberships where user_id = auth.uid() and role in ('owner','supervisor') and deleted_at is null));
create policy products_delete on public.products for delete using (false);

-- ---------- customers (cashier+ write) ----------
create policy customers_select on public.customers for select
  using (org_id in (select org_id from public.memberships where user_id = auth.uid() and deleted_at is null));
create policy customers_insert on public.customers for insert
  with check (org_id in (select org_id from public.memberships where user_id = auth.uid() and role in ('owner','supervisor','cashier') and deleted_at is null));
create policy customers_update on public.customers for update
  using (org_id in (select org_id from public.memberships where user_id = auth.uid() and role in ('owner','supervisor','cashier') and deleted_at is null))
  with check (org_id in (select org_id from public.memberships where user_id = auth.uid() and role in ('owner','supervisor','cashier') and deleted_at is null));
create policy customers_delete on public.customers for delete using (false);

-- ---------- orders (cashier+ write) ----------
create policy orders_select on public.orders for select
  using (org_id in (select org_id from public.memberships where user_id = auth.uid() and deleted_at is null));
create policy orders_insert on public.orders for insert
  with check (org_id in (select org_id from public.memberships where user_id = auth.uid() and role in ('owner','supervisor','cashier') and deleted_at is null));
create policy orders_update on public.orders for update
  using (org_id in (select org_id from public.memberships where user_id = auth.uid() and role in ('owner','supervisor','cashier') and deleted_at is null))
  with check (org_id in (select org_id from public.memberships where user_id = auth.uid() and role in ('owner','supervisor','cashier') and deleted_at is null));
create policy orders_delete on public.orders for delete using (false);

-- ---------- order_items (cashier+ write) ----------
create policy order_items_select on public.order_items for select
  using (org_id in (select org_id from public.memberships where user_id = auth.uid() and deleted_at is null));
create policy order_items_insert on public.order_items for insert
  with check (org_id in (select org_id from public.memberships where user_id = auth.uid() and role in ('owner','supervisor','cashier') and deleted_at is null));
create policy order_items_update on public.order_items for update
  using (org_id in (select org_id from public.memberships where user_id = auth.uid() and role in ('owner','supervisor','cashier') and deleted_at is null))
  with check (org_id in (select org_id from public.memberships where user_id = auth.uid() and role in ('owner','supervisor','cashier') and deleted_at is null));
create policy order_items_delete on public.order_items for delete using (false);

-- ---------- stock_moves (owner/supervisor write) ----------
create policy stock_moves_select on public.stock_moves for select
  using (org_id in (select org_id from public.memberships where user_id = auth.uid() and deleted_at is null));
create policy stock_moves_insert on public.stock_moves for insert
  with check (org_id in (select org_id from public.memberships where user_id = auth.uid() and role in ('owner','supervisor') and deleted_at is null));
create policy stock_moves_update on public.stock_moves for update
  using (org_id in (select org_id from public.memberships where user_id = auth.uid() and role in ('owner','supervisor') and deleted_at is null))
  with check (org_id in (select org_id from public.memberships where user_id = auth.uid() and role in ('owner','supervisor') and deleted_at is null));
create policy stock_moves_delete on public.stock_moves for delete using (false);

-- ---------- settings (owner/supervisor write) ----------
create policy settings_select on public.settings for select
  using (org_id in (select org_id from public.memberships where user_id = auth.uid() and deleted_at is null));
create policy settings_insert on public.settings for insert
  with check (org_id in (select org_id from public.memberships where user_id = auth.uid() and role in ('owner','supervisor') and deleted_at is null));
create policy settings_update on public.settings for update
  using (org_id in (select org_id from public.memberships where user_id = auth.uid() and role in ('owner','supervisor') and deleted_at is null))
  with check (org_id in (select org_id from public.memberships where user_id = auth.uid() and role in ('owner','supervisor') and deleted_at is null));
create policy settings_delete on public.settings for delete using (false);

-- ---------- staff (owner/supervisor write) ----------
create policy staff_select on public.staff for select
  using (org_id in (select org_id from public.memberships where user_id = auth.uid() and deleted_at is null));
create policy staff_insert on public.staff for insert
  with check (org_id in (select org_id from public.memberships where user_id = auth.uid() and role in ('owner','supervisor') and deleted_at is null));
create policy staff_update on public.staff for update
  using (org_id in (select org_id from public.memberships where user_id = auth.uid() and role in ('owner','supervisor') and deleted_at is null))
  with check (org_id in (select org_id from public.memberships where user_id = auth.uid() and role in ('owner','supervisor') and deleted_at is null));
create policy staff_delete on public.staff for delete using (false);
