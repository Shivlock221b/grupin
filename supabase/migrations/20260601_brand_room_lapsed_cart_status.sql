alter table public.product_team_unlock_members
  drop constraint if exists product_team_unlock_members_cart_status_check;

alter table public.product_team_unlock_members
  add constraint product_team_unlock_members_cart_status_check
  check (cart_status in ('empty', 'active', 'checked_out', 'left', 'lapsed'));
