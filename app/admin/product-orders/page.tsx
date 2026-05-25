import Link from "next/link";
import { DummyProductOrderForm, ProductOrderTrackingUpdateForm, ProductTeamOrderStatusForm } from "@/components/dashboard-action-forms";
import { addProductTeamOrderTrackingUpdateAction, createDummyProductOrderAction, deleteProductTeamOrderAction, updateProductTeamOrderAction } from "@/lib/actions";
import { requireAdminOrRedirect } from "@/lib/auth";
import { listProductTeamOrdersAdmin, listProductTeamUnlocksAdmin } from "@/lib/data";

function formatMoney(paise: number) {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export default async function AdminProductOrdersPage() {
  await requireAdminOrRedirect();
  const [orders, rooms] = await Promise.all([listProductTeamOrdersAdmin(), listProductTeamUnlocksAdmin()]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--clay)]">Admin</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[var(--forest)]">Product orders</h1>
        </div>
        <Link href="/admin/catalog" className="rounded-[8px] border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900">Catalog</Link>
      </div>

      <DummyProductOrderForm action={createDummyProductOrderAction} rooms={rooms} />

      <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Buyer</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Controls</th>
              <th className="px-4 py-3">Delete</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-950">{order.buyerName || order.profileName || "Unknown"}</p>
                  <p className="text-slate-500">{order.buyerEmail || order.profileEmail}</p>
                  <p className="text-slate-500">{order.buyerPhone || order.profilePhone}</p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-900">{order.productTitle}</p>
                  <p className="text-slate-500">{order.brandName} · {order.shareCode}</p>
                  <p className="text-xs text-slate-400">{order.selectedVariant?.variant_name ?? order.selectedVariant?.pack_size ?? "No variant"}</p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-900">{formatMoney(order.amountPaid)}</p>
                  <p className="text-xs text-slate-500">{order.status}</p>
                  <p className="text-xs text-slate-400">{order.razorpayPaymentId}</p>
                </td>
                <td className="px-4 py-4">
                  <ProductTeamOrderStatusForm action={updateProductTeamOrderAction} order={order} />
                  <ProductOrderTrackingUpdateForm action={addProductTeamOrderTrackingUpdateAction} order={order} />
                  {order.trackingUpdates?.length ? (
                    <div className="mt-3 space-y-2">
                      {order.trackingUpdates.slice(0, 2).map((update) => (
                        <div key={update.id} className="rounded-[8px] bg-white px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-100">
                          <p className="font-semibold text-slate-900">{update.status.replaceAll("_", " ")}</p>
                          {update.remark ? <p className="mt-1">{update.remark}</p> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-4">
                  <form action={deleteProductTeamOrderAction}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <button className="rounded-[8px] border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">Delete</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
