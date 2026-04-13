create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  phone text not null,
  area text,
  city text,
  whatsapp_opt_in boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key,
  created_at timestamptz not null default now()
);

create type deal_status as enum ('draft', 'live', 'threshold_met', 'closed', 'archived');
create type interest_status as enum ('pending_verification', 'confirmed');
create type notification_type as enum ('interest_confirmed', 'threshold_reached', 'admin_export_generated', 'user_notification_queued');
create type notification_channel as enum ('email', 'whatsapp', 'system');
create type notification_status as enum ('queued', 'sent');

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  merchant text not null,
  category text not null,
  city text not null,
  area text not null,
  description text not null,
  discount_percent integer not null check (discount_percent > 0 and discount_percent <= 90),
  credit_description text not null,
  minimum_interest_count integer not null check (minimum_interest_count >= 2),
  status deal_status not null default 'draft',
  close_date date,
  hero_image text not null,
  terms text[] not null default '{}',
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deal_interests (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status interest_status not null default 'pending_verification',
  created_at timestamptz not null default now(),
  unique (deal_id, user_id)
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  type notification_type not null,
  channel notification_channel not null,
  status notification_status not null default 'queued',
  provider text,
  created_at timestamptz not null default now()
);

create or replace view public.deals_with_counts as
select
  d.*,
  count(di.id)::int as current_interest_count
from public.deals d
left join public.deal_interests di on di.deal_id = d.id
group by d.id;

create or replace function public.update_deal_status_when_threshold_met()
returns trigger
language plpgsql
as $$
declare
  current_count integer;
  minimum_count integer;
begin
  select count(*)::int
  into current_count
  from public.deal_interests
  where deal_id = new.deal_id
    and status = 'confirmed';

  select minimum_interest_count
  into minimum_count
  from public.deals
  where id = new.deal_id;

  if current_count >= minimum_count then
    update public.deals
    set status = 'threshold_met',
        updated_at = now()
    where id = new.deal_id
      and status = 'live';

    insert into public.notification_events (deal_id, user_id, type, channel, status, provider)
    values (new.deal_id, new.user_id, 'threshold_reached', 'system', 'queued', 'db_trigger');
  end if;

  return new;
end;
$$;

drop trigger if exists deal_interest_threshold_trigger on public.deal_interests;
create trigger deal_interest_threshold_trigger
after insert or update on public.deal_interests
for each row
when (new.status = 'confirmed')
execute function public.update_deal_status_when_threshold_met();

alter table public.profiles enable row level security;
alter table public.deals enable row level security;
alter table public.deal_interests enable row level security;
alter table public.notification_events enable row level security;
alter table public.admin_users enable row level security;

create policy "public can read live deals"
on public.deals
for select
using (status in ('live', 'threshold_met', 'closed'));

create policy "public can create profiles"
on public.profiles
for insert
with check (true);

create policy "public can read own profile"
on public.profiles
for select
using (email = auth.email());

create policy "public can read own interests"
on public.deal_interests
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = user_id
      and p.email = auth.email()
  )
);

create policy "public can join live deals"
on public.deal_interests
for insert
with check (
  exists (
    select 1
    from public.deals d
    where d.id = deal_id
      and d.status = 'live'
  )
);
