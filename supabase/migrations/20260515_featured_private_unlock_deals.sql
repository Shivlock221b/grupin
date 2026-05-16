with featured_brands(name) as (
  values
    ('air india'),
    ('ajio'),
    ('amazon'),
    ('behrouz biryani'),
    ('bigbasket'),
    ('blinkit'),
    ('blissclub'),
    ('cafe delhi heights'),
    ('charles & keith'),
    ('cinepolis'),
    ('cleartrip'),
    ('coach-luxe'),
    ('croma'),
    ('decathlon'),
    ('easemytrip'),
    ('fastrack'),
    ('flipkart'),
    ('foxtale'),
    ('giva jewellery'),
    ('goibibo generic'),
    ('ixigo'),
    ('jockey'),
    ('lakme salon'),
    ('lenskart'),
    ('levis'),
    ('lifestyle'),
    ('makemytrip e-pay'),
    ('mamaearth'),
    ('mokobara'),
    ('myntra'),
    ('nua woman'),
    ('nykaa'),
    ('ode spa salon'),
    ('ola cabs'),
    ('palmonas'),
    ('pizza hut'),
    ('pronto'),
    ('puma'),
    ('pvr'),
    ('reliance digital'),
    ('snitch special'),
    ('starbucks'),
    ('superdry-luxe'),
    ('swiggy money'),
    ('taco bell'),
    ('the man company'),
    ('tira beauty'),
    ('uber'),
    ('vijay sales'),
    ('westside'),
    ('zepto'),
    ('zomato'),
    ('zudio')
)
update public.private_unlock_deal_configs config
set featured = exists (
  select 1
  from featured_brands
  where featured_brands.name = lower(config.brand_name)
);

update public.deals deal
set featured = exists (
  select 1
  from public.private_unlock_deal_configs config
  where config.deal_id = deal.id
    and config.featured = true
);
