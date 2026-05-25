create table if not exists public.product_team_order_updates (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.product_team_orders(id) on delete cascade,
  status text not null check (status in ('hold', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'refund_pending', 'refunded', 'cancelled')),
  remark text,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists product_team_order_updates_order_id_created_at_idx
  on public.product_team_order_updates (order_id, created_at desc);

alter table public.product_team_order_updates enable row level security;

drop policy if exists "public can read product order updates" on public.product_team_order_updates;
create policy "public can read product order updates"
on public.product_team_order_updates
for select
using (true);
