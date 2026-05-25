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

function variantText(variant: unknown) {
  if (!variant || typeof variant !== "object") return "Default selection";
  const row = variant as Record<string, unknown>;
  return String(row.variant_name || row.pack_size || row.title || "Selected variant");
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

  return (
    <main className="min-h-screen bg-[#f8faf8] px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">Order details</p>
            <h1 className="mt-1 text-4xl font-semibold tracking-tight text-slate-950">{order.productTitle}</h1>
            <p className="mt-2 text-slate-600">Order ID: {order.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${statusClass(visibleStatus)}`}>
            {latestUpdate ? trackingStatusLabel(visibleStatus) : statusLabel(visibleStatus)}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
            <h2 className="text-xl font-semibold text-slate-950">Tracking</h2>
            <div className="mt-4 grid gap-3">
              <div className="rounded-[8px] bg-lime-50 p-4">
                <p className="text-sm font-bold capitalize text-lime-900">{latestUpdate ? trackingStatusLabel(visibleStatus) : order.status === "confirmed" ? "Order confirmed" : "Payment received, order on hold"}</p>
                <p className="mt-1 text-sm leading-6 text-lime-950">
                  {latestUpdate?.remark ?? (order.status === "confirmed"
                    ? "Everyone in your room has checked out. The order is ready for admin processing."
                    : "Your payment is captured. The order will confirm after all joined room members checkout.")}
                </p>
              </div>
              <div className="rounded-[8px] bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500">Room progress</p>
                <p className="mt-1 font-semibold text-slate-950">{order.roomCurrentCount ?? "-"} / {order.roomThreshold ?? "-"} joined · {order.roomStatus ?? "room"}</p>
              </div>
              <div className="rounded-[8px] bg-slate-50 p-4">
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
                      <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-cyan-500" />
                      <div className="min-w-0 flex-1 rounded-[8px] bg-slate-50 p-3">
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

          <aside className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-semibold text-cyan-700">{order.brandName}</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Summary</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Variant</span>
                <span className="text-right font-semibold text-slate-950">{variantText(order.selectedVariant)}</span>
              </div>
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
                <Link href={`/team-room/${order.shareCode}`} className="inline-flex h-11 items-center justify-center rounded-[8px] border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-950">
                  View room
                </Link>
              ) : null}
              <Link href={`/team-price/${order.brandSlug}/${order.productSlug}`} className="inline-flex h-11 items-center justify-center rounded-[8px] bg-rose-500 px-4 text-sm font-semibold text-white">
                View product
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
