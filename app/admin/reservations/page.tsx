import Link from "next/link";
import { ReservationStatusForm } from "@/components/dashboard-action-forms";
import { deleteReservationAction, updateReservationAction } from "@/lib/actions";
import { requireAdminOrRedirect } from "@/lib/auth";
import { listDashboardReservationsAdmin } from "@/lib/data";

function formatMoney(paise: number) {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export default async function AdminReservationsPage() {
  await requireAdminOrRedirect();
  const reservations = await listDashboardReservationsAdmin();

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--clay)]">Admin</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[var(--forest)]">All reservations</h1>
        </div>
        <Link href="/admin/dashboard" className="rounded-[8px] border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900">
          Control center
        </Link>
      </div>

      <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Buyer</th>
              <th className="px-4 py-3">Deal</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Controls</th>
              <th className="px-4 py-3">Delete</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((reservation) => (
              <tr key={reservation.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-950">{reservation.name}</p>
                  <p className="text-slate-500">{reservation.email}</p>
                  <p className="text-slate-500">{reservation.phone}</p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-900">{reservation.dealTitle}</p>
                  <p className="text-slate-500">{reservation.brandName ?? "Unassigned"}</p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-900">{formatMoney(reservation.amountPaid)}</p>
                  <p className="text-xs text-slate-500">{reservation.razorpayPaymentId}</p>
                </td>
                <td className="px-4 py-4">
                  <ReservationStatusForm action={updateReservationAction} reservation={reservation} />
                </td>
                <td className="px-4 py-4">
                  <form action={deleteReservationAction}>
                    <input type="hidden" name="reservationId" value={reservation.id} />
                    <button className="rounded-[8px] border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
