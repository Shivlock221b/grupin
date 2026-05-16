alter table public.private_unlock_deal_configs
  add column if not exists source text,
  add column if not exists source_file text,
  add column if not exists voucher_url text,
  add column if not exists scraped_discount_percent numeric(6, 2),
  add column if not exists voucher_value integer not null default 500,
  add column if not exists flat_discount_amount integer not null default 200,
  add column if not exists final_payable_after_unlock numeric(10, 2);

create index if not exists private_unlock_deal_configs_source_idx
  on public.private_unlock_deal_configs (source);

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'deals_discount_percent_check'
      and conrelid = 'public.deals'::regclass
  ) then
    alter table public.deals drop constraint deals_discount_percent_check;
  end if;
end $$;

alter table public.deals
  add constraint deals_discount_percent_check
  check (discount_percent > 0 and discount_percent <= 100);
