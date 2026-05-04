import Link from "next/link";
import { AdminSignOutForm } from "@/components/admin-sign-out-form";
import { requireBrandPartnerOrRedirect } from "@/lib/auth";
import { listPartnerDeals, listPartnerReservations } from "@/lib/data";

function formatMoney(paise: number) {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

function getUnlockedPrice(deal: Awaited<ReturnType<typeof listPartnerDeals>>[number]) {
  return [...deal.tiers].reverse().find((tier) => deal.currentCount >= tier.threshold)?.price ?? deal.originalPrice;
}

export default async function PartnerDashboardPage() {
  const { user, membership } = await requireBrandPartnerOrRedirect();
  const [deals, reservations] = await Promise.all([
    listPartnerDeals(membership.brandId),
    listPartnerReservations(membership.brandId),
  ]);
  const paidReservations = reservations.filter((reservation) => reservation.paymentStatus === "paid");

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--clay)]">Brand Partner</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[var(--forest)]">{membership.brand.name} dashboard</h1>
          <p className="mt-3 text-sm text-[rgba(22,38,32,0.62)]">Signed in as {user.email}</p>
        </div>
        <AdminSignOutForm />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-[8px] border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Deals</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{deals.length}</p>
        </div>
        <div className="rounded-[8px] border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Reservations</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{reservations.length}</p>
        </div>
        <div className="rounded-[8px] border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Reservation revenue</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {formatMoney(paidReservations.reduce((sum, reservation) => sum + reservation.amountPaid, 0))}
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-950">Your deals</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {deals.map((deal) => (
            <Link key={deal.id} href={`/partner/deals/${deal.id}`} className="rounded-[8px] border border-slate-200 bg-white p-5 transition hover:border-slate-400">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xl font-semibold text-slate-950">{deal.title}</p>
                  <p className="mt-1 text-sm capitalize text-slate-500">{deal.status?.replace("_", " ")}</p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                  {formatMoney(getUnlockedPrice(deal) * 100)}
                </span>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, (deal.currentCount / deal.tiers[2].threshold) * 100)}%` }} />
              </div>
              <p className="mt-3 text-sm font-medium text-slate-600">{deal.currentCount}/{deal.tiers[2].threshold} buyers joined</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-[8px] border border-slate-200 bg-white p-5">
        <h2 className="text-2xl font-semibold text-slate-950">Latest reservations</h2>
        <div className="mt-5 space-y-4">
          {reservations.slice(0, 8).map((reservation) => (
            <div key={reservation.id} className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
              <div>
                <p className="font-semibold text-slate-950">{reservation.name}</p>
                <p className="text-sm text-slate-500">{reservation.dealTitle} · {reservation.email}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                {reservation.paymentStatus}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
