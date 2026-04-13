# Deal Pages MVP

Simple deal pages that collect joins until a discount unlocks.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase + Postgres

## Local setup

1. Run `npm install`
2. Copy `.env.example` to `.env.local`
3. Fill in Supabase keys if you want live persistence
4. Run `npm run dev`

If Supabase environment variables are missing, the app falls back to mock demo data so the pages still render.

## Vercel + Supabase go-live setup

Add these environment variables in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_STORAGE_BUCKET`
- `ADMIN_EMAIL_ALLOWLIST`
- your email/WhatsApp provider vars when you wire delivery

Then in Supabase:

1. Enable Email auth and magic links.
2. Run the SQL migrations in `supabase/migrations/`.
3. If you want demo data immediately, run `supabase/seeds/20260410_sample_data.sql` in the SQL Editor after the migrations.
4. Set the auth redirect URL to `https://your-domain.com/auth/callback`.
5. Use `ADMIN_EMAIL_ALLOWLIST` for fast launch, or add rows to `admin_users` for permanent admin access.
6. Keep the storage bucket name aligned with `SUPABASE_STORAGE_BUCKET`.

## Included MVP routes

- `/`
- `/deals`
- `/deals/[slug]`
- `/join/[dealId]`
- `/admin/login`
- `/admin/deals`
- `/admin/deals/new`
- `/admin/deals/[id]`
- `/admin/deals/[id]/interests`

## Notes

- People join a deal by entering their details directly on the page.
- Once the threshold is met, the deal is considered unlocked.
- CSV export is available from the admin dashboard and deal interest pages.
- Admin routes are protected with Supabase Auth magic-link login.
- Deal hero images can be uploaded directly to Supabase Storage.
- Notification providers are abstracted behind a queue function so email and WhatsApp integrations can be swapped in later.
