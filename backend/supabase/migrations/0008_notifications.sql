-- 0008_notifications.sql — in-app notification feed
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  kind text not null check (kind in ('sale','low_stock')),
  title text not null,
  body text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index notifications_org_created_idx on public.notifications (org_id, created_at);

alter table public.notifications enable row level security;

create policy notifications_select on public.notifications for select
  using (org_id in (select public.current_org_ids()));

create policy notifications_insert on public.notifications for insert
  with check (org_id in (select public.current_org_ids()));

-- every synced order announces itself to the org feed
create function public.notify_order_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (org_id, kind, title, body, data)
  values (
    new.org_id,
    'sale',
    'New sale',
    '₵' || to_char(new.total, 'FM999999990.00'),
    jsonb_build_object('order_id', new.id, 'total', new.total)
  );
  return new;
end $$;

create trigger orders_notify_created
  after insert on public.orders
  for each row execute function public.notify_order_created();

-- low-stock alert when a product crosses its threshold
create function public.notify_low_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.stock <= new.low_stock_at and old.stock > old.low_stock_at then
    insert into public.notifications (org_id, kind, title, body, data)
    values (
      new.org_id,
      'low_stock',
      'Low stock: ' || new.name,
      'Only ' || new.stock || ' ' || new.unit || ' left',
      jsonb_build_object('product_id', new.id)
    );
  end if;
  return new;
end $$;

create trigger products_notify_low
  after update on public.products
  for each row execute function public.notify_low_stock();

alter table public.notifications replica identity full;

alter publication supabase_realtime add table public.notifications;
