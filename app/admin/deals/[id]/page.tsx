import { notFound } from "next/navigation";
import { AdminSignOutForm } from "@/components/admin-sign-out-form";
import { DealBrandAssignmentForm } from "@/components/dashboard-action-forms";
import { DealForm } from "@/components/deal-form";
import { assignDealBrandAction, updateDealAction } from "@/lib/actions";
import { requireAdminOrRedirect } from "@/lib/auth";
import { getDealByIdAdmin, listBrandsAdmin, listDashboardDealsAdmin, listInterestsByDeal } from "@/lib/data";

type AdminDealDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminDealDetailPage({ params }: AdminDealDetailPageProps) {
  const user = await requireAdminOrRedirect();
  const { id } = await params;
  const [deal, interests, brands, dashboardDeals] = await Promise.all([
    getDealByIdAdmin(id),
    listInterestsByDeal(id),
    listBrandsAdmin(),
    listDashboardDealsAdmin(),
  ]);

  if (!deal) {
    notFound();
  }

  const boundAction = updateDealAction.bind(null, deal.id);
  const boundBrandAction = assignDealBrandAction.bind(null, deal.id);
  const dashboardDeal = dashboardDeals.find((item) => item.id === deal.id);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-16">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--clay)]">Edit Deal</p>
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--forest)]">{deal.title}</h1>
          <p className="max-w-2xl text-base leading-7 text-[rgba(22,38,32,0.72)]">
            Update the copy, track the join count, and decide when to send the unlocked deal details to everyone who
            joined.
          </p>
          <p className="text-sm text-[rgba(22,38,32,0.62)]">Signed in as {user.email}</p>
        </div>
        <div className="space-y-4">
          <div className="rounded-[2rem] bg-[var(--mist)] p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-[var(--clay)]">Live summary</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-[rgba(22,38,32,0.68)]">Status</p>
                <p className="mt-1 text-2xl font-semibold capitalize text-[var(--forest)]">{deal.status.replace("_", " ")}</p>
              </div>
              <div>
                <p className="text-sm text-[rgba(22,38,32,0.68)]">Joined people</p>
                <p className="mt-1 text-2xl font-semibold text-[var(--forest)]">
                  {interests.length}/{deal.minimumInterestCount}
                </p>
              </div>
            </div>
          </div>
          <AdminSignOutForm />
        </div>
      </div>
      <DealBrandAssignmentForm action={boundBrandAction} brands={brands} currentBrandId={dashboardDeal?.brand?.id} />
      <DealForm action={boundAction} deal={deal} submitLabel="Save changes" />
    </div>
  );
}
