create table if not exists public.private_unlock_deal_configs (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null unique references public.deals(id) on delete cascade,
  enabled boolean not null default true,
  headline text not null,
  brand_name text not null,
  brand_logo text,
  card_image text not null,
  banner_image text not null,
  category text not null,
  short_description text not null,
  threshold integer not null default 3,
  discount_percent integer not null default 20,
  token_amount integer not null default 99,
  coupon_prefix text not null default 'GRUPIN',
  sort_order integer not null default 100,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists private_unlock_deal_configs_enabled_sort_idx
  on public.private_unlock_deal_configs (enabled, sort_order, created_at desc);

insert into public.private_unlock_deal_configs (
  deal_id,
  enabled,
  headline,
  brand_name,
  brand_logo,
  card_image,
  banner_image,
  category,
  short_description,
  threshold,
  discount_percent,
  token_amount,
  coupon_prefix,
  sort_order,
  featured
)
values
  (
    '00000000-0000-0000-0000-000000000101',
    true,
    'Private Antinorm Combo unlock',
    'Antinorm',
    null,
    'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=900&q=85',
    'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1400&q=85',
    'Fashion',
    'Start a private link, invite your people, and unlock a coupon for everyone in your room.',
    3,
    20,
    99,
    'ANTINORM',
    1,
    true
  )
on conflict (deal_id) do update
set enabled = excluded.enabled,
    headline = excluded.headline,
    brand_name = excluded.brand_name,
    brand_logo = excluded.brand_logo,
    card_image = excluded.card_image,
    banner_image = excluded.banner_image,
    category = excluded.category,
    short_description = excluded.short_description,
    threshold = excluded.threshold,
    discount_percent = excluded.discount_percent,
    token_amount = excluded.token_amount,
    coupon_prefix = excluded.coupon_prefix,
    sort_order = excluded.sort_order,
    featured = excluded.featured;
