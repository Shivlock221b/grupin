create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  website_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brand_users (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  user_id uuid,
  email text not null,
  role text not null default 'viewer' check (role in ('owner', 'manager', 'viewer')),
  created_at timestamptz not null default now(),
  unique (brand_id, email)
);

alter table public.deals
  add column if not exists brand_id uuid references public.brands(id) on delete set null;

alter table public.reservations
  add column if not exists amount_paid integer not null default 9900,
  add column if not exists payment_status text not null default 'paid' check (payment_status in ('created', 'paid', 'failed', 'refunded')),
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_signature text,
  add column if not exists final_purchase_status text not null default 'pending' check (final_purchase_status in ('pending', 'completed', 'cancelled'));

create index if not exists deals_brand_id_idx
on public.deals (brand_id);

create index if not exists brand_users_email_idx
on public.brand_users (lower(email));

create index if not exists reservations_payment_status_idx
on public.reservations (payment_status);

alter table public.brands enable row level security;
alter table public.brand_users enable row level security;

drop policy if exists "public can read brands" on public.brands;
create policy "public can read brands"
on public.brands
for select
using (true);

drop policy if exists "brand users can read own memberships" on public.brand_users;
create policy "brand users can read own memberships"
on public.brand_users
for select
using (email = auth.email());

insert into public.brands (id, name, slug, website_url)
values ('00000000-0000-0000-0000-000000000201', 'Antinorm', 'antinorm', 'https://antinorm.com')
on conflict (slug) do update
set name = excluded.name,
    website_url = excluded.website_url,
    updated_at = now();

update public.deals
set brand_id = '00000000-0000-0000-0000-000000000201'
where slug = 'antinorm-combo'
  and brand_id is null;
