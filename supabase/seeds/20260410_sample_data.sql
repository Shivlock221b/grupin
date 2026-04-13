insert into public.deals (
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
  featured
)
values
  (
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
    true
  ),
  (
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
    true
  ),
  (
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
    false
  )
on conflict (slug) do nothing;

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
