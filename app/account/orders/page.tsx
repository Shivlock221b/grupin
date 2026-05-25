import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAccountProfile } from "@/lib/account-auth";
import { listAccountProductOrders } from "@/lib/data";
import { formatCatalogPrice } from "@/lib/product-pricing";

function statusLabel(status: string) {
  if (status === "hold") return "On hold";
  if (status === "confirmed") return "Confirmed";
  if (status === "refund_pending") return "Refund pending";
  if (status === "refunded") return "Refunded";
  if (status === "cancelled") return "Cancelled";
  return status;
}

export default async function AccountOrdersPage() {
  const profile = await getCurrentAccountProfile();

  if (!profile) {
    redirect("/login?next=/account/orders");
  }

  const orders = await listAccountProductOrders(profile.id);

  return (
    <main className="min-h-screen bg-[#f8faf8] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">Account</p>
            <h1 className="mt-1 text-4xl font-semibold tracking-tight text-slate-950">Orders</h1>
            <p className="mt-2 text-slate-600">Your team-price checkout and order history.</p>
          </div>
          <Link href="/account/rooms" className="inline-flex h-11 items-center justify-center rounded-[8px] border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-950">
            Unlock rooms
          </Link>
        </div>

        {orders.length ? (
          <div className="grid gap-4">
            {orders.map((order) => (
              <div key={order.id} className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-cyan-700">{order.brandName}</p>
                    <h2 className="mt-1 text-xl font-semibold text-slate-950">{order.productTitle}</h2>
                    <p className="mt-1 text-sm text-slate-500">Order ID: {order.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${order.status === "confirmed" ? "bg-lime-100 text-lime-900" : order.status === "cancelled" || order.status === "refunded" ? "bg-rose-50 text-rose-700" : "bg-cyan-50 text-cyan-800"}`}>
                    {statusLabel(order.status)}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[8px] bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">Paid</p>
                    <p className="mt-1 font-semibold text-slate-950">{formatCatalogPrice(order.amountPaid)}</p>
                  </div>
                  <div className="rounded-[8px] bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">Phone</p>
                    <p className="mt-1 font-semibold text-slate-950">{order.buyerPhone}</p>
                  </div>
                  <div className="rounded-[8px] bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-500">Room</p>
                    <p className="mt-1 font-semibold text-slate-950">{order.shareCode || "Team room"}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Link href={`/account/orders/${order.id}`} className="inline-flex h-11 items-center justify-center rounded-[8px] border border-cyan-200 bg-cyan-50 px-4 text-sm font-semibold text-cyan-900 transition hover:bg-cyan-100">
                    View order details
                  </Link>
                  {order.shareCode ? (
                    <Link href={`/team-room/${order.shareCode}`} className="inline-flex h-11 items-center justify-center rounded-[8px] border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-950">
                      View room
                    </Link>
                  ) : null}
                  <Link href={`/team-price/${order.brandSlug}/${order.productSlug}`} className="inline-flex h-11 items-center justify-center rounded-[8px] bg-rose-500 px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(244,63,94,0.18)] transition hover:bg-rose-600">
                    View product
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[8px] border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-xl font-semibold text-slate-950">No orders yet</h2>
            <p className="mt-2 text-sm text-slate-500">When you checkout at team price, your orders will appear here.</p>
            <Link href="/account/rooms" className="mt-5 inline-flex h-11 items-center justify-center rounded-[8px] bg-rose-500 px-5 text-sm font-semibold text-white transition hover:bg-rose-600">
              View unlock rooms
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
