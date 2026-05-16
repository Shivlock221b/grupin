create table if not exists public.private_unlocks (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  owner_member_id uuid,
  share_code text not null unique,
  threshold integer not null default 3,
  discount_percent integer not null default 20,
  coupon_code text not null,
  current_count integer not null default 0,
  expires_at timestamptz not null default (now() + interval '48 hours'),
  created_at timestamptz not null default now()
);

create table if not exists public.private_unlock_members (
  id uuid primary key default gen_random_uuid(),
  unlock_id uuid not null references public.private_unlocks(id) on delete cascade,
  deal_id uuid not null references public.deals(id) on delete cascade,
  name text not null,
  phone text not null,
  email text not null,
  razorpay_payment_id text not null,
  razorpay_order_id text,
  razorpay_signature text,
  amount_paid integer not null default 9900,
  payment_status text not null default 'paid',
  created_at timestamptz not null default now(),
  unique (unlock_id, phone)
);

create index if not exists private_unlock_members_unlock_id_created_at_idx
  on public.private_unlock_members (unlock_id, created_at desc);

alter table public.private_unlocks
  add constraint private_unlocks_owner_member_id_fkey
  foreign key (owner_member_id) references public.private_unlock_members(id)
  on delete set null;
