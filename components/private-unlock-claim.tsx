"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, ExternalLink, ShieldCheck } from "lucide-react";
import { GroupDeal, PrivateUnlock, PrivateUnlockDealConfig } from "@/lib/types";

type PrivateUnlockClaimProps = {
  unlock: PrivateUnlock;
  deal: GroupDeal;
  config?: PrivateUnlockDealConfig | null;
};

function formatPrice(price: number) {
  return `₹${price.toLocaleString("en-IN")}`;
}

function discountPrice(originalPrice: number, discountPercent: number) {
  return Math.round(originalPrice * (1 - discountPercent / 100));
}

export function PrivateUnlockClaim({ unlock, deal, config = null }: PrivateUnlockClaimProps) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp" | "coupon">("phone");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [coupon, setCoupon] = useState<{ code: string; discountPercent: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const unlockedPrice = discountPrice(deal.originalPrice, unlock.discountPercent);
  const finalPayable = Math.max(0, unlockedPrice - (config?.tokenAmount ?? 99));

  async function sendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose: "coupon_unlock" }),
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
      const response = await fetch("/api/private-unlocks/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: unlock.shareCode, phone, otp }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not unlock coupon.");
      }

      setCoupon(payload.coupon);
      setStep("coupon");
    } catch (unlockError) {
      setError(unlockError instanceof Error ? unlockError.message : "Could not unlock coupon.");
    } finally {
      setPending(false);
    }
  }

  async function copyCoupon() {
    if (!coupon?.code) {
      return;
    }

    await navigator.clipboard.writeText(coupon.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <main className="min-h-screen bg-[#f8faf8] px-4 py-10">
      <div className="mx-auto max-w-xl rounded-[8px] border border-slate-200 bg-white p-6 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          {step === "coupon" ? <CheckCircle2 className="h-8 w-8" /> : <ShieldCheck className="h-8 w-8" />}
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
          {step === "coupon" ? "Private coupon unlocked" : "Verify your private unlock"}
        </h1>
        <p className="mt-3 text-slate-600">
          {step === "coupon"
            ? "Use this code on the brand site to complete your purchase."
            : `Enter the mobile number used to join this ${deal.title} unlock.`}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-[8px] bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-500">Unlocked price</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{formatPrice(unlockedPrice)}</p>
          </div>
          <div className="rounded-[8px] bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-700">Final payable</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-950">{formatPrice(finalPayable)}</p>
          </div>
        </div>

        {unlock.currentCount < unlock.threshold ? (
          <div className="mt-6 rounded-[8px] bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            {unlock.threshold - unlock.currentCount} more joiner{unlock.threshold - unlock.currentCount === 1 ? "" : "s"} needed before coupon reveal.
          </div>
        ) : null}

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
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className="mt-1 h-11 w-full rounded-[8px] border border-slate-200 px-3 text-center text-lg font-semibold tracking-[0.3em] outline-none transition focus:border-emerald-500"
                placeholder="123456"
              />
            </label>
            {error ? <p className="rounded-[8px] bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p> : null}
            <button disabled={pending} className="h-12 w-full rounded-[8px] bg-slate-950 px-5 text-sm font-semibold text-white disabled:bg-slate-400">
              {pending ? "Checking..." : "Reveal coupon"}
            </button>
          </form>
        ) : null}

        {step === "coupon" && coupon ? (
          <div className="mt-6">
            <div className="rounded-[8px] border border-dashed border-emerald-300 bg-emerald-50 p-5">
              <p className="text-sm font-medium text-emerald-700">{coupon.discountPercent}% coupon code</p>
              <p className="mt-2 font-mono text-3xl font-semibold tracking-[0.18em] text-emerald-950">{coupon.code}</p>
              <button onClick={copyCoupon} className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-[8px] bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                <Copy className="h-4 w-4" />
                {copied ? "Copied" : "Copy code"}
              </button>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a href="https://antinorm.co" className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[8px] bg-emerald-600 px-5 py-3 text-sm font-semibold text-white">
                Complete purchase on brand site
                <ExternalLink className="h-4 w-4" />
              </a>
              <Link href={`/unlock/${unlock.shareCode}`} className="inline-flex min-h-12 flex-1 items-center justify-center rounded-[8px] border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-950">
                Back to unlock
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
