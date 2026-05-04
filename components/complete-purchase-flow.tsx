"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, ExternalLink, ShieldCheck } from "lucide-react";
import { DealCoupon, GroupDeal, Reservation } from "@/lib/types";

type CompletePurchaseFlowProps = {
  dealId: string;
  initialDeal: GroupDeal;
};

type UnlockState = {
  deal: GroupDeal;
  reservation: Reservation;
  coupon: DealCoupon;
};

function formatPrice(price: number) {
  return `₹${price.toLocaleString("en-IN")}`;
}

function joinedStorageKey(dealId: string) {
  return `grupin-joined-${dealId}`;
}

function joinedPhoneStorageKey(dealId: string) {
  return `grupin-joined-phone-${dealId}`;
}

export function CompletePurchaseFlow({ dealId, initialDeal }: CompletePurchaseFlowProps) {
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp" | "coupon">("phone");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [unlock, setUnlock] = useState<UnlockState | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.history.pushState({ grupinCompletePurchase: true }, "", window.location.href);

    function handleBrowserBack() {
      window.location.href = `/deal/${dealId}?return=complete-purchase`;
    }

    window.addEventListener("popstate", handleBrowserBack);

    return () => {
      window.removeEventListener("popstate", handleBrowserBack);
    };
  }, [dealId]);

  async function sendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      window.localStorage.setItem(joinedPhoneStorageKey(dealId), phone.trim());
      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId, phone, purpose: "coupon_unlock" }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not send OTP.");
      }

      setDemoOtp(payload.demoOtp ?? "");
      setStep("otp");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not send OTP.");
    } finally {
      setPending(false);
    }
  }

  async function unlockCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/coupon/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId, phone, code: otpCode }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not unlock coupon.");
      }

      setUnlock(payload);
      window.localStorage.setItem(joinedStorageKey(dealId), "true");
      window.localStorage.setItem(joinedPhoneStorageKey(dealId), phone.trim());
      if (payload.deal?.id) {
        window.localStorage.setItem(joinedStorageKey(payload.deal.id), "true");
        window.localStorage.setItem(joinedPhoneStorageKey(payload.deal.id), phone.trim());
      }
      setStep("coupon");
    } catch (unlockError) {
      setError(unlockError instanceof Error ? unlockError.message : "Could not unlock coupon.");
    } finally {
      setPending(false);
    }
  }

  const deal = unlock?.deal ?? initialDeal;
  const unlockedTier = [...deal.tiers].reverse().find((tier) => deal.currentCount >= tier.threshold);
  const unlockedPrice = unlockedTier?.price ?? deal.originalPrice;

  async function copyCoupon() {
    if (!unlock?.coupon.couponCode) {
      return;
    }

    await navigator.clipboard.writeText(unlock.coupon.couponCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className="bg-[#f8faf8] px-4 py-16">
      <div className="mx-auto max-w-xl rounded-[8px] border border-slate-200 bg-white p-6 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          {step === "coupon" ? <CheckCircle2 className="h-8 w-8" /> : <ShieldCheck className="h-8 w-8" />}
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
          {step === "coupon" ? "Coupon unlocked" : "Verify your phone"}
        </h1>
        <p className="mt-3 text-slate-600">
          {step === "coupon"
            ? "Use this code on the brand site to complete your purchase at the unlocked price."
            : "Enter the same mobile number used while joining the unlock. We will verify it before showing your coupon."}
        </p>

        <div className="mt-6 rounded-[8px] bg-emerald-50 p-5">
          <p className="text-sm font-medium text-emerald-700">Unlocked price</p>
          <p className="mt-1 text-4xl font-semibold text-emerald-950">{formatPrice(unlockedPrice)}</p>
        </div>

        {step === "phone" ? (
          <form onSubmit={sendOtp} className="mt-6 space-y-4 text-left">
            <label className="block text-sm font-medium text-slate-700">
              Registered mobile number
              <input
                required
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="mt-1 h-11 w-full rounded-[8px] border border-slate-200 px-3 outline-none transition focus:border-emerald-500"
                placeholder="+91 98765 43210"
              />
            </label>
            {error ? <p className="rounded-[8px] bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p> : null}
            <button disabled={pending} className="flex h-12 w-full items-center justify-center rounded-[8px] bg-slate-950 px-5 text-sm font-semibold text-white disabled:bg-slate-400">
              {pending ? "Sending SMS OTP..." : "Send SMS OTP"}
            </button>
          </form>
        ) : null}

        {step === "otp" ? (
          <form onSubmit={unlockCoupon} className="mt-6 space-y-4 text-left">
            <div className="rounded-[8px] bg-emerald-50 p-4 text-sm text-emerald-900">
              SMS OTP sent to {phone}.
              {demoOtp ? <span className="mt-2 block font-semibold">Demo OTP: {demoOtp}</span> : null}
            </div>
            <label className="block text-sm font-medium text-slate-700">
              Enter OTP
              <input
                required
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className="mt-1 h-11 w-full rounded-[8px] border border-slate-200 px-3 text-center text-lg font-semibold tracking-[0.3em] outline-none transition focus:border-emerald-500"
                placeholder="123456"
              />
            </label>
            {error ? <p className="rounded-[8px] bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p> : null}
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep("phone")} className="h-12 flex-1 rounded-[8px] border border-slate-200 px-5 text-sm font-semibold text-slate-700">
                Edit phone
              </button>
              <button disabled={pending} className="h-12 flex-1 rounded-[8px] bg-slate-950 px-5 text-sm font-semibold text-white disabled:bg-slate-400">
                {pending ? "Checking..." : "Unlock code"}
              </button>
            </div>
          </form>
        ) : null}

        {step === "coupon" && unlock ? (
          <div className="mt-6">
            <div className="rounded-[8px] border border-dashed border-emerald-300 bg-emerald-50 p-5">
              <p className="text-sm font-medium text-emerald-700">Coupon code</p>
              <p className="mt-2 font-mono text-3xl font-semibold tracking-[0.18em] text-emerald-950">{unlock.coupon.couponCode}</p>
              <p className="mt-2 text-sm text-emerald-800">Tier {unlock.coupon.tierNumber} unlocked at {unlock.coupon.threshold} buyers.</p>
              <button
                type="button"
                onClick={copyCoupon}
                className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-[8px] bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <Copy className="h-4 w-4 text-white" />
                <span className="text-white">{copied ? "Copied" : "Copy code"}</span>
              </button>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href="https://antinorm.co"
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[8px] bg-emerald-600 px-5 py-3 text-center text-sm font-semibold leading-5 text-white transition hover:bg-emerald-700"
              >
                <span className="text-white">Complete purchase on brand site</span>
                <ExternalLink className="h-4 w-4 shrink-0 text-white" />
              </a>
              <Link
                href={`/deal/${dealId}?return=complete-purchase`}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-[8px] border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold leading-5 text-slate-950 transition hover:bg-slate-50"
              >
                Back to deal
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
