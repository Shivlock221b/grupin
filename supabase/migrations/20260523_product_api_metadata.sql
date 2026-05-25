alter table public.products
  add column if not exists source_product_name text,
  add column if not exists source_product_title text,
  add column if not exists source_slug text,
  add column if not exists source_url text,
  add column if not exists mrp numeric(10, 2),
  add column if not exists sale_price numeric(10, 2),
  add column if not exists source_discount_percent numeric(6, 2),
  add column if not exists rating numeric(3, 2),
  add column if not exists rating_count integer,
  add column if not exists in_stock boolean,
  add column if not exists variant_count integer,
  add column if not exists variant_type text,
  add column if not exists primary_categories jsonb not null default '{}'::jsonb,
  add column if not exists raw_payload jsonb not null default '{}'::jsonb;

create index if not exists products_source_url_idx
  on public.products (source_url);

create index if not exists products_in_stock_idx
  on public.products (in_stock);

create index if not exists products_rating_idx
  on public.products (rating desc);

create index if not exists products_primary_categories_gin_idx
  on public.products using gin (primary_categories);

insert into public.brands (name, slug, website_url)
values ('L''Oreal Paris', 'l-oreal-paris', 'https://www.lorealparis.co.in')
on conflict (slug) do update
set name = excluded.name,
    website_url = coalesce(public.brands.website_url, excluded.website_url),
    updated_at = now();
