import { notFound } from "next/navigation";
import { AdminSignOutForm } from "@/components/admin-sign-out-form";
import { DealForm } from "@/components/deal-form";
import { deletePrivateUnlockDealAction, updateDealAction } from "@/lib/actions";
import { requireAdminOrRedirect } from "@/lib/auth";
import { getPrivateUnlockDealAdmin, listCouponClaimsAdmin, listPrivateUnlockMembersAdmin } from "@/lib/data";

type AdminDealDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminDealDetailPage({ params }: AdminDealDetailPageProps) {
  const user = await requireAdminOrRedirect();
  const { id } = await params;
  const [deal, joins, claims] = await Promise.all([
    getPrivateUnlockDealAdmin(id),
    listPrivateUnlockMembersAdmin(id),
    listCouponClaimsAdmin(id),
  ]);

  if (!deal) {
    notFound();
  }

  const boundAction = updateDealAction.bind(null, deal.dealId);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-16">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--clay)]">Edit Deal</p>
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--forest)]">{deal.brandName}</h1>
          <p className="max-w-2xl text-base leading-7 text-[rgba(22,38,32,0.72)]">
            Update the marketplace listing, unlock economics, token price, featured status, and source voucher metadata.
          </p>
          <p className="text-sm text-[rgba(22,38,32,0.62)]">Signed in as {user.email}</p>
        </div>
        <div className="space-y-4">
          <div className="rounded-[2rem] bg-[var(--mist)] p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--clay)]">Live summary</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-[rgba(22,38,32,0.68)]">Status</p>
                <p className="mt-1 text-2xl font-semibold capitalize text-[var(--forest)]">
                  {deal.enabled ? deal.status.replace("_", " ") : "hidden"}
                </p>
              </div>
              <div>
                <p className="text-sm text-[rgba(22,38,32,0.68)]">Token joins</p>
                <p className="mt-1 text-2xl font-semibold text-[var(--forest)]">
                  {joins.length}/{deal.threshold}
                </p>
              </div>
              <div>
                <p className="text-sm text-[rgba(22,38,32,0.68)]">Unlock rooms</p>
                <p className="mt-1 text-2xl font-semibold text-[var(--forest)]">{deal.roomsCount}</p>
              </div>
              <div>
                <p className="text-sm text-[rgba(22,38,32,0.68)]">Final claims</p>
                <p className="mt-1 text-2xl font-semibold text-[var(--forest)]">{claims.length}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm text-[rgba(22,38,32,0.68)]">Coupon stock</p>
                <p className="mt-1 text-2xl font-semibold text-[var(--forest)]">
                  {Math.max(0, deal.couponStockTotal - deal.couponStockClaimed)}/{deal.couponStockTotal} left
                </p>
              </div>
            </div>
          </div>
          <AdminSignOutForm />
        </div>
      </div>
      <DealForm action={boundAction} deal={deal} submitLabel="Save changes" />
      <div className="rounded-[8px] border border-red-200 bg-red-50 p-5">
        <h2 className="text-lg font-semibold text-red-950">Delete voucher deal</h2>
        <p className="mt-1 text-sm text-red-800">
          This removes the marketplace config and the underlying deal row. Private rooms, joins, and coupon records linked to it may cascade depending on database constraints.
        </p>
        <form action={deletePrivateUnlockDealAction} className="mt-4">
          <input type="hidden" name="dealId" value={deal.dealId} />
          <button className="rounded-[8px] bg-red-700 px-4 py-2 text-sm font-semibold text-white">
            Delete deal
          </button>
        </form>
      </div>
    </div>
  );
}
