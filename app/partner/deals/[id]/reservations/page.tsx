import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBrandPartnerOrRedirect } from "@/lib/auth";
import { getPartnerDeal, listPartnerReservations } from "@/lib/data";

type PartnerReservationsPageProps = {
  params: Promise<{ id: string }>;
};

function formatMoney(paise: number) {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export default async function PartnerReservationsPage({ params }: PartnerReservationsPageProps) {
  const { membership } = await requireBrandPartnerOrRedirect();
  const { id } = await params;
  const [deal, reservations] = await Promise.all([
    getPartnerDeal(membership.brandId, id),
    listPartnerReservations(membership.brandId, id),
  ]);

  if (!deal) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--clay)]">Reservations</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[var(--forest)]">{deal.title}</h1>
        </div>
        <Link href={`/partner/deals/${deal.id}`} className="rounded-[8px] border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900">
          Deal summary
        </Link>
      </div>

      <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Buyer</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Final purchase</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((reservation) => (
              <tr key={reservation.id} className="border-t border-slate-100">
                <td className="px-4 py-4 font-semibold text-slate-950">{reservation.name}</td>
                <td className="px-4 py-4 text-slate-600">
                  <p>{reservation.email}</p>
                  <p>{reservation.phone}</p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-950">{formatMoney(reservation.amountPaid)}</p>
                  <p className="text-xs capitalize text-slate-500">{reservation.paymentStatus}</p>
                </td>
                <td className="px-4 py-4">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                    {reservation.finalPurchaseStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
