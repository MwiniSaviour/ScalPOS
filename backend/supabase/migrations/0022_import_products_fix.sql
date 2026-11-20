create or replace function public.import_products(
  p_org uuid,
  p_rows jsonb,
  p_update_existing boolean default false,
  p_set_stock boolean default false,
  p_create_categories boolean default true
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb;
  v_name text;
  v_sku text;
  v_barcode text;
  v_price numeric;
  v_cost numeric;
  v_stock integer;
  v_low integer;
  v_unit text;
  v_description text;
  v_category text;
  v_active boolean;
  v_category_id uuid;
  v_product_id uuid;
  v_current_stock integer;
  v_created integer := 0;
  v_updated integer := 0;
  v_skipped integer := 0;
begin
  if coalesce(auth.jwt() ->> 'sub', '') = '' then
    raise exception 'not authenticated';
  end if;
  if not public.has_org_role(p_org, array['owner', 'supervisor']) then
    raise exception 'not allowed';
  end if;
  if jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'rows must be an array';
  end if;

  for v_row in select value from jsonb_array_elements(p_rows) loop
    v_name := nullif(btrim(coalesce(v_row ->> 'name', '')), '');
    if v_name is null then
      v_skipped := v_skipped + 1;
      continue;
    end if;
    v_sku := nullif(btrim(coalesce(v_row ->> 'sku', '')), '');
    v_barcode := nullif(btrim(coalesce(v_row ->> 'barcode', '')), '');
    v_price := coalesce((v_row ->> 'price')::numeric, 0);
    v_cost := coalesce((v_row ->> 'cost_price')::numeric, 0);
    v_stock := greatest(coalesce((v_row ->> 'stock')::integer, 0), 0);
    v_low := greatest(coalesce((v_row ->> 'low_stock_at')::integer, 5), 0);
    v_unit := nullif(btrim(coalesce(v_row ->> 'unit', '')), '');
    v_description := nullif(btrim(coalesce(v_row ->> 'description', '')), '');
    v_category := nullif(btrim(coalesce(v_row ->> 'category', '')), '');
    v_active := coalesce((v_row ->> 'active')::boolean, true);

    v_category_id := null;
    if v_category is not null then
      select id into v_category_id
      from public.categories
      where org_id = p_org
        and deleted_at is null
        and lower(btrim(name)) = lower(v_category)
      limit 1;
      if v_category_id is null and p_create_categories then
        insert into public.categories (org_id, local_id, name, color)
        values (p_org, 'imp-cat-' || gen_random_uuid()::text, v_category, '#059669')
        returning id into v_category_id;
      end if;
    end if;

    v_product_id := null;
    if v_barcode is not null then
      select id into v_product_id
      from public.products
      where org_id = p_org
        and deleted_at is null
        and lower(barcode) = lower(v_barcode)
      order by case when lower(sku) = lower(v_sku) then 0 else 1 end
      limit 1;
    end if;
    if v_product_id is null and v_sku is not null then
      select id into v_product_id
      from public.products
      where org_id = p_org
        and deleted_at is null
        and lower(sku) = lower(v_sku)
      limit 1;
    end if;

    if v_product_id is not null then
      if not p_update_existing then
        v_skipped := v_skipped + 1;
        continue;
      end if;
      select stock into v_current_stock
      from public.products
      where id = v_product_id and org_id = p_org and deleted_at is null
      for update;
      update public.products
      set name = v_name,
          price = v_price,
          cost = v_cost,
          unit = coalesce(v_unit, unit),
          description = coalesce(v_description, ''),
          low_stock_at = v_low,
          active = v_active,
          category_id = coalesce(v_category_id, category_id),
          sku = coalesce(v_sku, sku),
          barcode = coalesce(v_barcode, barcode),
          updated_at = now()
      where id = v_product_id and org_id = p_org and deleted_at is null;
      v_updated := v_updated + 1;
    else
      insert into public.products (
        org_id, local_id, name, sku, barcode, price, cost, stock,
        category_id, image_path, description, unit, low_stock_at,
        active, prescription_only, controlled, packs, modifiers, variants,
        unavailable_until
      ) values (
        p_org, 'imp-' || gen_random_uuid()::text, v_name,
        coalesce(v_sku, upper(substr(gen_random_uuid()::text, 1, 8))),
        coalesce(v_barcode, ''), v_price, v_cost, v_stock,
        v_category_id, '', coalesce(v_description, ''), coalesce(v_unit, 'pcs'), v_low,
        v_active, false, false, null, null, null, null
      )
      returning id into v_product_id;
      if v_stock > 0 then
        insert into public.stock_moves (org_id, product_id, qty, reason, ref, occurred_at)
        values (p_org, v_product_id, v_stock, 'opening', 'import', now());
      end if;
      v_created := v_created + 1;
    end if;
  end loop;

  return jsonb_build_object('created', v_created, 'updated', v_updated, 'skipped', v_skipped);
end;
$$;

revoke all on function public.import_products(uuid, jsonb, boolean, boolean, boolean) from public;
grant execute on function public.import_products(uuid, jsonb, boolean, boolean, boolean) to authenticated;
