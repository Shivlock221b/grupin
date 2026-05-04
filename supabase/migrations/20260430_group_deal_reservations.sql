alter table public.deals
  add column if not exists original_price integer not null default 2000,
  add column if not exists tier_1_threshold integer not null default 20,
  add column if not exists tier_1_price integer not null default 1600,
  add column if not exists tier_2_threshold integer not null default 25,
  add column if not exists tier_2_price integer not null default 1500,
  add column if not exists tier_3_threshold integer not null default 30,
  add column if not exists tier_3_price integer not null default 1400,
  add column if not exists current_count integer not null default 0,
  add column if not exists expires_at timestamptz not null default (now() + interval '24 hours');

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  name text not null,
  phone text not null,
  email text not null,
  razorpay_payment_id text not null,
  created_at timestamptz not null default now()
);

alter table public.reservations enable row level security;

drop policy if exists "public can read deal reservations" on public.reservations;
create policy "public can read deal reservations"
on public.reservations
for select
using (true);

drop policy if exists "public can create reservations" on public.reservations;
create policy "public can create reservations"
on public.reservations
for insert
with check (true);

create index if not exists reservations_deal_created_at_idx
on public.reservations (deal_id, created_at desc);
