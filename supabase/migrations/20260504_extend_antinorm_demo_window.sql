update public.deals
set expires_at = now() + interval '48 hours',
    status = 'live'
where id = '00000000-0000-0000-0000-000000000101'
   or slug = 'antinorm-combo';
