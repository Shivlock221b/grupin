insert into public.brands (id, name, slug, website_url)
values ('00000000-0000-0000-0000-000000000201', 'Antinorm', 'antinorm', 'https://antinorm.com')
on conflict (slug) do update
set name = excluded.name,
    website_url = excluded.website_url;

insert into public.deals (
  id,
  brand_id,
  slug,
  title,
  merchant,
  category,
  city,
  area,
  description,
  discount_percent,
  credit_description,
  minimum_interest_count,
  status,
  close_date,
  hero_image,
  terms,
  featured,
  original_price,
  tier_1_threshold,
  tier_1_price,
  tier_2_threshold,
  tier_2_price,
  tier_3_threshold,
  tier_3_price,
  current_count,
  expires_at
)
values
  (
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000201',
    'antinorm-combo',
    'Antinorm Combo',
    'Antinorm',
    'Apparel',
    'Delhi',
    'Online',
    'A limited group buy for the Antinorm Combo. Reserve your spot, unlock the best tier, and complete purchase when the window closes.',
    30,
    'Reservation adjusts against the final Antinorm checkout amount',
    20,
    'live',
    null,
    'https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=1200&q=80',
    array[
      'Reservation amount is adjusted against final purchase.',
      'Refunded if the group deal does not unlock.',
      'Final purchase happens on the brand site.'
    ],
    true,
    2000,
    20,
    1600,
    25,
    1500,
    30,
    1400,
    18,
    now() + interval '48 hours'
  ),
  (
    gen_random_uuid(),
    null,
    'strike-zone-bowling-pack',
    'Strike Zone Weekend Bowling Credits',
    'Strike Zone',
    'Bowling',
    'Bengaluru',
    'Indiranagar',
    'Pool together with other bowlers and unlock prepaid lane credits you can redeem any weekend in the next 90 days.',
    25,
    'Rs. 2,000 bowling credit pack redeemable anytime within 90 days',
    10,
    'live',
    null,
    'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
    array[
      'Valid on weekdays and weekends.',
      'Credits can be split across visits.',
      'Non-transferable after voucher issuance.'
    ],
    true,
    2000,
    20,
    1600,
    25,
    1500,
    30,
    1400,
    2,
    now() + interval '48 hours'
  ),
  (
    gen_random_uuid(),
    null,
    'glow-house-salon-wallet',
    'Glow House Salon Wallet',
    'Glow House',
    'Salon',
    'Bengaluru',
    'Koramangala',
    'Join a neighborhood buy and secure discounted salon wallet credits for cuts, color, and grooming sessions.',
    15,
    'Rs. 5,000 salon wallet usable across services for 6 months',
    12,
    'threshold_met',
    null,
    'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=80',
    array[
      'Wallet expires in 6 months.',
      'Cannot be combined with in-store festival discounts.',
      'Appointment booking remains subject to availability.'
    ],
    true,
    2000,
    20,
    1600,
    25,
    1500,
    30,
    1400,
    2,
    now() + interval '48 hours'
  ),
  (
    gen_random_uuid(),
    null,
    'turbo-track-race-credits',
    'Turbo Track Go-Kart Credits',
    'Turbo Track',
    'Go-Karting',
    'Bengaluru',
    'Sarjapur',
    'Bring together thrill-seekers and lock in off-peak race credits you can redeem later with friends or family.',
    20,
    '4-race credit bundle valid for 60 days',
    8,
    'live',
    null,
    'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80',
    array[
      'Minimum rider height restrictions apply.',
      'Helmet and safety gear included.',
      'Weekend surcharges are payable at venue if applicable.'
    ],
    false,
    2000,
    20,
    1600,
    25,
    1500,
    30,
    1400,
    1,
    now() + interval '48 hours'
  )
on conflict (slug) do nothing;

update public.deals
set expires_at = now() + interval '48 hours',
    status = 'live'
where id = '00000000-0000-0000-0000-000000000101'
   or slug = 'antinorm-combo';

insert into public.reservations (deal_id, name, phone, email, razorpay_payment_id, created_at)
values
  ('00000000-0000-0000-0000-000000000101', 'Rohit', '+91 9000000001', 'rohit@example.com', 'pay_seed_1', now() - interval '2 minutes'),
  ('00000000-0000-0000-0000-000000000101', 'Ananya', '+91 9000000002', 'ananya@example.com', 'pay_seed_2', now() - interval '5 minutes'),
  ('00000000-0000-0000-0000-000000000101', 'Kabir', '+91 9000000003', 'kabir@example.com', 'pay_seed_3', now() - interval '8 minutes'),
  ('00000000-0000-0000-0000-000000000101', 'Meera', '+91 9000000004', 'meera@example.com', 'pay_seed_4', now() - interval '11 minutes')
on conflict do nothing;

insert into public.deal_coupons (deal_id, tier_number, threshold, coupon_code)
values
  ('00000000-0000-0000-0000-000000000101', 1, 20, 'ANTINORM20'),
  ('00000000-0000-0000-0000-000000000101', 2, 25, 'ANTINORM25'),
  ('00000000-0000-0000-0000-000000000101', 3, 30, 'ANTINORM30')
on conflict (deal_id, tier_number) do update
set threshold = excluded.threshold,
    coupon_code = excluded.coupon_code;

insert into public.profiles (
  full_name,
  email,
  phone,
  area,
  city,
  whatsapp_opt_in
)
values
  ('Aisha Mehta', 'aisha@example.com', '+91 9876543210', 'Indiranagar', 'Bengaluru', true),
  ('Rahul Nair', 'rahul@example.com', '+91 9123456780', 'Koramangala', 'Bengaluru', true),
  ('Priya Sharma', 'priya@example.com', '+91 9988776655', 'HSR Layout', 'Bengaluru', true),
  ('Karan Bhat', 'karan@example.com', '+91 9090909090', 'Sarjapur', 'Bengaluru', false)
on conflict (email) do nothing;

insert into public.deal_interests (deal_id, user_id, status)
select d.id, p.id, 'confirmed'::interest_status
from public.deals d
join public.profiles p on p.email in ('aisha@example.com', 'priya@example.com')
where d.slug = 'strike-zone-bowling-pack'
on conflict (deal_id, user_id) do nothing;

insert into public.deal_interests (deal_id, user_id, status)
select d.id, p.id, 'confirmed'::interest_status
from public.deals d
join public.profiles p on p.email in ('rahul@example.com', 'priya@example.com')
where d.slug = 'glow-house-salon-wallet'
on conflict (deal_id, user_id) do nothing;

insert into public.deal_interests (deal_id, user_id, status)
select d.id, p.id, 'confirmed'::interest_status
from public.deals d
join public.profiles p on p.email in ('karan@example.com')
where d.slug = 'turbo-track-race-credits'
on conflict (deal_id, user_id) do nothing;
