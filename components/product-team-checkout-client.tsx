"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CreditCard } from "lucide-react";
import { BrandProduct, ProductTeamUnlock, ProductVariant, AccountProfile } from "@/lib/types";
import { productImageUrl } from "@/lib/product-images";
import { effectiveTeamDiscountPercent, formatCatalogPrice, teamPrice } from "@/lib/product-pricing";

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
  product: BrandProduct;
  unlock: ProductTeamUnlock;
  profile: AccountProfile | null;
};

function variantKey(variant: ProductVariant) {
  return String(variant.child_id ?? variant.sku ?? variant.title);
}

function variantLabel(variant: ProductVariant) {
  return variant.variant_name || variant.pack_size || variant.title;
}

function highestPricedVariant(product: BrandProduct) {
  return product.variants.reduce<ProductVariant | null>((highest, variant) => {
    if (variant.price === null || variant.price === undefined) return highest;
    if (!highest || highest.price === null || highest.price === undefined || variant.price > highest.price) return variant;
    return highest;
  }, null);
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

export function ProductTeamCheckoutClient({ code, product, unlock, profile }: ProductTeamCheckoutClientProps) {
  const router = useRouter();
  const defaultVariant = highestPricedVariant(product);
  const [selectedVariantKey, setSelectedVariantKey] = useState(defaultVariant ? variantKey(defaultVariant) : "");
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

  const selectedVariant = useMemo(
    () => product.variants.find((variant) => variantKey(variant) === selectedVariantKey) ?? defaultVariant,
    [defaultVariant, product.variants, selectedVariantKey],
  );
  const price = selectedVariant?.price ?? product.priceMax ?? product.priceMin;
  const payable = teamPrice(price, Math.max(unlock.discountPercent, effectiveTeamDiscountPercent(product)));
  const variantType = product.variantType === "shade" ? "shade" : product.variantType === "size" || product.variantType === "weight_configure" ? "size" : "variant";
  const hasVariants = product.variants.length > 1;

  async function confirmOrder(payment: RazorpayResponse) {
    const response = await fetch("/api/product-team-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        selectedVariantKey,
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
        body: JSON.stringify({ purpose: "product_team_order", code, selectedVariantKey }),
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
        description: `Team price order for ${product.title}`,
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
    <section className="mx-auto grid max-w-5xl gap-5 px-4 py-5 lg:grid-cols-[1fr_360px]">
      <form onSubmit={submitCheckout} className="rounded-[8px] border border-slate-200 bg-white p-5">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-700">Delivery details</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Complete your team-price order</h1>

        {hasVariants ? (
          <div className="mt-5">
            <p className="text-sm font-bold text-slate-950">Choose {variantType}</p>
            <div className={`mt-2 grid gap-2 ${variantType === "shade" ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-3 sm:grid-cols-4"}`}>
              {product.variants.map((variant) => {
                const key = variantKey(variant);
                const active = key === selectedVariantKey;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedVariantKey(key)}
                    className={`min-h-12 rounded-[8px] border px-2 py-2 text-left text-xs font-semibold transition ${active ? "border-cyan-600 bg-cyan-50 text-cyan-950" : "border-slate-200 bg-white text-slate-700 hover:border-cyan-300"}`}
                  >
                    {variantType === "shade" && variant.shade_image ? (
                      <span className="mb-1 block h-7 w-7 overflow-hidden rounded-full border border-slate-200 bg-white">
                        <img src={productImageUrl(variant.shade_image, 80)} alt="" className="h-full w-full object-cover" />
                      </span>
                    ) : null}
                    {variantLabel(variant)}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-5 grid gap-3">
          <input value={buyerName} onChange={(event) => setBuyerName(event.target.value)} required placeholder="Full name" className="h-12 rounded-[8px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-cyan-500" />
          <input value={buyerEmail} onChange={(event) => setBuyerEmail(event.target.value)} type="email" placeholder="Email" className="h-12 rounded-[8px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-cyan-500" />
          <input value={buyerPhone} onChange={(event) => setBuyerPhone(event.target.value)} required placeholder="Phone number" className="h-12 rounded-[8px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-cyan-500" />
          <textarea value={addressLine} onChange={(event) => setAddressLine(event.target.value)} required placeholder="Delivery address" rows={4} className="rounded-[8px] border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:border-cyan-500" />
          <div className="grid gap-3 sm:grid-cols-3">
            <input value={city} onChange={(event) => setCity(event.target.value)} required placeholder="City" className="h-12 rounded-[8px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-cyan-500" />
            <input value={stateName} onChange={(event) => setStateName(event.target.value)} required placeholder="State" className="h-12 rounded-[8px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-cyan-500" />
            <input value={pincode} onChange={(event) => setPincode(event.target.value)} required placeholder="Pincode" className="h-12 rounded-[8px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-cyan-500" />
          </div>
        </div>
        <div className="mt-5 rounded-[8px] bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          Your payment places this order on hold. If every member in this room completes payment, the order moves to confirmed. If the room does not complete, the amount will be refunded.
        </div>
        {error ? <p className="mt-4 rounded-[8px] bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
        {success ? (
          <p className="mt-4 inline-flex w-full items-center gap-2 rounded-[8px] bg-lime-50 px-3 py-2 text-sm font-semibold text-lime-900">
            <CheckCircle2 className="h-4 w-4" />
            {success}
          </p>
        ) : null}
        <button disabled={busy || !payable} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-rose-500 px-5 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-50">
          <CreditCard className="h-4 w-4" />
          {busy ? "Opening payment..." : `Pay ${formatCatalogPrice(payable)} and place order on hold`}
        </button>
      </form>

      <aside className="rounded-[8px] border border-slate-200 bg-white p-5">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-700">Order summary</p>
        <div className="mt-4 flex gap-3">
          <img src={productImageUrl(selectedVariant?.image_url ?? product.primaryImage ?? product.imageUrls[0], 300)} alt="" className="h-20 w-20 rounded-[8px] object-cover" />
          <div>
            <p className="font-semibold">{product.title}</p>
            {selectedVariant ? <p className="mt-1 text-sm font-semibold text-slate-500">{variantLabel(selectedVariant)}</p> : null}
          </div>
        </div>
        <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">MRP</span>
            <span className="line-through">{formatCatalogPrice(price)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Team price</span>
            <span>{formatCatalogPrice(payable)}</span>
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
