import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandForm, BrandUserForm } from "@/components/dashboard-action-forms";
import { addBrandUserAction, updateBrandAction } from "@/lib/actions";
import { requireAdminOrRedirect } from "@/lib/auth";
import { getBrandByIdAdmin, listBrandUsersAdmin, listDashboardDealsAdmin } from "@/lib/data";

type BrandDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BrandDetailPage({ params }: BrandDetailPageProps) {
  await requireAdminOrRedirect();
  const { id } = await params;
  const [brand, users, deals] = await Promise.all([
    getBrandByIdAdmin(id),
    listBrandUsersAdmin(id),
    listDashboardDealsAdmin(),
  ]);

  if (!brand) {
    notFound();
  }

  const boundUpdate = updateBrandAction.bind(null, brand.id);
  const brandDeals = deals.filter((deal) => deal.brand?.id === brand.id);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--clay)]">Brand</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[var(--forest)]">{brand.name}</h1>
        </div>
        <Link href="/admin/brands" className="rounded-[8px] border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900">
          All brands
        </Link>
      </div>

      <BrandForm action={boundUpdate} brand={brand} submitLabel="Save brand" />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-950">Partner users</h2>
          <BrandUserForm action={addBrandUserAction} brandId={brand.id} />
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="rounded-[8px] border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-950">{user.email}</p>
                <p className="text-sm capitalize text-slate-500">{user.role}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-950">Assigned deals</h2>
          <div className="space-y-3">
            {brandDeals.map((deal) => (
              <Link key={deal.id} href={`/admin/deals/${deal.id}`} className="block rounded-[8px] border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-950">{deal.title}</p>
                <p className="text-sm capitalize text-slate-500">{deal.status?.replace("_", " ")}</p>
              </Link>
            ))}
            {brandDeals.length === 0 ? <p className="text-sm text-slate-500">No deals assigned yet.</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
