update public.product_pools
set expires_at = coalesce(unlocked_at, now()) + interval '12 hours',
    updated_at = now()
where status = 'unlocked'
  and expires_at is null;

update public.product_pools
set status = 'expired',
    closed_at = coalesce(closed_at, now()),
    updated_at = now()
where status = 'unlocked'
  and expires_at is not null
  and expires_at <= now();

create index if not exists idx_product_pools_unlocked_expires_at
  on public.product_pools(status, expires_at)
  where status = 'unlocked';
