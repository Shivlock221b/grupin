alter table public.private_unlock_deal_configs
  add column if not exists how_to_use text,
  add column if not exists terms_and_conditions text;

create index if not exists private_unlock_deal_configs_redemption_content_idx
  on public.private_unlock_deal_configs (
    (nullif(trim(how_to_use), '') is not null),
    (nullif(trim(terms_and_conditions), '') is not null)
  );
