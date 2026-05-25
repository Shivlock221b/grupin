create table if not exists public.product_team_unlocks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  owner_profile_id uuid references public.profiles(id) on delete set null,
  share_code text not null unique,
  threshold integer not null default 3,
  discount_percent integer not null default 25,
  selected_variant jsonb,
  current_count integer not null default 0,
  status text not null default 'active' check (status in ('active', 'unlocked', 'expired', 'completed', 'cancelled')),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_team_unlock_members (
  id uuid primary key default gen_random_uuid(),
  unlock_id uuid not null references public.product_team_unlocks(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  phone text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique (unlock_id, phone)
);

create table if not exists public.product_team_orders (
  id uuid primary key default gen_random_uuid(),
  unlock_id uuid not null references public.product_team_unlocks(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  selected_variant jsonb,
  buyer_name text not null,
  buyer_email text,
  buyer_phone text not null,
  delivery_address jsonb not null default '{}'::jsonb,
  amount_paid integer not null default 0,
  razorpay_payment_id text,
  razorpay_order_id text,
  razorpay_signature text,
  status text not null default 'hold' check (status in ('hold', 'confirmed', 'refund_pending', 'refunded', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unlock_id, profile_id)
);

create index if not exists product_team_unlocks_product_id_idx
  on public.product_team_unlocks (product_id);

create index if not exists product_team_unlocks_share_code_idx
  on public.product_team_unlocks (share_code);

create index if not exists product_team_unlock_members_unlock_id_created_at_idx
  on public.product_team_unlock_members (unlock_id, created_at desc);

create index if not exists product_team_orders_unlock_id_idx
  on public.product_team_orders (unlock_id);

alter table public.product_team_unlocks enable row level security;
alter table public.product_team_unlock_members enable row level security;
alter table public.product_team_orders enable row level security;

drop policy if exists "public can read product team unlocks" on public.product_team_unlocks;
create policy "public can read product team unlocks"
on public.product_team_unlocks
for select
using (true);

drop policy if exists "public can read product team members" on public.product_team_unlock_members;
create policy "public can read product team members"
on public.product_team_unlock_members
for select
using (true);
