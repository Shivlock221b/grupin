import Link from "next/link";
import { AdminSignOutForm } from "@/components/admin-sign-out-form";
import { requireAdminOrRedirect } from "@/lib/auth";
import { listProductsAdmin } from "@/lib/data";

function formatMoney(value?: number | null) {
  if (value === null || value === undefined) return "-";
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export default async function AdminCatalogPage() {
  const user = await requireAdminOrRedirect();
  const products = await listProductsAdmin();

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--clay)]">Admin</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[var(--forest)]">Product catalog</h1>
          <p className="mt-2 text-sm text-slate-500">Signed in as {user.email}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/catalog/new" className="rounded-[8px] bg-slate-950 px-4 py-2 text-sm font-semibold text-white">New product</Link>
          <Link href="/admin/product-rooms" className="rounded-[8px] border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900">Rooms</Link>
          <Link href="/admin/product-orders" className="rounded-[8px] border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900">Orders</Link>
          <AdminSignOutForm />
        </div>
      </div>

      <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Pricing</th>
              <th className="px-4 py-3">Meta</th>
              <th className="px-4 py-3">Activity</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-950">{product.title}</p>
                  <p className="text-slate-500">{product.brand?.name ?? product.vendor} · {product.slug}</p>
                  <p className="text-xs text-slate-400">{product.inStock === false ? "Out of stock" : "In stock"}</p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-900">MRP {formatMoney(product.mrp ?? product.priceMax)}</p>
                  <p className="text-slate-500">Sale {formatMoney(product.salePrice ?? product.priceMin)}</p>
                  <p className="text-xs text-slate-400">Source discount {product.sourceDiscountPercent ?? 0}%</p>
                </td>
                <td className="px-4 py-4">
                  <p>{product.rating ? `${product.rating} rating` : "No rating"}</p>
                  <p className="text-slate-500">{product.variantCount ?? product.variants.length} {product.variantType ?? "variants"}</p>
                  <p className="text-xs text-slate-400">{product.tags.slice(0, 3).join(", ")}</p>
                </td>
                <td className="px-4 py-4">
                  <p>{product.roomsCount} rooms</p>
                  <p>{product.membersCount} members</p>
                  <p>{product.ordersCount} orders</p>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-3 font-semibold text-slate-700">
                    <Link href={`/admin/catalog/${product.id}`}>Edit</Link>
                    <Link href={`/team-price/${product.brand?.slug ?? "brand"}/${product.slug}`}>View</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
