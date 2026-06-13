create table if not exists public.product_pool_alternatives (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.product_pools(id) on delete cascade,
  alternative_pool_id uuid not null references public.product_pools(id) on delete cascade,
  suggested_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (pool_id, alternative_pool_id),
  check (pool_id <> alternative_pool_id)
);

create index if not exists idx_product_pool_alternatives_pool_id_created_at
  on public.product_pool_alternatives(pool_id, created_at desc);

create index if not exists idx_product_pool_alternatives_alternative_pool_id
  on public.product_pool_alternatives(alternative_pool_id);

alter table public.product_pool_alternatives enable row level security;

drop policy if exists "public can read product pool alternatives" on public.product_pool_alternatives;
create policy "public can read product pool alternatives"
on public.product_pool_alternatives
for select
using (true);
