"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CreditCard } from "lucide-react";
import Link from "next/link";
import { ProductTeamCartItem, ProductTeamUnlock, AccountProfile } from "@/lib/types";
import { productImageUrl } from "@/lib/product-images";
import { formatCatalogPrice } from "@/lib/product-pricing";

type RazorpayResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature?: string;
};

type RazorpayCheckout = {
  open: () => void;
  on?: (event: string, handler: () => void) => void;
};

type ProductTeamCheckoutClientProps = {
  code: string;
  cartItems: ProductTeamCartItem[];
  unlock: ProductTeamUnlock;
  profile: AccountProfile | null;
};

async function loadRazorpayScript() {
  if (window.Razorpay) {
    return true;
  }

  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function itemLabel(item: ProductTeamCartItem) {
  const variant = item.selectedVariant;
  return String(variant?.variant_name ?? variant?.pack_size ?? item.productSnapshot.variantLabel ?? "");
}

export function ProductTeamCheckoutClient({ code, cartItems, unlock, profile }: ProductTeamCheckoutClientProps) {
  const router = useRouter();
  const [buyerName, setBuyerName] = useState(profile?.fullName ?? "");
  const [buyerEmail, setBuyerEmail] = useState(profile?.email ?? "");
  const [buyerPhone, setBuyerPhone] = useState(profile?.phone ?? "");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const payable = useMemo(
    () => cartItems.reduce((total, item) => total + item.teamPriceSnapshot * item.quantity, 0),
    [cartItems],
  );
  const mrpTotal = useMemo(
    () => cartItems.reduce((total, item) => total + item.mrpSnapshot * item.quantity, 0),
    [cartItems],
  );

  async function confirmOrder(payment: RazorpayResponse) {
    const response = await fetch("/api/product-team-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        buyerName,
        buyerEmail,
        buyerPhone,
        deliveryAddress: {
          addressLine,
          city,
          state: stateName,
          pincode,
        },
        razorpayPaymentId: payment.razorpay_payment_id,
        razorpayOrderId: payment.razorpay_order_id,
        razorpaySignature: payment.razorpay_signature,
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message ?? "Could not place product order.");
    }

    setSuccess("Order placed on hold. You can track it in Orders.");
    router.refresh();
    setTimeout(() => router.push("/account/orders"), 900);
  }

  async function submitCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      if (!payable) {
        throw new Error("Product price is not available.");
      }

      const orderResponse = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "product_team_order", code }),
      });
      const order = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(order.message ?? "Could not create payment order.");
      }

      if (order.demoMode) {
        await confirmOrder({
          razorpay_payment_id: `pay_product_demo_${Date.now()}`,
          razorpay_order_id: order.orderId,
        });
        return;
      }

      const scriptReady = await loadRazorpayScript();

      if (!scriptReady || !window.Razorpay) {
        throw new Error("Razorpay checkout could not be loaded.");
      }

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: "INR",
        name: "GruPin",
        description: `Team price order for ${cartItems.length} item${cartItems.length > 1 ? "s" : ""}`,
        order_id: order.orderId,
        prefill: {
          name: buyerName,
          email: buyerEmail,
          contact: buyerPhone,
        },
        handler: async (response: RazorpayResponse) => {
          await confirmOrder(response);
        },
        theme: {
          color: "#f43f5e",
        },
        modal: {
          ondismiss: () => setBusy(false),
        },
      });

      (checkout as RazorpayCheckout).on?.("payment.failed", () => {
        setError("Payment failed. Please try again.");
        setBusy(false);
      });

      checkout.open();
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Could not complete checkout.");
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto grid max-w-5xl gap-5 px-4 py-5 pb-28 lg:grid-cols-[1fr_360px] lg:pb-5">
      <form onSubmit={submitCheckout} className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(20,33,29,0.08)]">
        <div className="rounded-[16px] bg-lime-50 p-4">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">Team Price unlocked</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Checkout your cart</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Pay for your cart now. Your order stays on hold until every eligible cart checks out.</p>
        </div>

        <div className="mt-5 grid gap-3">
          <input value={buyerName} onChange={(event) => setBuyerName(event.target.value)} required placeholder="Full name" className="h-12 rounded-[12px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-cyan-500" />
          <input value={buyerEmail} onChange={(event) => setBuyerEmail(event.target.value)} type="email" placeholder="Email" className="h-12 rounded-[12px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-cyan-500" />
          <input value={buyerPhone} onChange={(event) => setBuyerPhone(event.target.value)} required placeholder="Phone number" className="h-12 rounded-[12px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-cyan-500" />
          <textarea value={addressLine} onChange={(event) => setAddressLine(event.target.value)} required placeholder="Delivery address" rows={4} className="rounded-[12px] border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:border-cyan-500" />
          <div className="grid gap-3 sm:grid-cols-3">
            <input value={city} onChange={(event) => setCity(event.target.value)} required placeholder="City" className="h-12 rounded-[12px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-cyan-500" />
            <input value={stateName} onChange={(event) => setStateName(event.target.value)} required placeholder="State" className="h-12 rounded-[12px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-cyan-500" />
            <input value={pincode} onChange={(event) => setPincode(event.target.value)} required placeholder="Pincode" className="h-12 rounded-[12px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-cyan-500" />
          </div>
        </div>
        <div className="mt-5 rounded-[16px] bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-950">
          Your payment places this cart order on hold. Once every eligible cart checks out, all orders move to confirmed. If the Team Room expires before checkout completes, refunds will be handled as per policy.
        </div>
        {error ? <p className="mt-4 rounded-[8px] bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
        {success ? (
          <p className="mt-4 inline-flex w-full items-center gap-2 rounded-[8px] bg-lime-50 px-3 py-2 text-sm font-semibold text-lime-900">
            <CheckCircle2 className="h-4 w-4" />
            {success}
          </p>
        ) : null}
        <button disabled={busy || !payable} className="fixed inset-x-4 bottom-4 z-40 inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-rose-500 px-5 text-sm font-black text-white shadow-[0_16px_36px_rgba(244,63,94,0.28)] transition hover:bg-rose-600 disabled:opacity-50 lg:static lg:mt-5 lg:w-full lg:shadow-none">
          <CreditCard className="h-4 w-4" />
          {busy ? "Opening payment..." : `Pay ${formatCatalogPrice(payable)}`}
        </button>
      </form>

      <aside className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(20,33,29,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">Order summary</p>
        <div className="mt-4 space-y-3">
          {cartItems.map((item) => (
            <Link
              key={item.id}
              href={`/team-price/${item.productSnapshot.brandSlug}/${item.productSnapshot.slug}`}
              className="flex gap-3 rounded-[12px] border border-slate-100 p-2 transition hover:border-cyan-200 hover:bg-cyan-50"
            >
              <img src={productImageUrl(item.productSnapshot.imageUrl ?? "", 300)} alt="" className="h-16 w-16 rounded-[12px] bg-slate-50 object-contain p-1" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-semibold">{item.productSnapshot.title ?? "Product"}</p>
                {itemLabel(item) ? <p className="mt-1 text-xs font-semibold text-slate-500">{itemLabel(item)}</p> : null}
                <p className="mt-1 text-xs font-semibold text-slate-500">Qty {item.quantity}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">MRP</span>
            <span className="line-through">{formatCatalogPrice(mrpTotal)}</span>
          </div>
          <div className="flex justify-between font-semibold text-lime-900">
            <span>Team price</span>
            <span>{formatCatalogPrice(payable)}</span>
          </div>
          <div className="flex justify-between font-semibold text-rose-700">
            <span>You save</span>
            <span>{formatCatalogPrice(Math.max(0, mrpTotal - payable))}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Room</span>
            <span>{unlock.currentCount} / {unlock.threshold}</span>
          </div>
        </div>
      </aside>
    </section>
  );
}
