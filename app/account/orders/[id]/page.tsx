import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentAccountProfile } from "@/lib/account-auth";
import { getAccountProductOrderById } from "@/lib/data";
import { formatCatalogPrice } from "@/lib/product-pricing";

type OrderDetailsPageProps = {
  params: Promise<{ id: string }>;
};

function statusLabel(status: string) {
  if (status === "hold") return "On hold";
  if (status === "confirmed") return "Confirmed";
  if (status === "refund_pending") return "Refund pending";
  if (status === "refunded") return "Refunded";
  if (status === "cancelled") return "Cancelled";
  return status;
}

function statusClass(status: string) {
  if (status === "confirmed") return "bg-lime-100 text-lime-900";
  if (status === "cancelled" || status === "refunded") return "bg-rose-50 text-rose-700";
  return "bg-cyan-50 text-cyan-800";
}

function addressText(address: Record<string, unknown>) {
  const parts = [address.addressLine, address.city, address.state, address.pincode]
    .map((part) => typeof part === "string" ? part.trim() : "")
    .filter(Boolean);
  return parts.length ? parts.join(", ") : "No address saved";
}

function trackingStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export default async function OrderDetailsPage({ params }: OrderDetailsPageProps) {
  const [{ id }, profile] = await Promise.all([params, getCurrentAccountProfile()]);

  if (!profile) {
    redirect(`/login?next=/account/orders/${id}`);
  }

  const order = await getAccountProductOrderById(profile.id, id);

  if (!order) {
    notFound();
  }

  const latestUpdate = order.trackingUpdates?.[0] ?? null;
  const visibleStatus = latestUpdate?.status ?? order.status;
  const mrpTotal = order.items?.reduce((total, item) => total + item.mrpSnapshot * item.quantity, 0) ?? 0;
  const teamTotal = order.items?.reduce((total, item) => total + item.teamPriceSnapshot * item.quantity, 0) ?? 0;
  const savings = Math.max(0, mrpTotal - teamTotal);

  return (
    <main className="min-h-screen bg-[#fbfcf8] px-4 py-6 sm:py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Order details</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Order {order.id.slice(0, 8).toUpperCase()}</h1>
            <p className="mt-2 text-slate-600">Order ID: {order.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${statusClass(visibleStatus)}`}>
            {latestUpdate ? trackingStatusLabel(visibleStatus) : statusLabel(visibleStatus)}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(20,33,29,0.08)]">
            <div className="rounded-[16px] bg-lime-50 p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-lime-800">Order status</p>
              <h2 className="mt-1 text-2xl font-semibold capitalize tracking-tight text-slate-950 sm:text-3xl">{latestUpdate ? trackingStatusLabel(visibleStatus) : statusLabel(visibleStatus)}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-lime-950">
                {latestUpdate?.remark ?? (order.status === "confirmed"
                  ? "Everyone in your Team Room has checked out. Your order is confirmed."
                  : "Your payment is captured. The order will confirm after all eligible carts checkout.")}
              </p>
            </div>
            <div className="mt-4 grid gap-3">
              <div className="rounded-[12px] bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500">Room progress</p>
                <p className="mt-1 font-semibold text-slate-950">{order.roomCurrentCount ?? "-"} / {order.roomThreshold ?? "-"} member carts ready · {order.roomStatus ?? "room"}</p>
              </div>
              <div className="rounded-[12px] bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500">Delivery address</p>
                <p className="mt-1 font-semibold text-slate-950">{addressText(order.deliveryAddress)}</p>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-100 pt-5">
              <h2 className="text-xl font-semibold text-slate-950">Order timeline</h2>
              <div className="mt-4 space-y-3">
                {order.trackingUpdates?.length ? (
                  order.trackingUpdates.map((update) => (
                    <div key={update.id} className="flex gap-3">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lime-300 text-xs font-black text-lime-950">✓</div>
                      <div className="min-w-0 flex-1 rounded-[12px] bg-slate-50 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold capitalize text-slate-950">{trackingStatusLabel(update.status)}</p>
                          <p className="text-xs font-medium text-slate-500">{new Date(update.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                        </div>
                        {update.remark ? <p className="mt-1 text-sm leading-6 text-slate-600">{update.remark}</p> : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[8px] bg-slate-50 p-3 text-sm font-semibold text-slate-600">
                    Tracking updates will appear here once the admin updates this order.
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(20,33,29,0.08)]">
            <p className="text-sm font-semibold text-cyan-700">{order.brandName}</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Summary</h2>
            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm">
              {mrpTotal ? (
                <div className="flex justify-between">
                  <span className="text-slate-500">MRP</span>
                  <span className="font-semibold text-slate-500 line-through">{formatCatalogPrice(mrpTotal)}</span>
                </div>
              ) : null}
              {savings ? (
                <div className="flex justify-between text-rose-700">
                  <span className="font-semibold">Team savings</span>
                  <span className="font-semibold">{formatCatalogPrice(savings)}</span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-slate-500">Paid</span>
                <span className="font-semibold text-slate-950">{formatCatalogPrice(order.amountPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone</span>
                <span className="font-semibold text-slate-950">{order.buyerPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Room</span>
                <span className="font-semibold text-slate-950">{order.shareCode || "Team room"}</span>
              </div>
            </div>
            <div className="mt-5 grid gap-2">
              {order.shareCode ? (
                <Link href={`/team-room/${order.shareCode}`} className="inline-flex h-11 items-center justify-center rounded-[12px] border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-950">
                  View room
                </Link>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
