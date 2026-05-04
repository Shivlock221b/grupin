import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBrandPartnerOrRedirect } from "@/lib/auth";
import { getPartnerDeal, listPartnerReservations } from "@/lib/data";

type PartnerDealPageProps = {
  params: Promise<{ id: string }>;
};

function formatPrice(price: number) {
  return `₹${price.toLocaleString("en-IN")}`;
}

export default async function PartnerDealPage({ params }: PartnerDealPageProps) {
  const { membership } = await requireBrandPartnerOrRedirect();
  const { id } = await params;
  const [deal, reservations] = await Promise.all([
    getPartnerDeal(membership.brandId, id),
    listPartnerReservations(membership.brandId, id),
  ]);

  if (!deal) {
    notFound();
  }

  const unlockedTier = [...deal.tiers].reverse().find((tier) => deal.currentCount >= tier.threshold);
  const unlockedPrice = unlockedTier?.price ?? deal.originalPrice;
  const progress = Math.min(100, Math.round((deal.currentCount / deal.tiers[2].threshold) * 100));

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--clay)]">{membership.brand.name}</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[var(--forest)]">{deal.title}</h1>
          <p className="mt-3 text-sm capitalize text-slate-500">{deal.status?.replace("_", " ")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={`/partner/deals/${deal.id}/reservations`} className="rounded-[8px] bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
            Reservations
          </Link>
          <Link href="/partner" className="rounded-[8px] border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900">
            Partner home
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-[8px] border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Current buyers</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{deal.currentCount}</p>
        </div>
        <div className="rounded-[8px] border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Reservations</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{reservations.length}</p>
        </div>
        <div className="rounded-[8px] border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Unlocked price</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{formatPrice(unlockedPrice)}</p>
        </div>
        <div className="rounded-[8px] border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Progress</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{progress}%</p>
        </div>
      </div>

      <section className="rounded-[8px] border border-slate-200 bg-white p-5">
        <h2 className="text-2xl font-semibold text-slate-950">Unlock tiers</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {deal.tiers.map((tier, index) => {
            const unlocked = deal.currentCount >= tier.threshold;

            return (
              <div key={tier.threshold} className={`rounded-[8px] border p-4 ${unlocked ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
                <p className="text-sm font-semibold text-slate-500">Level {index + 1}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{formatPrice(tier.price)}</p>
                <p className="mt-1 text-sm text-slate-600">{tier.threshold} buyers required</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
