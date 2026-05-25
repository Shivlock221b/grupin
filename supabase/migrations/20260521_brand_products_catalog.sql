create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  title text not null,
  slug text not null,
  vendor text,
  primary_image text,
  image_urls text[] not null default '{}',
  variants jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  product_types text[] not null default '{}',
  price_min numeric(10, 2),
  price_max numeric(10, 2),
  source_product_ids text[] not null default '{}',
  source_handles text[] not null default '{}',
  source_files text[] not null default '{}',
  published_at timestamptz,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, slug)
);

create index if not exists products_brand_id_idx
  on public.products (brand_id);

create index if not exists products_slug_idx
  on public.products (slug);

create index if not exists products_price_min_idx
  on public.products (price_min);

create index if not exists products_tags_gin_idx
  on public.products using gin (tags);

create index if not exists products_product_types_gin_idx
  on public.products using gin (product_types);

alter table public.products enable row level security;

drop policy if exists "public can read products" on public.products;
create policy "public can read products"
on public.products
for select
using (true);

insert into public.brands (name, slug, website_url)
values ('Foxtale', 'foxtale', 'https://foxtale.in')
on conflict (slug) do update
set name = excluded.name,
    website_url = coalesce(public.brands.website_url, excluded.website_url),
    updated_at = now();
