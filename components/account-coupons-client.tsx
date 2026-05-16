"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, CreditCard, Mail, ShoppingBag } from "lucide-react";
import { AccountUnlockRoom, AccountUnlockedCoupon } from "@/lib/types";

type RazorpayResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature?: string;
};

type RazorpayCheckout = {
  open: () => void;
  on?: (event: string, handler: () => void) => void;
};

type AccountCouponsClientProps = {
  coupons: AccountUnlockedCoupon[];
  rooms: AccountUnlockRoom[];
};

function formatRupees(paise: number) {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

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

export function AccountCouponsClient({ coupons: initialCoupons, rooms }: AccountCouponsClientProps) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [pendingId, setPendingId] = useState("");
  const [error, setError] = useState("");

  async function payRemaining(coupon: AccountUnlockedCoupon) {
    setPendingId(coupon.id);
    setError("");

    try {
      const orderResponse = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: "coupon_claim", unlockedCouponId: coupon.id }),
      });
      const order = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(order.message ?? "Could not create payment order.");
      }

      async function confirmClaim(payment: RazorpayResponse) {
        const response = await fetch("/api/account/coupon-claims", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            unlockedCouponId: coupon.id,
            razorpayPaymentId: payment.razorpay_payment_id,
            razorpayOrderId: payment.razorpay_order_id,
            razorpaySignature: payment.razorpay_signature,
          }),
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.message ?? "Could not confirm coupon payment.");
        }

        setCoupons((current) =>
          current.map((item) =>
            item.id === coupon.id
              ? { ...item, status: "claimed", emailDeliveryStatus: "pending" }
              : item
          )
        );
      }

      if (order.demoMode) {
        await confirmClaim({
          razorpay_payment_id: `pay_coupon_demo_${Date.now()}`,
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
        description: `Remaining payment for ${coupon.dealTitle}`,
        order_id: order.orderId,
        handler: async (response: RazorpayResponse) => {
          await confirmClaim(response);
        },
        theme: {
          color: "#163126",
        },
        modal: {
          ondismiss: () => setPendingId(""),
        },
      });

      (checkout as RazorpayCheckout).on?.("payment.failed", () => {
        setError("Payment failed. Please try again.");
        setPendingId("");
      });

      checkout.open();
    } catch (payError) {
      setError(payError instanceof Error ? payError.message : "Could not complete payment.");
    } finally {
      setPendingId("");
    }
  }

  return (
    <div>
      {error ? <p className="mb-4 rounded-[8px] bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
      {rooms.length ? (
        <section className="mb-6 rounded-[8px] border border-cyan-100 bg-white p-5 shadow-[0_14px_40px_rgba(15,118,110,0.06)]">
          <h2 className="text-xl font-semibold text-slate-950">Active unlock rooms</h2>
          <p className="mt-1 text-sm text-slate-500">Jump back into a room to check status or share the link again.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {rooms.map((room) => (
              <Link key={room.id} href={`/unlock/${room.shareCode}`} className="rounded-[8px] border border-slate-200 bg-slate-50 p-4 transition hover:border-cyan-300 hover:bg-cyan-50">
                <p className="text-sm font-semibold text-cyan-700">{room.brandName}</p>
                <p className="mt-1 font-semibold text-slate-950">{room.dealTitle}</p>
                <p className="mt-2 text-sm text-slate-500">{room.currentCount}/{room.threshold} joined</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {coupons.map((coupon) => (
          <div key={coupon.id} className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-500">{coupon.brandName || "Brand"}</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">{coupon.dealTitle}</h2>
              </div>
              <div className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">{coupon.discountPercent}% off</div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-[8px] bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500">Unlocked</p>
                <p className="mt-1 font-semibold">{formatRupees(coupon.unlockedPrice)}</p>
              </div>
              <div className="rounded-[8px] bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500">Token paid</p>
                <p className="mt-1 font-semibold">{formatRupees(coupon.tokenAmountPaid)}</p>
              </div>
              <div className="rounded-[8px] bg-emerald-50 p-3">
                <p className="text-xs font-semibold text-emerald-700">Remaining</p>
                <p className="mt-1 font-semibold text-emerald-950">{formatRupees(coupon.remainingAmount)}</p>
              </div>
            </div>

            {coupon.status === "claimed" ? (
              <div className="mt-5 rounded-[8px] bg-emerald-50 p-4">
                <div className="flex items-center gap-2 font-semibold text-emerald-800">
                  <Mail className="h-4 w-4" />
                  Coupon delivery by email/phone
                </div>
                <p className="mt-1 text-sm text-emerald-700">
                  Payment received. Your coupon code will reach your registered email/phone number within 30 minutes.
                </p>
              </div>
            ) : (
              <button
                onClick={() => payRemaining(coupon)}
                disabled={pendingId === coupon.id}
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-slate-950 px-5 text-sm font-semibold text-white disabled:bg-slate-400"
              >
                <CreditCard className="h-4 w-4" />
                {pendingId === coupon.id ? "Opening payment..." : `Pay ${formatRupees(coupon.remainingAmount)} to request code`}
              </button>
            )}
          </div>
        ))}
      </div>

      {!coupons.length ? (
        <div className="rounded-[8px] border border-dashed border-slate-300 bg-white p-10 text-center">
          <ShoppingBag className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-4 text-xl font-semibold text-slate-950">No unlocked coupons yet</h2>
          <p className="mt-2 text-sm text-slate-500">Join a private unlock and come back when your room reaches the target.</p>
          <Link href="/unlock-deals" className="mt-5 inline-flex h-11 items-center justify-center rounded-[8px] bg-rose-500 px-5 text-sm font-semibold text-white transition hover:bg-rose-600">
            Explore unlocks
          </Link>
        </div>
      ) : null}
    </div>
  );
}
