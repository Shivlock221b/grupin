insert into storage.buckets (id, name, public)
values ('deal-hero-images', 'deal-hero-images', true)
on conflict (id) do nothing;

drop policy if exists "public can view deal hero images" on storage.objects;
create policy "public can view deal hero images"
on storage.objects
for select
using (bucket_id = 'deal-hero-images');

drop policy if exists "service role manages deal hero images" on storage.objects;
create policy "service role manages deal hero images"
on storage.objects
for all
using (bucket_id = 'deal-hero-images')
with check (bucket_id = 'deal-hero-images');

drop policy if exists "admins can read own admin row" on public.admin_users;
create policy "admins can read own admin row"
on public.admin_users
for select
using (user_id = auth.uid());
