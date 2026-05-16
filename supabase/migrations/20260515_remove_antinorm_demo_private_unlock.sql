delete from public.private_unlock_deal_configs
where deal_id = '00000000-0000-0000-0000-000000000101'
   or lower(brand_name) = 'antinorm';

delete from public.deals
where id = '00000000-0000-0000-0000-000000000101'
   or slug = 'antinorm-combo';

delete from public.brands
where slug = 'antinorm'
  and not exists (
    select 1
    from public.deals
    where deals.brand_id = brands.id
  );
