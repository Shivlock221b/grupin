alter table public.product_pools
  add column if not exists source_snapshot jsonb not null default '{}'::jsonb;
