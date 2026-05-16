import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountCouponsClient } from "@/components/account-coupons-client";
import { getCurrentAccountProfile } from "@/lib/account-auth";
import { listAccountUnlockRooms, listAccountUnlockedCoupons } from "@/lib/data";

export default async function AccountCouponsPage() {
  const profile = await getCurrentAccountProfile();

  if (!profile) {
    redirect("/login?next=/account/coupons");
  }

  const [coupons, rooms] = await Promise.all([
    listAccountUnlockedCoupons(profile.id),
    listAccountUnlockRooms(profile.id),
  ]);

  return (
    <main className="min-h-screen bg-[#f8faf8] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">Account</p>
            <h1 className="mt-1 text-4xl font-semibold tracking-tight text-slate-950">Your unlocked coupons</h1>
            <p className="mt-2 text-slate-600">Logged in as {profile.phone}. Coupon codes are delivered to your registered email/phone number after final payment.</p>
          </div>
          <Link href="/unlock-deals" className="inline-flex h-11 items-center justify-center rounded-[8px] border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-950">
            Explore more
          </Link>
        </div>

        <AccountCouponsClient coupons={coupons} rooms={rooms} />
      </div>
    </main>
  );
}
