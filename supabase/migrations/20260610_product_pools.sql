alter table public.products
  add column if not exists source_platform text,
  add column if not exists canonical_url text,
  add column if not exists external_product_id text,
  add column if not exists source_payload jsonb not null default '{}'::jsonb,
  add column if not exists last_synced_at timestamptz;

create table if not exists public.product_pools (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  status text not null default 'pooling'
    check (status in ('pooling', 'unlocked', 'closed', 'expired')),
  unlock_threshold integer not null default 50,
  checkout_threshold integer not null default 50,
  current_join_count integer not null default 0,
  successful_checkout_count integer not null default 0,
  unlock_price numeric(10, 2),
  mrp numeric(10, 2),
  current_market_price numeric(10, 2),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  unlocked_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_pool_cart_items (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.product_pools(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  quantity integer not null default 1,
  status text not null default 'active'
    check (status in ('active', 'checked_out', 'removed')),
  product_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pool_id, profile_id)
);

create table if not exists public.product_pool_members (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.product_pools(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  cart_item_id uuid references public.product_pool_cart_items(id) on delete set null,
  status text not null default 'joined'
    check (status in ('joined', 'checked_out', 'cancelled')),
  joined_at timestamptz not null default now(),
  checked_out_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pool_id, profile_id)
);

create index if not exists idx_product_pools_product_id
  on public.product_pools(product_id);

create index if not exists idx_product_pools_status
  on public.product_pools(status);

create index if not exists idx_product_pools_progress
  on public.product_pools(status, current_join_count, unlock_threshold);

create index if not exists idx_product_pools_checkout_progress
  on public.product_pools(status, successful_checkout_count, checkout_threshold);

create index if not exists idx_product_pool_members_pool_id
  on public.product_pool_members(pool_id);

create index if not exists idx_product_pool_members_profile_id
  on public.product_pool_members(profile_id);

create index if not exists idx_product_pool_cart_items_profile_id
  on public.product_pool_cart_items(profile_id);

create unique index if not exists idx_products_platform_external_id
  on public.products(source_platform, external_product_id)
  where source_platform is not null and external_product_id is not null;

create unique index if not exists idx_products_canonical_url
  on public.products(canonical_url)
  where canonical_url is not null;

alter table public.product_pools enable row level security;
alter table public.product_pool_members enable row level security;
alter table public.product_pool_cart_items enable row level security;

drop policy if exists "public can read product pools" on public.product_pools;
create policy "public can read product pools"
on public.product_pools
for select
using (true);

drop policy if exists "public can read product pool members" on public.product_pool_members;
create policy "public can read product pool members"
on public.product_pool_members
for select
using (true);

drop policy if exists "public can read product pool cart items" on public.product_pool_cart_items;
create policy "public can read product pool cart items"
on public.product_pool_cart_items
for select
using (true);
