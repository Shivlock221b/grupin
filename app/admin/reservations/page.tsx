import Link from "next/link";
import { CouponClaimDeliveryForm, DummyUnlockMemberForm, DummyUnlockRoomForm, PrivateUnlockMemberStatusForm, UnlockRoomControlForm } from "@/components/dashboard-action-forms";
import { addDummyUnlockMemberAction, createDummyUnlockRoomAction, deleteCouponClaimAction, deletePrivateUnlockMemberAction, deletePrivateUnlockRoomAction, updateCouponClaimAction, updatePrivateUnlockMemberAction, updatePrivateUnlockRoomAction } from "@/lib/actions";
import { requireAdminOrRedirect } from "@/lib/auth";
import { listCouponClaimsAdmin, listPrivateUnlockDealsAdmin, listPrivateUnlockMembersAdmin, listPrivateUnlockRoomsAdmin } from "@/lib/data";

function formatMoney(paise: number) {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export default async function AdminReservationsPage() {
  await requireAdminOrRedirect();
  const [joins, claims, rooms, deals] = await Promise.all([listPrivateUnlockMembersAdmin(), listCouponClaimsAdmin(), listPrivateUnlockRoomsAdmin(), listPrivateUnlockDealsAdmin()]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--clay)]">Admin</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[var(--forest)]">Unlock joins and coupon payments</h1>
        </div>
        <Link href="/admin/dashboard" className="rounded-[8px] border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900">
          Control center
        </Link>
      </div>

      <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4">
          <h2 className="text-xl font-semibold text-slate-950">Private unlock rooms</h2>
          <p className="text-sm text-slate-500">Add dummy users for demos or delete rooms that should no longer exist.</p>
        </div>
        <div className="border-b border-slate-100 p-4">
          <DummyUnlockRoomForm action={createDummyUnlockRoomAction} deals={deals} />
        </div>
        <div className="divide-y divide-slate-100">
          {rooms.slice(0, 25).map((room) => (
            <div key={room.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{room.dealTitle}</p>
                  <p className="text-sm text-slate-500">{room.brandName} · {room.shareCode} · {room.currentCount}/{room.threshold}</p>
                  <p className="text-xs font-semibold text-slate-400">
                    {new Date(room.expiresAt).getTime() <= Date.now() ? "Expired" : "Active"} · expires {new Date(room.expiresAt).toLocaleString("en-IN")}
                  </p>
                </div>
                <form action={deletePrivateUnlockRoomAction}>
                  <input type="hidden" name="unlockId" value={room.id} />
                  <button className="rounded-[8px] border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Delete room</button>
                </form>
              </div>
              <UnlockRoomControlForm action={updatePrivateUnlockRoomAction} unlockId={room.id} expiresAt={room.expiresAt} />
              <DummyUnlockMemberForm action={addDummyUnlockMemberAction} unlockId={room.id} dealId={room.dealId} />
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Buyer</th>
              <th className="px-4 py-3">Deal</th>
              <th className="px-4 py-3">Token payment</th>
              <th className="px-4 py-3">Controls</th>
              <th className="px-4 py-3">Delete</th>
            </tr>
          </thead>
          <tbody>
            {joins.map((join) => (
              <tr key={join.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-950">{join.name}</p>
                  <p className="text-slate-500">{join.email}</p>
                  <p className="text-slate-500">{join.phone}</p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-900">{join.dealTitle}</p>
                  <p className="text-slate-500">{join.brandName ?? "Unassigned"} · {join.shareCode ?? "No room"}</p>
                  <p className="text-xs text-slate-400">{join.unlockCount ?? 0}/{join.unlockThreshold ?? 0} in room</p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-900">{formatMoney(join.amountPaid)}</p>
                  <p className="text-xs text-slate-500">{join.razorpayPaymentId}</p>
                </td>
                <td className="px-4 py-4">
                  <PrivateUnlockMemberStatusForm action={updatePrivateUnlockMemberAction} member={join} />
                </td>
                <td className="px-4 py-4">
                  <form action={deletePrivateUnlockMemberAction}>
                    <input type="hidden" name="memberId" value={join.id} />
                    <input type="hidden" name="unlockId" value={join.unlockId} />
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

      <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4">
          <h2 className="text-xl font-semibold text-slate-950">Final coupon payments</h2>
          <p className="text-sm text-slate-500">These users have paid the remaining amount and should receive voucher delivery by email/phone.</p>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Buyer</th>
              <th className="px-4 py-3">Deal</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Delivery</th>
              <th className="px-4 py-3">Delete</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((claim) => (
              <tr key={claim.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-950">{claim.buyerName ?? "Unknown user"}</p>
                  <p className="text-slate-500">{claim.buyerEmail}</p>
                  <p className="text-slate-500">{claim.buyerPhone}</p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-900">{claim.dealTitle}</p>
                  <p className="text-slate-500">{claim.brandName ?? "Unassigned"}</p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-900">{formatMoney(claim.amountPaid)}</p>
                  <p className="text-xs text-slate-500">{claim.razorpayPaymentId}</p>
                </td>
                <td className="px-4 py-4">
                  <CouponClaimDeliveryForm action={updateCouponClaimAction} claim={claim} />
                </td>
                <td className="px-4 py-4">
                  <form action={deleteCouponClaimAction}>
                    <input type="hidden" name="claimId" value={claim.id} />
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
