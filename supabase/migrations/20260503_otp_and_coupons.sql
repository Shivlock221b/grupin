create table if not exists public.otp_verifications (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.deals(id) on delete cascade,
  phone text not null,
  purpose text not null check (purpose in ('reservation', 'coupon_unlock')),
  otp_code text not null,
  attempts integer not null default 0,
  verified_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.deal_coupons (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  tier_number integer not null check (tier_number in (1, 2, 3)),
  threshold integer not null,
  coupon_code text not null,
  created_at timestamptz not null default now(),
  unique (deal_id, tier_number)
);

alter table public.otp_verifications enable row level security;
alter table public.deal_coupons enable row level security;

drop policy if exists "public can create otp requests" on public.otp_verifications;
create policy "public can create otp requests"
on public.otp_verifications
for insert
with check (true);

drop policy if exists "public can read deal coupons" on public.deal_coupons;
create policy "public can read deal coupons"
on public.deal_coupons
for select
using (true);

create index if not exists otp_verifications_phone_purpose_idx
on public.otp_verifications (deal_id, phone, purpose, created_at desc);

create index if not exists deal_coupons_deal_threshold_idx
on public.deal_coupons (deal_id, threshold);

insert into public.deal_coupons (deal_id, tier_number, threshold, coupon_code)
values
  ('00000000-0000-0000-0000-000000000101', 1, 20, 'ANTINORM20'),
  ('00000000-0000-0000-0000-000000000101', 2, 25, 'ANTINORM25'),
  ('00000000-0000-0000-0000-000000000101', 3, 30, 'ANTINORM30')
on conflict (deal_id, tier_number) do update
set threshold = excluded.threshold,
    coupon_code = excluded.coupon_code;
