import Link from "next/link";
import { AdminSignOutForm } from "@/components/admin-sign-out-form";
import { requireAdminOrRedirect } from "@/lib/auth";
import { listPrivateUnlockDealsAdmin } from "@/lib/data";

function formatMoney(rupees: number) {
  return `₹${Math.round(rupees).toLocaleString("en-IN")}`;
}

export default async function AdminDealsPage() {
  const user = await requireAdminOrRedirect();
  const deals = await listPrivateUnlockDealsAdmin();

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--clay)]">Admin Dashboard</p>
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--forest)]">Manage voucher unlock deals</h1>
          <p className="max-w-2xl text-base leading-7 text-[rgba(22,38,32,0.72)]">
            Create marketplace vouchers, control featured listings, and track token joins, unlock rooms, and final coupon payments.
          </p>
          <p className="text-sm text-[rgba(22,38,32,0.62)]">Signed in as {user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/deals/new" className="rounded-full bg-[var(--forest)] px-6 py-3 text-sm font-semibold text-white">
            Create new voucher
          </Link>
          <AdminSignOutForm />
        </div>
      </div>
      <div className="overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_70px_rgba(58,80,64,0.10)]">
          <table className="min-w-full text-left">
            <thead className="bg-[var(--mist)] text-sm uppercase tracking-[0.18em] text-[var(--clay)]">
              <tr>
                <th className="px-6 py-4">Brand</th>
                <th className="px-6 py-4">Unlock</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Activity</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id} className="border-t border-[rgba(22,38,32,0.08)]">
                  <td className="px-6 py-5">
                    <p className="font-semibold text-[var(--forest)]">{deal.brandName}</p>
                    <p className="text-sm text-[rgba(22,38,32,0.68)]">{deal.category} · {deal.slug}</p>
                  </td>
                  <td className="px-6 py-5 text-sm text-[rgba(22,38,32,0.72)]">
                    <p>{deal.discountPercent}% off · {formatMoney(deal.voucherValue ?? deal.deal.originalPrice)} value</p>
                    <p className="text-xs text-slate-500">₹{deal.tokenAmount} token · {deal.threshold} people</p>
                    <p className="text-xs text-slate-500">{Math.max(0, deal.couponStockTotal - deal.couponStockClaimed)}/{deal.couponStockTotal} coupons left</p>
                  </td>
                  <td className="px-6 py-5">
                    <span className="rounded-full bg-[var(--mist)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--forest)]">
                      {deal.enabled ? deal.status.replace("_", " ") : "hidden"}
                    </span>
                    {deal.featured ? <p className="mt-2 text-xs font-semibold text-amber-700">Featured</p> : null}
                  </td>
                  <td className="px-6 py-5 text-sm text-[rgba(22,38,32,0.72)]">
                    <p>{deal.roomsCount} rooms</p>
                    <p>{deal.membersCount} joins</p>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-wrap gap-4 text-sm font-semibold text-[var(--forest)]">
                      <Link href={`/admin/deals/${deal.dealId}`}>Edit</Link>
                      <Link href={`/private-unlock/${deal.dealId}`}>View</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>
    </div>
  );
}
