import Link from "next/link";
import { AdminSignOutForm } from "@/components/admin-sign-out-form";
import { PlatformCouponInventoryForm, TelegramTestForm } from "@/components/dashboard-action-forms";
import { sendTelegramTestAction, updatePlatformCouponInventoryAction } from "@/lib/actions";
import { requireAdminOrRedirect } from "@/lib/auth";
import { getPlatformCouponInventory, listBrandsAdmin, listCouponClaimsAdmin, listPrivateUnlockDealsAdmin, listPrivateUnlockMembersAdmin } from "@/lib/data";

function formatMoney(paise: number) {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export default async function AdminDashboardPage() {
  const user = await requireAdminOrRedirect();
  const [deals, joins, claims, brands, platformInventory] = await Promise.all([
    listPrivateUnlockDealsAdmin(),
    listPrivateUnlockMembersAdmin(),
    listCouponClaimsAdmin(),
    listBrandsAdmin(),
    getPlatformCouponInventory(),
  ]);

  const tokenRevenue = joins.filter((join) => join.paymentStatus === "paid").reduce((sum, join) => sum + join.amountPaid, 0);
  const finalRevenue = claims.filter((claim) => claim.status === "paid").reduce((sum, claim) => sum + claim.amountPaid, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--clay)]">GruPin Admin</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[var(--forest)]">Control center</h1>
          <p className="mt-3 text-sm text-[rgba(22,38,32,0.62)]">Signed in as {user.email}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/deals/new" className="rounded-[8px] bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
            New voucher
          </Link>
          <Link href="/admin/brands" className="rounded-[8px] border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900">
            Brands
          </Link>
          <AdminSignOutForm />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Deals", deals.length],
          ["Brands", brands.length],
          ["Token joins", joins.length],
          ["Coupon stock", `${platformInventory.remaining}/${platformInventory.total}`],
          ["Total revenue", formatMoney(tokenRevenue + finalRevenue)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[8px] border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950">Global coupon inventory</h2>
          <p className="mt-1 text-sm text-slate-500">
            This hidden platform limit controls whether any new deal can accept token joins.
          </p>
        </div>
        <PlatformCouponInventoryForm
          action={updatePlatformCouponInventoryAction}
          total={platformInventory.total}
          claimed={platformInventory.claimed}
        />
        <TelegramTestForm action={sendTelegramTestAction} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-950">Voucher controls</h2>
            <Link href="/admin/deals" className="text-sm font-semibold text-slate-700">All deals</Link>
          </div>
          {deals.slice(0, 6).map((deal) => (
            <div key={deal.id} className="rounded-[8px] border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{deal.brandName}</p>
                  <p className="text-sm text-slate-500">
                    {deal.enabled ? "Enabled" : "Hidden"} · {deal.featured ? "Featured" : "Standard"} · {deal.membersCount}/{deal.threshold} joins
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Token {formatMoney(deal.tokenAmount * 100)} · Final revenue {formatMoney(deal.finalRevenue)}
                  </p>
                </div>
                <Link href={`/admin/deals/${deal.dealId}`} className="text-sm font-semibold text-slate-700">Edit</Link>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-[8px] border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-slate-950">Latest joins</h2>
            <Link href="/admin/reservations" className="text-sm font-semibold text-slate-700">View all</Link>
          </div>
          <div className="mt-5 space-y-4">
            {joins.slice(0, 8).map((join) => (
              <div key={join.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                <p className="font-semibold text-slate-950">{join.name}</p>
                <p className="text-sm text-slate-500">{join.dealTitle} · {join.shareCode ?? "No room"}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {join.paymentStatus} · {formatMoney(join.amountPaid)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
