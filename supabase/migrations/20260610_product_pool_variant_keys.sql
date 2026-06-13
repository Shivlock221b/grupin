alter table public.product_pools
  add column if not exists pool_key text;

update public.product_pools
set pool_key = 'product:' || product_id::text
where pool_key is null;

create index if not exists idx_product_pools_pool_key
  on public.product_pools(pool_key);

create index if not exists idx_product_pools_active_pool_key
  on public.product_pools(pool_key, status)
  where pool_key is not null and status in ('pooling', 'unlocked');
