alter table public.private_unlock_deal_configs
  drop constraint if exists private_unlock_deal_configs_coupon_stock_check;

alter table public.private_unlock_deal_configs
  add constraint private_unlock_deal_configs_coupon_stock_check
  check (
    coupon_stock_total >= 0
    and coupon_stock_claimed >= 0
  );
