-- 0001_init.sql — Nova POS baseline schema
-- Multi-tenant: every domain row carries org_id -> orgs(id).

create extension if not exists "uuid-ossp";
create extension if not exists moddatetime schema extensions;

-- ---------- orgs (tenant root) ----------
create table if not exists public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  op_id uuid unique
);
create trigger orgs_moddatetime
  before update on public.orgs
  for each row execute function extensions.moddatetime('updated_at');
create index orgs_updated_at_idx on public.orgs (updated_at);

-- ---------- memberships ----------
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','supervisor','cashier')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  op_id uuid unique,
  unique (org_id, user_id)
);
create trigger memberships_moddatetime
  before update on public.memberships
  for each row execute function extensions.moddatetime('updated_at');
create index memberships_org_updated_idx on public.memberships (org_id, updated_at);
create index memberships_org_active_idx on public.memberships (org_id) where deleted_at is null;

-- ---------- categories ----------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  color text not null default '#059669',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  op_id uuid unique
);
create trigger categories_moddatetime
  before update on public.categories
  for each row execute function extensions.moddatetime('updated_at');
create index categories_org_updated_idx on public.categories (org_id, updated_at);
create index categories_org_active_idx on public.categories (org_id) where deleted_at is null;

-- ---------- products ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  sku text not null default '',
  barcode text not null default '',
  price numeric(12,2) not null default 0,
  cost numeric(12,2) not null default 0,
  stock int not null default 0,
  low_stock_at int not null default 5,
  unit text not null default 'pcs',
  category_id uuid references public.categories(id) on delete set null,
  image_path text not null default '',
  description text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  op_id uuid unique
);
create trigger products_moddatetime
  before update on public.products
  for each row execute function extensions.moddatetime('updated_at');
create index products_org_updated_idx on public.products (org_id, updated_at);
create index products_org_active_idx on public.products (org_id) where deleted_at is null;

-- ---------- customers ----------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  phone text not null default '',
  address text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  op_id uuid unique
);
create trigger customers_moddatetime
  before update on public.customers
  for each row execute function extensions.moddatetime('updated_at');
create index customers_org_updated_idx on public.customers (org_id, updated_at);
create index customers_org_active_idx on public.customers (org_id) where deleted_at is null;

-- ---------- orders ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  status text not null default 'pending' check (status in ('pending','completed','refunded')),
  payments jsonb not null default '[]'::jsonb,
  pay_status text not null default 'unpaid' check (pay_status in ('unpaid','partial','paid','refunded')),
  completed_at timestamptz,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  op_id uuid unique
);
create trigger orders_moddatetime
  before update on public.orders
  for each row execute function extensions.moddatetime('updated_at');
create index orders_org_updated_idx on public.orders (org_id, updated_at);
create index orders_org_active_idx on public.orders (org_id) where deleted_at is null;

-- ---------- order_items ----------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  image_path text not null default '',
  qty numeric(12,3) not null default 1,
  price numeric(12,2) not null default 0,
  cost numeric(12,2) not null default 0,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  op_id uuid unique
);
create trigger order_items_moddatetime
  before update on public.order_items
  for each row execute function extensions.moddatetime('updated_at');
create index order_items_org_updated_idx on public.order_items (org_id, updated_at);
create index order_items_org_active_idx on public.order_items (org_id) where deleted_at is null;

-- ---------- stock_moves ----------
create table if not exists public.stock_moves (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  qty int not null default 0,
  reason text not null check (reason in ('purchase','sale','adjust','damage','return','count','opening')),
  ref text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  op_id uuid unique
);
create trigger stock_moves_moddatetime
  before update on public.stock_moves
  for each row execute function extensions.moddatetime('updated_at');
create index stock_moves_org_updated_idx on public.stock_moves (org_id, updated_at);
create index stock_moves_org_active_idx on public.stock_moves (org_id) where deleted_at is null;

-- ---------- settings (one row per org) ----------
create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  shop_name text not null default '',
  address text not null default '',
  phone text not null default '',
  owner_name text not null default '',
  momo_number text not null default '',
  momo_network text not null default '',
  tax_inclusive boolean not null default false,
  tax_rate numeric(6,3) not null default 0,
  receipt_footer text not null default '',
  theme text not null default 'dark' check (theme in ('dark','light')),
  next_order_no bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  op_id uuid unique
);
create trigger settings_moddatetime
  before update on public.settings
  for each row execute function extensions.moddatetime('updated_at');
create index settings_org_updated_idx on public.settings (org_id, updated_at);
create index settings_org_active_idx on public.settings (org_id) where deleted_at is null;
create unique index settings_org_unique on public.settings (org_id) where deleted_at is null;

-- ---------- staff ----------
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  name text not null,
  role text not null check (role in ('owner','supervisor','cashier')),
  photo_path text not null default '',
  phone text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  op_id uuid unique
);
create trigger staff_moddatetime
  before update on public.staff
  for each row execute function extensions.moddatetime('updated_at');
create index staff_org_updated_idx on public.staff (org_id, updated_at);
create index staff_org_active_idx on public.staff (org_id) where deleted_at is null;
