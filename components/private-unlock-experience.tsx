"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, Clock, Copy, FileText, Flame, LockKeyhole, Share2, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import { GroupDeal, PrivateUnlock, PrivateUnlockDealConfig, PrivateUnlockMember } from "@/lib/types";
import { isWellFormattedEmail } from "@/lib/validation";
import { AccountMenu } from "@/components/account-menu";

type RazorpayResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature?: string;
};

type RazorpayCheckout = {
  open: () => void;
  on?: (event: string, handler: (response: unknown) => void) => void;
};

type PrivateUnlockExperienceProps = {
  deal: GroupDeal;
  config?: PrivateUnlockDealConfig | null;
  initialUnlock?: PrivateUnlock | null;
  initialMembers?: PrivateUnlockMember[];
  initiallyJoined?: boolean;
};

function formatPrice(price: number) {
  return `₹${price.toLocaleString("en-IN")}`;
}

function discountPrice(originalPrice: number, discountPercent: number) {
  return Math.round(originalPrice * (1 - discountPercent / 100));
}

function timeAgo(date: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);
  return `${hours} hr${hours === 1 ? "" : "s"} ago`;
}

function formatTimeLeft(expiresAt: string, now: number | null) {
  if (now === null) {
    return "Calculating...";
  }

  const remaining = Math.max(0, new Date(expiresAt).getTime() - now);
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);

  return [hours, minutes, seconds].map((unit) => String(unit).padStart(2, "0")).join(":");
}

function validateForm(form: { name: string; phone: string; email: string }) {
  if (!/^[0-9+\-\s()]{8,}$/.test(form.phone.trim())) {
    return "Enter a valid phone number.";
  }

  if (form.email.trim() && !isWellFormattedEmail(form.email)) {
    return "Enter a valid email address or leave it blank.";
  }

  return "";
}

function splitVoucherText(value?: string | null) {
  return String(value ?? "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function VoucherInfoDropdown({ title, items, defaultOpen = false }: { title: string; items: string[]; defaultOpen?: boolean }) {
  if (!items.length) {
    return null;
  }

  return (
    <details open={defaultOpen} className="group rounded-[8px] border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <span className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-950">
          <FileText className="h-4 w-4 shrink-0 text-cyan-700" />
          {title}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
      </summary>
      <div className="max-h-72 overflow-y-auto border-t border-slate-100 px-4 py-3">
        <ol className="space-y-2 text-sm leading-6 text-slate-600">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="flex gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-xs font-semibold text-cyan-700">{index + 1}</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      </div>
    </details>
  );
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

function shareStorageKey(code: string) {
  return `grupin-private-unlock-${code}`;
}

export function PrivateUnlockExperience({ deal, config = null, initialUnlock = null, initialMembers = [], initiallyJoined = false }: PrivateUnlockExperienceProps) {
  const [unlock, setUnlock] = useState(initialUnlock);
  const [members, setMembers] = useState(initialMembers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [modalStep, setModalStep] = useState<"details" | "otp">("details");
  const [otpCode, setOtpCode] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [formError, setFormError] = useState("");
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [joinedMessage, setJoinedMessage] = useState(initiallyJoined ? "You have already joined this private unlock." : "");
  const [hasJoined, setHasJoined] = useState(initiallyJoined);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  const tokenAmount = config?.tokenAmount ?? 99;
  const threshold = unlock?.threshold ?? config?.threshold ?? 3;
  const discountPercent = unlock?.discountPercent ?? config?.discountPercent ?? 20;
  const currentCount = unlock?.currentCount ?? members.length;
  const remaining = Math.max(0, threshold - currentCount);
  const progress = Math.min(100, Math.round((currentCount / threshold) * 100));
  const isUnlocked = currentCount >= threshold;
  const isExpired = unlock && now !== null ? new Date(unlock.expiresAt).getTime() <= now : false;
  const isOutOfStock = Boolean(config?.isOutOfStock && !hasJoined);
  const unlockedPrice = discountPrice(deal.originalPrice, discountPercent);
  const finalPayable = Math.max(0, unlockedPrice - tokenAmount);
  const heroImage = config?.bannerImage || config?.cardImage || "";
  const brandName = config?.brandName || deal.title;
  const voucherCredit = config?.voucherValue ?? deal.originalPrice;
  const couponsLeft = config ? Math.max(0, config.couponStockTotal - config.couponStockClaimed) : null;
  const howToUseItems = splitVoucherText(config?.howToUse);
  const termsItems = splitVoucherText(config?.termsAndConditions);
  const timeLeftLabel = unlock ? formatTimeLeft(unlock.expiresAt, now) : "";
  const shareUrl = useMemo(() => {
    if (!unlock || typeof window === "undefined") {
      return "";
    }

    return `${window.location.origin}/unlock/${unlock.shareCode}`;
  }, [unlock]);

  useEffect(() => {
    if (!unlock) {
      setNow(null);
      return;
    }

    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [unlock]);

  useEffect(() => {
    async function loadProfile() {
      if (initialUnlock) {
        const storedPhone = window.localStorage.getItem(shareStorageKey(initialUnlock.shareCode));

        if (storedPhone) {
          setHasJoined(true);
          setJoinedMessage("You have already joined this private unlock.");
        }
      }

      const response = await fetch("/api/account/profile", { cache: "no-store" });

      if (!response.ok) {
        return;
      }

      const payload = await response.json();

      if (payload.profile) {
        setIsLoggedIn(true);
        setForm({
          name: payload.profile.fullName ?? "",
          phone: payload.profile.phone ?? "",
          email: payload.profile.email ?? "",
        });

        const params = initialUnlock
          ? new URLSearchParams({ code: initialUnlock.shareCode, phone: payload.profile.phone })
          : new URLSearchParams({ dealId: deal.id, phone: payload.profile.phone });
        const joinedResponse = await fetch(`/api/private-unlocks?${params.toString()}`, { cache: "no-store" });

        if (!joinedResponse.ok) {
          return;
        }

        const joinedPayload = await joinedResponse.json();

        if (joinedPayload.joined && joinedPayload.unlock) {
          setUnlock(joinedPayload.unlock);
          setMembers(joinedPayload.members ?? []);
          setHasJoined(true);
          setJoinedMessage("You have already joined this private unlock.");
          window.localStorage.setItem(shareStorageKey(joinedPayload.unlock.shareCode), payload.profile.phone);
        }
      }
    }

    void loadProfile();
  }, [deal.id, initialUnlock, initiallyJoined]);

  async function copyShareLink() {
    if (!shareUrl) {
      return;
    }

    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function shareUnlock() {
    if (!shareUrl) {
      return;
    }

    if (navigator.share) {
      await navigator.share({
        title: `${deal.title} private unlock`,
        text: `Join my GruPin unlock for ${discountPercent}% off ${deal.title}.`,
        url: shareUrl,
      });
      return;
    }

    await copyShareLink();
  }

  async function startPayment(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setIsPaying(true);

    try {
      const params = new URLSearchParams({ phone: form.phone });

      if (unlock) {
        params.set("code", unlock.shareCode);
      } else {
        params.set("dealId", deal.id);
      }

      const joinedResponse = await fetch(`/api/private-unlocks?${params.toString()}`, { cache: "no-store" });
      const joinedPayload = await joinedResponse.json();

      if (!joinedResponse.ok) {
        throw new Error(joinedPayload.message ?? "Could not check this unlock.");
      }

      if (joinedPayload.joined) {
        if (joinedPayload.unlock?.shareCode) {
          window.localStorage.setItem(shareStorageKey(joinedPayload.unlock.shareCode), form.phone.trim());
        }

        setJoinedMessage("You have already joined this private unlock.");
        setHasJoined(true);
        setIsModalOpen(false);
        setIsPaying(false);

        if (!unlock && joinedPayload.unlock?.shareCode) {
          window.location.href = `/unlock/${joinedPayload.unlock.shareCode}`;
        }

        return;
      }

      const orderResponse = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId: deal.id, privateUnlock: true, phone: form.phone }),
      });
      const order = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(order.message ?? "Could not create payment order.");
      }

      if (order.demoMode) {
        await confirmJoin({
          razorpay_payment_id: `pay_private_demo_${Date.now()}`,
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
        description: `Private unlock for ${deal.title}`,
        order_id: order.orderId,
        prefill: {
          name: form.name,
          email: form.email,
          contact: form.phone,
        },
        theme: {
          color: "#163126",
        },
        handler: async (response: RazorpayResponse) => {
          await confirmJoin(response);
        },
        modal: {
          ondismiss: () => setIsPaying(false),
        },
      });

      (checkout as RazorpayCheckout).on?.("payment.failed", () => {
        setFormError("Payment failed. Your spot was not locked. Please try again.");
        setIsPaying(false);
      });

      checkout.open();
    } catch (paymentError) {
      setFormError(paymentError instanceof Error ? paymentError.message : "Payment could not be started.");
      setIsPaying(false);
    }
  }

  async function handleDetailsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateForm(form);
    setFormError(error);

    if (error) {
      return;
    }

    setIsPaying(true);

    try {
      const otpResponse = await fetch("/api/account/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phone }),
      });
      const otpPayload = await otpResponse.json();

      if (!otpResponse.ok) {
        throw new Error(otpPayload.message ?? "Could not send OTP.");
      }

      setDemoOtp(otpPayload.demoOtp ?? "");
      setOtpCode("");
      setModalStep("otp");
      setIsPaying(false);
    } catch (paymentError) {
      setFormError(paymentError instanceof Error ? paymentError.message : "Could not send OTP.");
      setIsPaying(false);
    }
  }

  async function handleOtpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!/^\d{6}$/.test(otpCode)) {
      setFormError("Enter the 6-digit OTP.");
      return;
    }

    setIsPaying(true);
    setFormError("");

    try {
      const response = await fetch("/api/account/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phone, code: otpCode, name: form.name, email: form.email }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not verify OTP.");
      }

      setIsLoggedIn(true);
      await startPayment();
    } catch (otpError) {
      setFormError(otpError instanceof Error ? otpError.message : "Could not verify OTP.");
      setIsPaying(false);
    }
  }

  async function confirmJoin(payment: RazorpayResponse) {
    try {
      const response = await fetch("/api/private-unlocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: deal.id,
          code: unlock?.shareCode,
          name: form.name,
          phone: form.phone,
          email: form.email,
          razorpayPaymentId: payment.razorpay_payment_id,
          razorpayOrderId: payment.razorpay_order_id,
          razorpaySignature: payment.razorpay_signature,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not join this unlock.");
      }

      setUnlock(payload.unlock);
      setMembers(payload.members ?? []);
      setHasJoined(true);
      setJoinedMessage(payload.unlocked ? "You helped unlock the coupon." : "Your spot is locked. Share this link to speed up the unlock.");
      window.localStorage.setItem(shareStorageKey(payload.unlock.shareCode), form.phone.trim());
      setIsModalOpen(false);

      if (!unlock && payload.unlock?.shareCode) {
        window.location.href = `/unlock/${payload.unlock.shareCode}`;
      }
    } catch (joinError) {
      const message = joinError instanceof Error ? joinError.message : "Could not join this unlock.";

      if (message.toLowerCase().includes("already joined") && unlock) {
        window.localStorage.setItem(shareStorageKey(unlock.shareCode), form.phone.trim());
        setHasJoined(true);
        setJoinedMessage("You have already joined this private unlock.");
        setIsModalOpen(false);
      } else {
        setFormError(message);
      }
    } finally {
      setIsPaying(false);
    }
  }

  async function handleUnlockClick() {
    setFormError("");

    if (isOutOfStock) {
      setFormError("This voucher is out of stock.");
      return;
    }

    if (isLoggedIn) {
      await startPayment();
      return;
    }

    setModalStep("details");
    setIsModalOpen(true);
  }

  return (
    <main className="min-h-screen bg-[#f3faf7] pb-28 text-slate-950 md:pb-0">
      <div className="sticky top-0 z-40 border-b border-emerald-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/unlock-deals" className="text-xl font-semibold tracking-tight text-emerald-950">
            GruPin
          </Link>
          <AccountMenu />
        </div>
      </div>
      <section className="mx-auto grid max-w-6xl items-start gap-6 px-4 py-6 lg:grid-cols-[1.08fr_0.92fr] lg:py-10">
        <div className="relative min-h-[580px] self-start overflow-hidden rounded-[8px] bg-slate-950 text-white shadow-[0_24px_80px_rgba(120,53,15,0.22)]">
          {heroImage ? (
            <>
              <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30 blur-2xl scale-110" />
              <div className="absolute inset-4 rounded-[8px] bg-white/8 ring-1 ring-white/10 sm:inset-8" />
              <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-contain p-8 sm:p-12" />
            </>
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/86 via-slate-950/28 to-slate-950/5" />
          <div className="relative flex h-full min-h-[580px] flex-col justify-between p-5 sm:p-8">
            <div className="flex items-start justify-between gap-3">
              <div className="rounded-full bg-cyan-300 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-950">
                Voucher room
              </div>
            </div>

            <div className="max-w-xl">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-100">{brandName}</p>
              <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
                Unlock a {formatPrice(voucherCredit)} voucher together.
              </h1>
              <p className="mt-4 max-w-lg text-base text-white/80">
                Start with {formatPrice(tokenAmount)}, invite your circle, and claim the reward when {threshold} people join.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <div className="rounded-[8px] bg-white/12 px-3 py-2 ring-1 ring-white/15">
                  <p className="text-xs font-semibold text-white/60">Unlock price</p>
                  <p className="font-semibold">{formatPrice(unlockedPrice)}</p>
                </div>
                <div className="rounded-[8px] bg-rose-500 px-3 py-2 text-white">
                  <p className="text-xs font-semibold text-white/75">Reward</p>
                  <p className="font-semibold">{discountPercent}% off</p>
                </div>
                {couponsLeft !== null ? (
                  <div className="rounded-[8px] bg-amber-300 px-3 py-2 text-amber-950">
                    <p className="text-xs font-semibold text-amber-900/75">Coupons left</p>
                    <p className="font-semibold">{couponsLeft}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[8px] border border-emerald-100 bg-white p-5 shadow-[0_18px_50px_rgba(15,118,110,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-500">Voucher credit</p>
                <p className="mt-1 text-3xl font-semibold">{formatPrice(voucherCredit)}</p>
              </div>
              <div className="rounded-[8px] bg-amber-50 px-4 py-3 text-right">
                <p className="text-sm font-semibold text-rose-700">{discountPercent}% unlock</p>
                <p className="text-2xl font-semibold text-slate-950">{formatPrice(unlockedPrice)}</p>
                <p className="mt-1 text-xs font-semibold text-amber-800">{formatPrice(finalPayable)} after token</p>
              </div>
            </div>

            {unlock && !isUnlocked ? (
              <div className={`mt-4 flex items-center justify-between gap-3 rounded-[8px] p-4 ${isExpired && !isUnlocked ? "bg-rose-50 text-rose-800" : "bg-cyan-50 text-cyan-900"}`}>
                <div className="flex min-w-0 items-center gap-3">
                  <Clock className="h-5 w-5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{isExpired && !isUnlocked ? "Private unlock expired" : "Private unlock window"}</p>
                    <p className="text-xs font-medium opacity-75">Your 48-hour room timer starts after the first paid join.</p>
                  </div>
                </div>
                <p className="shrink-0 font-mono text-lg font-bold tracking-normal">{isExpired && !isUnlocked ? "00:00:00" : timeLeftLabel}</p>
              </div>
            ) : null}

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-sm font-semibold">
                <span>Room {currentCount} / {threshold} filled</span>
                <span>{isUnlocked ? "Reward unlocked" : `${remaining} friends away`}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-cyan-100">
                <div className="h-full rounded-full bg-rose-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              {["Start", "Share", "Unlock"].map((label, index) => (
                <div key={label} className={`rounded-[8px] border p-3 ${currentCount > index ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white"}`}>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
                  <p className="mt-1 text-lg font-semibold">{index + 1}</p>
                </div>
              ))}
            </div>

            {couponsLeft !== null ? (
              <div className="mt-4 rounded-[8px] bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                Only {couponsLeft} coupon{couponsLeft === 1 ? "" : "s"} left for this deal.
              </div>
            ) : null}

            {unlock ? (
              <div className="mt-6 rounded-[8px] bg-slate-950 p-4 text-white">
                <p className="text-sm font-semibold text-white/70">Your share link</p>
                <div className="mt-3 flex gap-2">
                  <input readOnly value={shareUrl} className="min-w-0 flex-1 rounded-[8px] border border-white/15 bg-white/10 px-3 text-sm text-white outline-none" />
                  <button onClick={copyShareLink} className="grid h-11 w-11 place-items-center rounded-[8px] bg-white text-slate-950" aria-label="Copy share link">
                    <Copy className="h-4 w-4" />
                  </button>
                  <button onClick={shareUnlock} className="grid h-11 w-11 place-items-center rounded-[8px] bg-emerald-400 text-emerald-950" aria-label="Share unlock">
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 text-xs font-medium text-white/60">{copied ? "Copied" : "Invite friends to fill the room."}</p>
              </div>
            ) : null}

            {isOutOfStock ? (
              <div className="mt-4 rounded-[8px] bg-slate-100 p-3 text-sm font-semibold text-slate-700">
                Out of stock. This voucher is not taking new unlock requests right now.
              </div>
            ) : null}

            {isExpired && !isUnlocked ? (
              <div className="mt-4 rounded-[8px] bg-rose-50 p-3 text-sm font-semibold text-rose-700">
                This private unlock window has expired.
              </div>
            ) : null}

            {joinedMessage ? (
              <div className="mt-4 rounded-[8px] bg-cyan-50 p-3 text-sm font-semibold text-cyan-900">{joinedMessage}</div>
            ) : null}

            {formError && !isModalOpen ? (
              <div className="mt-4 rounded-[8px] bg-rose-50 p-3 text-sm font-semibold text-rose-700">{formError}</div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {!hasJoined ? (
                <button
                  onClick={handleUnlockClick}
                  disabled={isExpired || isOutOfStock || isPaying}
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[8px] bg-rose-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-600"
                >
                  <LockKeyhole className="h-4 w-4" />
                  {isExpired ? "Room expired" : isOutOfStock ? "Out of stock" : isPaying ? "Opening payment..." : unlock ? "Join this room" : `Start room for ${formatPrice(tokenAmount)}`}
                </button>
              ) : unlock ? (
                <button
                  onClick={shareUnlock}
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[8px] bg-rose-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-600"
                >
                  <Share2 className="h-4 w-4" />
                  Share room
                </button>
              ) : null}
              {unlock ? (
                <Link href="/account/coupons" className="inline-flex min-h-12 flex-1 items-center justify-center rounded-[8px] border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-950">
                  View voucher coupons
                </Link>
              ) : null}
            </div>
          </div>

          {(howToUseItems.length || termsItems.length) ? (
            <div className="space-y-3 rounded-[8px] border border-emerald-100 bg-white p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">Voucher details</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">How redemption works</h2>
              </div>
              <VoucherInfoDropdown title="How to use" items={howToUseItems} />
              <VoucherInfoDropdown title="Terms & Conditions" items={termsItems} />
            </div>
          ) : null}

          <div className="rounded-[8px] border border-emerald-100 bg-white p-5">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-rose-500" />
              <h2 className="text-lg font-semibold">Room activity</h2>
            </div>
            <div className="mt-4 space-y-3">
              {members.length ? members.slice(0, 6).map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <p className="font-medium text-slate-700">{member.name.split(" ")[0]} joined</p>
                  <span className="text-xs text-slate-400">{timeAgo(member.createdAt)}</span>
                </div>
              )) : (
                <p className="text-sm text-slate-500">No one has joined this private unlock yet.</p>
              )}
            </div>
          </div>

            <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[8px] border border-slate-200 bg-white p-4">
              <Sparkles className="h-5 w-5 text-rose-500" />
              <p className="mt-3 text-sm font-semibold">One room</p>
              <p className="mt-1 text-xs text-slate-500">Every share link has its own counter.</p>
            </div>
            <div className="rounded-[8px] border border-slate-200 bg-white p-4">
              <Flame className="h-5 w-5 text-orange-500" />
              <p className="mt-3 text-sm font-semibold">One target</p>
              <p className="mt-1 text-xs text-slate-500">{threshold} paid joins unlock the code.</p>
            </div>
            <div className="rounded-[8px] border border-slate-200 bg-white p-4">
              <ShieldCheck className="h-5 w-5 text-cyan-600" />
              <p className="mt-3 text-sm font-semibold">48-hour room</p>
              <p className="mt-1 text-xs text-slate-500">The timer starts only after someone joins.</p>
            </div>
          </div>
        </div>
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[8px] bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold">Lock your spot</h2>
                <p className="mt-1 text-sm text-slate-500">Verify your phone, then pay {formatPrice(tokenAmount)}. Voucher delivery can happen on your phone.</p>
                {isLoggedIn ? <p className="mt-2 text-xs font-semibold text-emerald-700">Using your logged-in GruPin profile.</p> : null}
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalStep === "details" ? (
              <form onSubmit={handleDetailsSubmit}>
                <div className="mt-5 space-y-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Name <span className="text-slate-400">(optional)</span>
                    <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="mt-1 h-11 w-full rounded-[8px] border border-slate-200 px-3 outline-none focus:border-emerald-500" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Phone
                    <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className="mt-1 h-11 w-full rounded-[8px] border border-slate-200 px-3 outline-none focus:border-emerald-500" />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Email <span className="text-slate-400">(optional)</span>
                    <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className="mt-1 h-11 w-full rounded-[8px] border border-slate-200 px-3 outline-none focus:border-emerald-500" />
                  </label>
                </div>

                {formError ? <p className="mt-4 rounded-[8px] bg-rose-50 p-3 text-sm font-semibold text-rose-700">{formError}</p> : null}

                <button disabled={isPaying} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-slate-950 px-5 text-sm font-semibold text-white disabled:bg-slate-400">
                  <ShieldCheck className="h-4 w-4" />
                  {isPaying ? "Sending OTP..." : "Verify phone"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleOtpSubmit} className="mt-5 space-y-4">
                <div className="rounded-[8px] bg-emerald-50 p-4 text-sm text-emerald-900">
                  SMS OTP sent to {form.phone}.
                  {demoOtp ? <span className="mt-2 block font-semibold">Demo OTP: {demoOtp}</span> : null}
                </div>
                <label className="block text-sm font-medium text-slate-700">
                  Enter OTP
                  <input
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="mt-1 h-11 w-full rounded-[8px] border border-slate-200 px-3 text-center text-lg font-semibold tracking-[0.3em] outline-none focus:border-emerald-500"
                  />
                </label>
                {formError ? <p className="rounded-[8px] bg-rose-50 p-3 text-sm font-semibold text-rose-700">{formError}</p> : null}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setModalStep("details")} className="h-12 flex-1 rounded-[8px] border border-slate-200 px-5 text-sm font-semibold text-slate-700">
                    Edit
                  </button>
                  <button disabled={isPaying} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[8px] bg-slate-950 px-5 text-sm font-semibold text-white disabled:bg-slate-400">
                    <CheckCircle2 className="h-4 w-4" />
                    {isPaying ? "Opening..." : `Pay ${formatPrice(tokenAmount)}`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}

      {!hasJoined ? <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-16px_50px_rgba(15,23,42,0.12)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500">{currentCount} / {threshold} joined</p>
            <p className="truncate text-sm font-semibold text-slate-950">{isUnlocked ? `${discountPercent}% coupon unlocked` : `${remaining} more to unlock`}</p>
          </div>
          <button
            disabled={isExpired || isOutOfStock || isPaying}
            onClick={handleUnlockClick}
            className="h-11 rounded-[8px] bg-slate-950 px-4 text-sm font-semibold text-white disabled:bg-slate-400"
          >
            {isExpired ? "Expired" : isOutOfStock ? "Out of stock" : isPaying ? "Opening" : unlock ? "Join" : "Start"}
          </button>
        </div>
      </div> : null}
    </main>
  );
}
