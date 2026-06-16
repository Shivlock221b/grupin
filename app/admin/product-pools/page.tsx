import Link from "next/link";
import { requireAdminOrRedirect } from "@/lib/auth";
import { listProductPoolsAdmin } from "@/lib/data";
import { formatCatalogPrice } from "@/lib/product-pricing";
import { productImageUrl } from "@/lib/product-images";

function percent(current: number, threshold: number) {
  if (!threshold) return 0;
  return Math.min(100, Math.round((current / threshold) * 100));
}

function dateLabel(value?: string | null) {
  if (!value) return "No date";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function AdminProductPoolsPage() {
  await requireAdminOrRedirect();
  const pools = await listProductPoolsAdmin();

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--clay)]">Admin</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[var(--forest)]">Product Pools</h1>
          <p className="mt-2 text-sm text-slate-500">Monitor public demand pools, target prices, members, and unlock progress.</p>
        </div>
        <Link href="/admin" className="rounded-[8px] border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900">
          Admin home
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ["Total pools", pools.length],
          ["Pooling", pools.filter((pool) => pool.status === "pooling").length],
          ["Unlocked", pools.filter((pool) => pool.status === "unlocked").length],
          ["Members", pools.reduce((sum, pool) => sum + pool.currentJoinCount, 0)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[8px] border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {pools.map((pool) => {
          const product = pool.product;
          const progress = percent(pool.currentJoinCount, pool.unlockThreshold);
          const price = pool.currentMarketPrice ?? product.salePrice ?? product.mrp ?? product.priceMin;
          const targetPrice = pool.unlockPrice ?? (price ? Math.round(Number(price) * 0.8) : null);
          const remaining = Math.max(0, pool.unlockThreshold - pool.currentJoinCount);

          return (
            <article key={pool.id} className="rounded-[8px] border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 gap-4">
                  <img src={productImageUrl(product.primaryImage, 300)} alt="" className="h-20 w-20 shrink-0 rounded-[8px] bg-slate-50 object-contain p-2" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">{product.brand?.name ?? product.vendor ?? "Product"}</p>
                    <h2 className="mt-1 line-clamp-2 text-lg font-semibold text-slate-950">{product.title}</h2>
                    <p className="mt-1 text-xs font-semibold text-slate-400">{pool.poolKey ?? pool.id}</p>
                  </div>
                </div>
                <div className="grid gap-2 text-sm font-semibold text-slate-700 sm:grid-cols-2 lg:w-[28rem]">
                  <div className="rounded-[8px] bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Nykaa price</p>
                    <p className="mt-1 text-slate-950">{formatCatalogPrice(price ? Math.round(Number(price)) : null)}</p>
                  </div>
                  <div className="rounded-[8px] bg-emerald-50 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-emerald-600">Target price</p>
                    <p className="mt-1 text-emerald-900">{formatCatalogPrice(targetPrice ? Math.round(Number(targetPrice)) : null)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-slate-700">
                    <span>{pool.currentJoinCount}/{pool.unlockThreshold} members joined</span>
                    <span>{pool.status === "unlocked" ? "Unlocked" : `${remaining} spots left`}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{pool.status}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">created {dateLabel(pool.createdAt)}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">expires {dateLabel(pool.expiresAt)}</span>
                </div>
              </div>
            </article>
          );
        })}
        {!pools.length ? (
          <div className="rounded-[8px] border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-xl font-semibold text-slate-950">No product pools yet</h2>
            <p className="mt-2 text-sm text-slate-500">Pools will appear here when users search or paste Nykaa products.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
