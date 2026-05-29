alter table public.product_team_unlock_members
  drop constraint if exists product_team_unlock_members_cart_status_check;

alter table public.product_team_unlock_members
  add constraint product_team_unlock_members_cart_status_check
  check (cart_status in ('empty', 'active', 'checked_out', 'left'));

drop index if exists product_team_unlock_members_one_active_brand_phone_idx;

create unique index if not exists product_team_unlock_members_one_active_brand_phone_idx
  on public.product_team_unlock_members (brand_id, phone)
  where room_scope = 'brand' and cart_status in ('empty', 'active');
