-- 0019_salon_order_lines.sql — make place_order_tx carry salon line fields
--
-- 0016 added the columns but left place_order_tx inserting only the original
-- product columns. Desktop "Convert to sale" goes through that RPC, so the
-- stylist, commission snapshot, credit and service-kind markers were dropped
-- on the way into order_items. This replaces the function with the same
-- signature and behaviour plus those columns; non-salon callers are unchanged.
--
-- Services never touch stock, so they also skip the stock decrement/move.

create or replace function public.place_order_tx(
  p_org uuid,
  p_local_id text,
  p_customer_id uuid,
  p_items jsonb,
  p_payments jsonb,
  p_discount numeric,
  p_tax numeric,
  p_note text,
  p_next_order_no bigint
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order_id uuid;
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_paid numeric := 0;
  v_status text;
  v_pay_status text;
  v_item jsonb;
  v_idx int := 0;
  v_product_id uuid;
  v_qty numeric;
  v_price numeric;
  v_cost numeric;
begin
  if coalesce(auth.jwt() ->> 'sub', '') = '' then
    raise exception 'not authenticated';
  end if;
  if not public.has_org_role(p_org, array['owner','supervisor','cashier']) then
    raise exception 'not allowed';
  end if;
  if p_local_id is null or btrim(p_local_id) = '' then
    raise exception 'order id required';
  end if;
  if coalesce(jsonb_typeof(p_items), '') <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty order';
  end if;

  select coalesce(sum((i->>'qty')::numeric * (i->>'price')::numeric), 0)
    into v_subtotal
    from jsonb_array_elements(p_items) i;
  v_total := greatest(v_subtotal - coalesce(p_discount, 0), 0) + coalesce(p_tax, 0);
  select coalesce(sum((x->>'amount')::numeric), 0)
    into v_paid
    from jsonb_array_elements(coalesce(p_payments, '[]'::jsonb)) x;
  v_pay_status := case when v_paid >= v_total then 'paid' when v_paid > 0 then 'partial' else 'unpaid' end;
  v_status := case when v_paid >= v_total then 'completed' else 'pending' end;

  insert into public.orders (
    org_id, local_id, customer_id, subtotal, discount, total, tax,
    status, payments, pay_status, completed_at, note
  ) values (
    p_org, p_local_id, p_customer_id, v_subtotal, coalesce(p_discount, 0), v_total, coalesce(p_tax, 0),
    v_status, coalesce(p_payments, '[]'::jsonb), v_pay_status,
    case when v_status = 'completed' then now() else null end, coalesce(p_note, '')
  )
  on conflict (org_id, local_id) do update set updated_at = now()
  returning id into v_order_id;

  if exists (
    select 1 from public.order_items
    where org_id = p_org and local_id like p_local_id || '#%'
  ) then
    return jsonb_build_object('id', v_order_id, 'local_id', p_local_id, 'total', v_total, 'status', v_status, 'pay_status', v_pay_status);
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_product_id := nullif(v_item->>'product_id', '')::uuid;
    v_qty := coalesce((v_item->>'qty')::numeric, 0);
    v_price := coalesce((v_item->>'price')::numeric, 0);
    v_cost := coalesce((v_item->>'cost')::numeric, 0);

    insert into public.order_items (
      org_id, order_id, local_id, product_id, name, image_path, qty, price, cost, position,
      service_staff_id, commission_amt, use_credit, package_id, credited_qty, kind
    ) values (
      p_org, v_order_id, p_local_id || '#' || v_idx, v_product_id,
      coalesce(v_item->>'name', ''), coalesce(v_item->>'image_path', ''),
      v_qty, v_price, v_cost, v_idx,
      nullif(v_item->>'service_staff_id', '')::uuid,
      nullif(v_item->>'commission_amt', '')::numeric,
      coalesce((v_item->>'use_credit')::boolean, false),
      nullif(v_item->>'package_id', '')::uuid,
      nullif(v_item->>'credited_qty', '')::numeric,
      nullif(v_item->>'kind', '')
    )
    on conflict (org_id, local_id) do nothing;

    -- a service books time, not stock: never decrement or record a move
    if v_product_id is not null and coalesce(v_item->>'kind', '') <> 'service' then
      update public.products
        set stock = greatest(stock - v_qty::int, 0), updated_at = now()
        where id = v_product_id and org_id = p_org and deleted_at is null;

      insert into public.stock_moves (org_id, local_id, product_id, qty, reason, ref, occurred_at)
      values (p_org, p_local_id || '-m' || v_idx, v_product_id, -(v_qty::int), 'sale', p_local_id, now())
      on conflict (org_id, local_id) do nothing;
    end if;
    v_idx := v_idx + 1;
  end loop;

  update public.settings
    set next_order_no = greatest(next_order_no, coalesce(p_next_order_no, next_order_no))
    where org_id = p_org and deleted_at is null;

  return jsonb_build_object('id', v_order_id, 'local_id', p_local_id, 'total', v_total, 'status', v_status, 'pay_status', v_pay_status);
end;
$function$;
