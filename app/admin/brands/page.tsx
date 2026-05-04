import Link from "next/link";
import { BrandForm } from "@/components/dashboard-action-forms";
import { createBrandAction } from "@/lib/actions";
import { requireAdminOrRedirect } from "@/lib/auth";
import { listBrandsAdmin, listDashboardDealsAdmin } from "@/lib/data";

export default async function AdminBrandsPage() {
  await requireAdminOrRedirect();
  const [brands, deals] = await Promise.all([listBrandsAdmin(), listDashboardDealsAdmin()]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--clay)]">Admin</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[var(--forest)]">Brands</h1>
        </div>
        <Link href="/admin/dashboard" className="rounded-[8px] border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900">
          Control center
        </Link>
      </div>

      <BrandForm action={createBrandAction} submitLabel="Create brand" />

      <div className="grid gap-4 md:grid-cols-2">
        {brands.map((brand) => {
          const dealCount = deals.filter((deal) => deal.brand?.id === brand.id).length;

          return (
            <Link key={brand.id} href={`/admin/brands/${brand.id}`} className="rounded-[8px] border border-slate-200 bg-white p-5 transition hover:border-slate-400">
              <p className="text-xl font-semibold text-slate-950">{brand.name}</p>
              <p className="mt-1 text-sm text-slate-500">{brand.websiteUrl ?? brand.slug}</p>
              <p className="mt-4 text-sm font-semibold text-slate-700">{dealCount} assigned deals</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
