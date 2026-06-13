update public.product_pools
set expires_at = coalesce(starts_at, created_at, now()) + interval '48 hours',
    updated_at = now()
where status = 'pooling'
  and expires_at is null;

update public.product_pools
set status = 'expired',
    closed_at = coalesce(closed_at, now()),
    updated_at = now()
where status = 'pooling'
  and expires_at is not null
  and expires_at <= now();

create index if not exists idx_product_pools_pooling_expires_at
  on public.product_pools(status, expires_at)
  where status = 'pooling';
