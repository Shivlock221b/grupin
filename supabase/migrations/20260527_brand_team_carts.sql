alter table public.product_team_unlocks
  add column if not exists room_scope text not null default 'product',
  add column if not exists member_count integer not null default 0,
  add column if not exists closed_at timestamptz;

alter table public.product_team_unlocks
  drop constraint if exists product_team_unlocks_room_scope_check;

alter table public.product_team_unlocks
  add constraint product_team_unlocks_room_scope_check
  check (room_scope in ('product', 'brand'));

alter table public.product_team_unlocks
  alter column product_id drop not null;

alter table public.product_team_unlock_members
  add column if not exists cart_status text not null default 'empty',
  add column if not exists cart_checked_out_at timestamptz,
  add column if not exists room_scope text not null default 'product',
  add column if not exists selected_variant jsonb;

alter table public.product_team_unlock_members
  drop constraint if exists product_team_unlock_members_cart_status_check;

alter table public.product_team_unlock_members
  add constraint product_team_unlock_members_cart_status_check
  check (cart_status in ('empty', 'active', 'checked_out'));

alter table public.product_team_unlock_members
  drop constraint if exists product_team_unlock_members_room_scope_check;

alter table public.product_team_unlock_members
  add constraint product_team_unlock_members_room_scope_check
  check (room_scope in ('product', 'brand'));

alter table public.product_team_unlock_members
  alter column product_id drop not null;

create table if not exists public.product_team_cart_items (
  id uuid primary key default gen_random_uuid(),
  unlock_id uuid not null references public.product_team_unlocks(id) on delete cascade,
  member_id uuid not null references public.product_team_unlock_members(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  selected_variant jsonb,
  variant_key text not null default 'default',
  quantity integer not null default 1 check (quantity between 1 and 4),
  mrp_snapshot integer not null default 0,
  team_price_snapshot integer not null default 0,
  discount_percent_snapshot integer not null default 25,
  product_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, product_id, variant_key)
);

create index if not exists product_team_cart_items_unlock_id_idx
  on public.product_team_cart_items (unlock_id);

create index if not exists product_team_cart_items_member_id_idx
  on public.product_team_cart_items (member_id);

create index if not exists product_team_unlocks_brand_active_phone_guard_idx
  on public.product_team_unlock_members (brand_id, phone)
  where room_scope = 'brand' and cart_status in ('empty', 'active');

create unique index if not exists product_team_unlock_members_one_active_brand_phone_idx
  on public.product_team_unlock_members (brand_id, phone)
  where room_scope = 'brand' and cart_status in ('empty', 'active');

alter table public.product_team_orders
  add column if not exists cart_member_id uuid references public.product_team_unlock_members(id) on delete set null,
  add column if not exists items jsonb not null default '[]'::jsonb;

alter table public.product_team_orders
  alter column product_id drop not null;

alter table public.product_team_cart_items enable row level security;

drop policy if exists "public can read product team cart items" on public.product_team_cart_items;
create policy "public can read product team cart items"
on public.product_team_cart_items
for select
using (true);

update public.product_team_unlocks
set status = 'cancelled',
    closed_at = coalesce(closed_at, now()),
    updated_at = now()
where room_scope = 'product'
  and status in ('active', 'unlocked');
