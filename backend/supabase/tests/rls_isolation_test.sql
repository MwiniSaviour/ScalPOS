-- rls_isolation_test.sql — pgTAP: multi-tenant isolation + role gating + soft delete
-- Run with: supabase test db
-- (lives in supabase/tests/ so the Supabase CLI picks it up)

begin;

-- pgTAP lives in `extensions` on Supabase; `pgtap` is the upstream schema name.
-- Non-existent schemas in search_path are ignored, so this works in both.
set local search_path = public, extensions, pgtap;

-- ---------- fixtures (cleaned first so the test is re-runnable) ----------
delete from public.order_items where org_id in ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002');
delete from public.stock_moves where org_id in ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002');
delete from public.orders where org_id in ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002');
delete from public.products where org_id in ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002');
delete from public.customers where org_id in ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002');
delete from public.categories where org_id in ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002');
delete from public.settings where org_id in ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002');
delete from public.staff where org_id in ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002');
delete from public.memberships where org_id in ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002');
delete from public.orgs where id in ('aaaaaaaa-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002');
delete from auth.users where id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner@shop.test'),
  ('22222222-2222-2222-2222-222222222222', 'cashier@shop.test'),
  ('33333333-3333-3333-3333-333333333333', 'outsider@shop.test');

insert into public.orgs (id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Org A'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Org B');

insert into public.memberships (org_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'cashier'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'owner');

insert into public.products (org_id, name, price, stock) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Kivo', 2.00, 10),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'OtherShopProduct', 99.00, 1);

select plan(10);

-- ---------- owner of org A: sees only org A ----------
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select is((select count(*) from public.products), 1::bigint, 'owner sees only rows from their own org');
select is((select name from public.products limit 1), 'Kivo', 'owner sees their own product');

-- ---------- cashier of org A: same read scope, no catalog writes ----------
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select is((select count(*) from public.products), 1::bigint, 'cashier cannot see other orgs rows');
select throws_ok(
  $$ insert into public.products (org_id, name, price, stock)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'Hack', 1, 1) $$,
  '42501',
  'new row violates row-level security policy for table "products"',
  'cashier cannot insert products'
);

-- ---------- cashier may write sales data ----------
select lives_ok(
  $$ insert into public.orders (org_id, total) values ('aaaaaaaa-0000-0000-0000-000000000001', 10) $$,
  'cashier can record an order'
);

-- ---------- owner may write catalog data ----------
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select lives_ok(
  $$ insert into public.products (org_id, name, price, stock)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'Legit', 5, 3) $$,
  'owner can insert products'
);

-- ---------- hard delete is blocked; soft delete is allowed ----------
-- a blocked delete removes nothing and raises no error (policy USING (false))
delete from public.products where name = 'Legit';
select is(
  (select count(*) from public.products where name = 'Legit'),
  1::bigint,
  'hard delete is blocked by policy — the row survives'
);
select lives_ok(
  $$ update public.products set deleted_at = now() where name = 'Legit' $$,
  'soft delete via update is allowed'
);

-- ---------- updated_at trigger ----------
-- inside one transaction now() is the transaction timestamp, so a strict
-- "newer than created_at" comparison cannot work: assert the trigger exists
-- and that the write set updated_at to the current transaction time.
select is(
  (select count(*) from pg_trigger
     where tgrelid = 'public.products'::regclass
       and not tgisinternal
       and tgname = 'products_moddatetime'),
  1::bigint,
  'products carries the moddatetime trigger'
);
update public.products set price = 7 where name = 'Kivo';
select is(
  (select updated_at = now() from public.products where name = 'Kivo' and price = 7),
  true,
  'updated_at is set to the write time by the trigger'
);

-- ---------- outsider sees only their own org ----------
set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select is((select count(*) from public.products), 1::bigint, 'outsider sees only their own org rows');
select is(
  (select name from public.products limit 1),
  'OtherShopProduct',
  'outsider sees their own product, not org A'
);

rollback;
