import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountProfileForm } from "@/components/account-profile-form";
import { getCurrentAccountProfile } from "@/lib/account-auth";

export default async function AccountProfilePage() {
  const profile = await getCurrentAccountProfile();

  if (!profile) {
    redirect("/login?next=/account/profile");
  }

  return (
    <main className="min-h-screen bg-[#f8faf8] px-4 py-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">Account</p>
            <h1 className="mt-1 text-4xl font-semibold tracking-tight text-slate-950">Your details</h1>
            <p className="mt-2 text-slate-600">Keep these updated so voucher delivery reaches the right place.</p>
          </div>
          <Link href="/account/coupons" className="inline-flex h-11 items-center justify-center rounded-[8px] border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-950">
            Coupons
          </Link>
        </div>

        <AccountProfileForm profile={profile} />
      </div>
    </main>
  );
}
