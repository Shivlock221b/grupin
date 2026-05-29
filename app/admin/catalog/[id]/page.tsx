import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductAdminForm } from "@/components/dashboard-action-forms";
import { deleteProductAction, upsertProductAction } from "@/lib/actions";
import { requireAdminOrRedirect } from "@/lib/auth";
import { getProductAdmin, listBrandsAdmin, listProductTeamOrdersAdmin, listProductTeamUnlocksAdmin } from "@/lib/data";

function formatMoney(paise: number) {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export default async function AdminProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminOrRedirect();
  const { id } = await params;
  const [product, brands, rooms, orders] = await Promise.all([
    getProductAdmin(id),
    listBrandsAdmin(),
    listProductTeamUnlocksAdmin(id),
    listProductTeamOrdersAdmin(id),
  ]);

  if (!product) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--clay)]">Admin</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[var(--forest)]">Edit product</h1>
          <p className="mt-2 text-sm text-slate-500">{product.brand?.name} · {product.slug}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/catalog" className="rounded-[8px] border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900">Catalog</Link>
          <form action={deleteProductAction}>
            <input type="hidden" name="productId" value={product.id} />
            <button className="rounded-[8px] border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700">Delete product</button>
          </form>
        </div>
      </div>

      <ProductAdminForm action={upsertProductAction} product={product} brands={brands} />

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ["Rooms", product.roomsCount],
          ["Members", product.membersCount],
          ["Orders", product.ordersCount],
          ["Order revenue", formatMoney(product.ordersRevenue)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[8px] border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-[8px] border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-semibold text-slate-950">Latest rooms</h2>
        <div className="mt-4 space-y-3">
          {rooms.slice(0, 8).map((room) => (
            <div key={room.id} className="rounded-[8px] bg-slate-50 p-3 text-sm">
              <p className="font-semibold">{room.shareCode} · {room.status}</p>
              <p className="text-slate-500">{room.currentCount}/{room.threshold} member carts ready · {room.ordersCount} orders</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[8px] border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-semibold text-slate-950">Latest orders</h2>
        <div className="mt-4 space-y-3">
          {orders.slice(0, 8).map((order) => (
            <div key={order.id} className="rounded-[8px] bg-slate-50 p-3 text-sm">
              <p className="font-semibold">{order.buyerName} · {order.status}</p>
              <p className="text-slate-500">{formatMoney(order.amountPaid)} · {order.shareCode ?? "No room"}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
