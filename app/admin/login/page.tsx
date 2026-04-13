import Link from "next/link";
import { AdminLoginForm } from "@/components/admin-login-form";

type AdminLoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-[2rem] bg-[var(--forest)] p-8 text-white">
        <p className="text-sm uppercase tracking-[0.22em] text-[rgba(255,255,255,0.68)]">Admin Login</p>
        <h1 className="mt-3 text-4xl font-semibold">Sign in to manage deal pages on Vercel and Supabase.</h1>
        <p className="mt-4 text-sm leading-7 text-[rgba(255,255,255,0.74)]">
          Use your approved admin email only. The login flow now sends magic links only to emails already present in
          `ADMIN_EMAIL_ALLOWLIST`, and it does not create new users during admin login.
        </p>
        <Link href="/" className="mt-8 inline-block text-sm font-semibold underline underline-offset-4">
          Back to public site
        </Link>
      </div>
      <div className="space-y-4">
        {error === "not_authorized" ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            This email is signed in but is not allowed to access the admin dashboard.
          </div>
        ) : null}
        <AdminLoginForm />
      </div>
    </div>
  );
}
