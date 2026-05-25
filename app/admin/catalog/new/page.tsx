import Link from "next/link";
import { ProductAdminForm } from "@/components/dashboard-action-forms";
import { upsertProductAction } from "@/lib/actions";
import { requireAdminOrRedirect } from "@/lib/auth";
import { listBrandsAdmin } from "@/lib/data";

export default async function NewProductPage() {
  await requireAdminOrRedirect();
  const brands = await listBrandsAdmin();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--clay)]">Admin</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[var(--forest)]">New product</h1>
        </div>
        <Link href="/admin/catalog" className="rounded-[8px] border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900">Catalog</Link>
      </div>
      <ProductAdminForm action={upsertProductAction} brands={brands} />
    </div>
  );
}
