-- 0003_realtime.sql — Realtime publication
alter table public.orgs replica identity full;
alter table public.memberships replica identity full;
alter table public.categories replica identity full;
alter table public.products replica identity full;
alter table public.customers replica identity full;
alter table public.orders replica identity full;
alter table public.order_items replica identity full;
alter table public.stock_moves replica identity full;
alter table public.settings replica identity full;
alter table public.staff replica identity full;

alter publication supabase_realtime add table public.orgs;
alter publication supabase_realtime add table public.memberships;
alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.customers;
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_items;
alter publication supabase_realtime add table public.stock_moves;
alter publication supabase_realtime add table public.settings;
alter publication supabase_realtime add table public.staff;
