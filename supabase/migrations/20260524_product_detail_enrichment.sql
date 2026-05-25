alter table public.products
  add column if not exists description text,
  add column if not exists how_to_use text,
  add column if not exists ingredients text,
  add column if not exists review_count integer,
  add column if not exists country_of_origin text,
  add column if not exists manufacturer_name text,
  add column if not exists manufacturer_address text,
  add column if not exists product_detail_sku text,
  add column if not exists detail_image_url text;

create index if not exists products_review_count_idx
  on public.products (review_count desc);

create index if not exists products_product_detail_sku_idx
  on public.products (product_detail_sku);
