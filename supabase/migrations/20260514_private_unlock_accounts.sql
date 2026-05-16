alter table public.profiles
  add column if not exists phone_verified boolean not null default false,
  add column if not exists last_login_at timestamptz;

create unique index if not exists profiles_phone_unique_idx
  on public.profiles (phone);

alter table public.private_unlock_members
  add column if not exists profile_id uuid references public.profiles(id) on delete set null;

create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists user_sessions_profile_id_idx
  on public.user_sessions (profile_id, expires_at desc);

create table if not exists public.unlocked_coupons (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  deal_id uuid not null references public.deals(id) on delete cascade,
  unlock_id uuid not null references public.private_unlocks(id) on delete cascade,
  private_unlock_member_id uuid not null references public.private_unlock_members(id) on delete cascade,
  status text not null default 'payment_pending',
  unlocked_price integer not null,
  token_amount_paid integer not null default 9900,
  remaining_amount integer not null,
  discount_percent integer not null,
  email_delivery_status text not null default 'not_requested',
  created_at timestamptz not null default now(),
  unique (unlock_id, profile_id)
);

create index if not exists unlocked_coupons_profile_status_idx
  on public.unlocked_coupons (profile_id, status, created_at desc);

create table if not exists public.coupon_claims (
  id uuid primary key default gen_random_uuid(),
  unlocked_coupon_id uuid not null references public.unlocked_coupons(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  deal_id uuid not null references public.deals(id) on delete cascade,
  razorpay_payment_id text not null,
  razorpay_order_id text,
  razorpay_signature text,
  amount_paid integer not null,
  status text not null default 'paid',
  email_delivery_status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique (unlocked_coupon_id)
);
