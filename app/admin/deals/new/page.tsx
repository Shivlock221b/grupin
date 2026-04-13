import { DealForm } from "@/components/deal-form";
import { AdminSignOutForm } from "@/components/admin-sign-out-form";
import { createDealAction } from "@/lib/actions";
import { requireAdminOrRedirect } from "@/lib/auth";

export default async function NewDealPage() {
  const user = await requireAdminOrRedirect();

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--clay)]">Create Deal</p>
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--forest)]">Add a new shareable deal page</h1>
          <p className="max-w-2xl text-base leading-7 text-[rgba(22,38,32,0.72)]">
            Create the offer, choose the join threshold, and publish the page when it is ready to share.
          </p>
          <p className="text-sm text-[rgba(22,38,32,0.62)]">Signed in as {user.email}</p>
        </div>
        <AdminSignOutForm />
      </div>
      <DealForm action={createDealAction} submitLabel="Create deal" />
    </div>
  );
}
