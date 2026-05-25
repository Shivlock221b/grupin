alter table public.product_team_unlock_members
  add column if not exists selected_variant jsonb;

create index if not exists product_team_unlock_members_selected_variant_idx
  on public.product_team_unlock_members using gin (selected_variant);
