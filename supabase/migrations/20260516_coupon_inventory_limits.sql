alter table public.private_unlock_deal_configs
  add column if not exists coupon_stock_total integer not null default 12,
  add column if not exists coupon_stock_claimed integer not null default 0;

alter table public.private_unlock_deal_configs
  drop constraint if exists private_unlock_deal_configs_coupon_stock_check;

alter table public.private_unlock_deal_configs
  add constraint private_unlock_deal_configs_coupon_stock_check
  check (
    coupon_stock_total >= 0
    and coupon_stock_claimed >= 0
    and coupon_stock_claimed <= coupon_stock_total
  );

update public.private_unlock_deal_configs
set coupon_stock_total = 12
where coupon_stock_total is null or coupon_stock_total = 0;

create table if not exists public.platform_coupon_inventory (
  id boolean primary key default true,
  total integer not null default 100,
  claimed integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint platform_coupon_inventory_singleton check (id),
  constraint platform_coupon_inventory_count_check check (total >= 0 and claimed >= 0)
);

insert into public.platform_coupon_inventory (id, total, claimed)
values (true, 100, 0)
on conflict (id) do update
set total = excluded.total,
    updated_at = now();
