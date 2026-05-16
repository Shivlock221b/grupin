"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";

export function AccountLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/account/coupons";
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function sendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/account/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
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

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/account/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otp }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not login.");
      }

      router.push(next);
      router.refresh();
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Could not login.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-[8px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
        <ShieldCheck className="h-8 w-8" />
      </div>
      <h1 className="mt-5 text-center text-3xl font-semibold tracking-tight text-slate-950">Login with phone</h1>
      <p className="mt-2 text-center text-sm text-slate-500">View unlocked coupons and pay the remaining amount when a room unlocks.</p>

      {step === "phone" ? (
        <form onSubmit={sendOtp} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Mobile number
            <input value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 h-11 w-full rounded-[8px] border border-slate-200 px-3 outline-none focus:border-emerald-500" />
          </label>
          {error ? <p className="rounded-[8px] bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
          <button disabled={pending} className="h-12 w-full rounded-[8px] bg-slate-950 px-5 text-sm font-semibold text-white disabled:bg-slate-400">
            {pending ? "Sending..." : "Send OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-6 space-y-4">
          <div className="rounded-[8px] bg-emerald-50 p-4 text-sm text-emerald-900">
            OTP sent to {phone}.
            {demoOtp ? <span className="mt-2 block font-semibold">Demo OTP: {demoOtp}</span> : null}
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Enter OTP
            <input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} className="mt-1 h-11 w-full rounded-[8px] border border-slate-200 px-3 text-center text-lg font-semibold tracking-[0.3em] outline-none focus:border-emerald-500" />
          </label>
          {error ? <p className="rounded-[8px] bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
          <button disabled={pending} className="h-12 w-full rounded-[8px] bg-slate-950 px-5 text-sm font-semibold text-white disabled:bg-slate-400">
            {pending ? "Verifying..." : "Login"}
          </button>
        </form>
      )}
    </div>
  );
}
