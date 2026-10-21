begin;
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111','owner@shop.test'),
  ('22222222-2222-2222-2222-222222222222','cashier@shop.test'),
  ('33333333-3333-3333-3333-333333333333','outsider@shop.test')
on conflict (id) do nothing;
insert into public.orgs (id, name) values
  ('aaaaaaaa-0000-0000-0000-000000000001','Org A'),
  ('aaaaaaaa-0000-0000-0000-000000000002','Org B')
on conflict (id) do nothing;
insert into public.memberships (org_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','owner'),
  ('aaaaaaaa-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','cashier'),
  ('aaaaaaaa-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333','owner')
on conflict do nothing;
insert into public.products (org_id, name, price, stock) values
  ('aaaaaaaa-0000-0000-0000-000000000001','Kivo',2.00,10),
  ('aaaaaaaa-0000-0000-0000-000000000002','OtherShopProduct',99.00,1)
on conflict do nothing;

do $$
declare
  v_count int; v_name text; v_bool boolean; res jsonb := '{}'::jsonb;
begin
  set local role authenticated;

  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  select count(*) into v_count from public.products;
  res := res || jsonb_build_object('owner_sees_only_own_org', v_count = 1);
  select name into v_name from public.products limit 1;
  res := res || jsonb_build_object('owner_sees_own_product', v_name = 'Kivo');

  set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
  select count(*) into v_count from public.products;
  res := res || jsonb_build_object('cashier_sees_only_own_org', v_count = 1);

  begin
    insert into public.products (org_id,name,price,stock)
      values ('aaaaaaaa-0000-0000-0000-000000000001','Hack',1,1);
    res := res || jsonb_build_object('cashier_cannot_insert_product', false);
  exception when insufficient_privilege then
    res := res || jsonb_build_object('cashier_cannot_insert_product', true);
  end;

  begin
    insert into public.orders (org_id, total) values ('aaaaaaaa-0000-0000-0000-000000000001', 10);
    res := res || jsonb_build_object('cashier_can_insert_order', true);
  exception when others then
    res := res || jsonb_build_object('cashier_can_insert_order', false);
  end;

  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  begin
    insert into public.products (org_id,name,price,stock)
      values ('aaaaaaaa-0000-0000-0000-000000000001','Legit',5,3);
    res := res || jsonb_build_object('owner_can_insert_product', true);
  exception when others then
    res := res || jsonb_build_object('owner_can_insert_product', false);
  end;

  delete from public.products where name = 'Legit';
  select count(*) into v_count from public.products where name = 'Legit';
  res := res || jsonb_build_object('hard_delete_blocked', v_count = 1);

  begin
    update public.products set deleted_at = now() where name = 'Legit';
    res := res || jsonb_build_object('soft_delete_allowed', true);
  exception when others then
    res := res || jsonb_build_object('soft_delete_allowed', false);
  end;

  update public.products set price = 7 where name = 'Kivo';
  select (updated_at = now()) into v_bool from public.products where name = 'Kivo';
  res := res || jsonb_build_object('updated_at_trigger_fires', v_bool);

  set local request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
  select count(*) into v_count from public.products;
  res := res || jsonb_build_object('outsider_sees_only_own_org', v_count = 1);
  select name into v_name from public.products limit 1;
  res := res || jsonb_build_object('outsider_sees_own_product', v_name = 'OtherShopProduct');
  select count(*) into v_count from public.products where name = 'Kivo';
  res := res || jsonb_build_object('outsider_cannot_see_other_org', v_count = 0);

  perform set_config('nova.rls_result', res::text, true);
end $$;

select current_setting('nova.rls_result')::jsonb as rls_live_check;
rollback;
