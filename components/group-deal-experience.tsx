"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock3,
  CreditCard,
  ExternalLink,
  Flame,
  LockKeyhole,
  ShoppingBag,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { GroupDeal, Reservation } from "@/lib/types";

type RazorpayResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature?: string;
};

type RazorpayCheckout = {
  open: () => void;
};

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayCheckout;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

type GroupDealExperienceProps = {
  initialDeal: GroupDeal;
  initialReservations: Reservation[];
};

type BuyerDetails = {
  name: string;
  phone: string;
  email: string;
};

type ModalStep = "details" | "otp";

const reservationAmount = 99;
const initialTimeLeft = { expired: false, label: "--:--:--" };

type DealRefreshPayload = {
  reservations?: Reservation[];
  deal?: GroupDeal;
  joined?: boolean;
};

function joinedStorageKey(dealId: string) {
  return `grupin-joined-${dealId}`;
}

function joinedPhoneStorageKey(dealId: string) {
  return `grupin-joined-phone-${dealId}`;
}

const productSlides = [
  {
    src: "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=1200&q=85",
    label: "Combo front view",
  },
  {
    src: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85",
    label: "Styled fit",
  },
  {
    src: "https://images.unsplash.com/photo-1506629905607-d405d7d3b0d2?auto=format&fit=crop&w=1200&q=85",
    label: "Fabric detail",
  },
];

function formatPrice(price: number) {
  return `₹${price.toLocaleString("en-IN")}`;
}

function getUnlockedTier(count: number, tiers: GroupDeal["tiers"]) {
  return [...tiers].reverse().find((tier) => count >= tier.threshold) ?? null;
}

function getNextTier(count: number, tiers: GroupDeal["tiers"]) {
  return tiers.find((tier) => count < tier.threshold) ?? null;
}

function getDiscountPercent(originalPrice: number, unlockedPrice: number) {
  return Math.round(((originalPrice - unlockedPrice) / originalPrice) * 100);
}

function getTimeLeft(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();

  if (diff <= 0) {
    return { expired: true, label: "00:00:00" };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    expired: false,
    label: [hours, minutes, seconds].map((item) => String(item).padStart(2, "0")).join(":"),
  };
}

function timeAgo(date: string) {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 1000));

  if (seconds < 60) {
    return "just now";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);
  return `${hours} hr${hours === 1 ? "" : "s"} ago`;
}

function friendlyActivityName(reservation: Reservation) {
  return reservation.name.split(" ")[0] || "Someone";
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

export function GroupDealExperience({ initialDeal, initialReservations }: GroupDealExperienceProps) {
  const [deal, setDeal] = useState(initialDeal);
  const [reservations, setReservations] = useState(initialReservations);
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>("details");
  const [form, setForm] = useState<BuyerDetails>({ name: "", phone: "", email: "" });
  const [otpCode, setOtpCode] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [formError, setFormError] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [lockedMessage, setLockedMessage] = useState("");
  const [unlockMessage, setUnlockMessage] = useState("");
  const [showDemoControls, setShowDemoControls] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [hasJoinedUnlock, setHasJoinedUnlock] = useState(false);

  const unlockedTier = useMemo(() => getUnlockedTier(deal.currentCount, deal.tiers), [deal]);
  const nextTier = useMemo(() => getNextTier(deal.currentCount, deal.tiers), [deal]);
  const unlockedPrice = unlockedTier?.price ?? deal.originalPrice;
  const finalPayable = Math.max(0, unlockedPrice - reservationAmount);
  const maxThreshold = deal.tiers[deal.tiers.length - 1].threshold;
  const progress = Math.min(100, Math.round((deal.currentCount / maxThreshold) * 100));
  const nextDiscount = nextTier ? getDiscountPercent(deal.originalPrice, nextTier.price) : getDiscountPercent(deal.originalPrice, unlockedPrice);
  const unlockedLevel = unlockedTier ? deal.tiers.findIndex((tier) => tier.threshold === unlockedTier.threshold) + 1 : 0;
  const nextLevel = nextTier ? deal.tiers.findIndex((tier) => tier.threshold === nextTier.threshold) + 1 : deal.tiers.length;
  const levelCopy = unlockedLevel > 0 ? `Level ${unlockedLevel} reward active` : "Level 1 reward locked";
  const latestReservation = reservations[0] ?? null;

  useEffect(() => {
    setShowDemoControls(new URLSearchParams(window.location.search).get("demo") === "1");
  }, []);

  useEffect(() => {
    function syncJoinedState() {
      setHasJoinedUnlock(window.localStorage.getItem(joinedStorageKey(deal.id)) === "true");
    }

    async function refreshDealSnapshot() {
      const storedPhone = window.localStorage.getItem(joinedPhoneStorageKey(deal.id));
      const params = new URLSearchParams({ dealId: deal.id });

      if (storedPhone) {
        params.set("phone", storedPhone);
      }

      try {
        const requestUrl = `/api/reservations?${params.toString()}`;
        console.log("[GruPin deal refresh] fetching snapshot", {
          dealId: deal.id,
          hasStoredPhone: Boolean(storedPhone),
          joinedFlag: window.localStorage.getItem(joinedStorageKey(deal.id)),
          url: requestUrl,
        });
        const response = await fetch(requestUrl, { cache: "no-store" });
        const payload = (await response.json()) as DealRefreshPayload;

        console.log("[GruPin deal refresh] response", {
          ok: response.ok,
          status: response.status,
          joined: payload.joined,
          reservations: payload.reservations?.length ?? 0,
          currentCount: payload.deal?.currentCount,
          expiresAt: payload.deal?.expiresAt,
        });

        if (!response.ok) {
          syncJoinedState();
          return;
        }

        if (Array.isArray(payload.reservations)) {
          setReservations(payload.reservations);
        }

        if (payload.deal) {
          setDeal(payload.deal);
          setTimeLeft(getTimeLeft(payload.deal.expiresAt));
        } else {
          setTimeLeft(getTimeLeft(deal.expiresAt));
        }

        if (payload.joined) {
          window.localStorage.setItem(joinedStorageKey(deal.id), "true");
          setHasJoinedUnlock(true);
        } else {
          syncJoinedState();
        }
      } catch {
        // The page can stay on the last known snapshot if the refresh misses.
        console.log("[GruPin deal refresh] failed to fetch snapshot", { dealId: deal.id });
        syncJoinedState();
      }
    }

    syncJoinedState();
    void refreshDealSnapshot();
    const timer = window.setInterval(syncJoinedState, 1000);
    window.addEventListener("pageshow", refreshDealSnapshot);
    window.addEventListener("focus", refreshDealSnapshot);
    window.addEventListener("popstate", refreshDealSnapshot);
    window.addEventListener("storage", syncJoinedState);
    document.addEventListener("visibilitychange", refreshDealSnapshot);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pageshow", refreshDealSnapshot);
      window.removeEventListener("focus", refreshDealSnapshot);
      window.removeEventListener("popstate", refreshDealSnapshot);
      window.removeEventListener("storage", syncJoinedState);
      document.removeEventListener("visibilitychange", refreshDealSnapshot);
    };
  }, [deal.expiresAt, deal.id]);

  useEffect(() => {
    setTimeLeft(getTimeLeft(deal.expiresAt));
    const timer = window.setInterval(() => setTimeLeft(getTimeLeft(deal.expiresAt)), 1000);
    return () => window.clearInterval(timer);
  }, [deal.expiresAt]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % productSlides.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function updateBottomState() {
      const distanceFromBottom = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
      setIsNearBottom(distanceFromBottom < 180);
    }

    updateBottomState();
    window.addEventListener("scroll", updateBottomState, { passive: true });
    window.addEventListener("resize", updateBottomState);

    return () => {
      window.removeEventListener("scroll", updateBottomState);
      window.removeEventListener("resize", updateBottomState);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      try {
        const storedPhone = window.localStorage.getItem(joinedPhoneStorageKey(deal.id));
        const params = new URLSearchParams({ dealId: deal.id });

        if (storedPhone) {
          params.set("phone", storedPhone);
        }

        const requestUrl = `/api/reservations?${params.toString()}`;
        console.log("[GruPin feed refresh] fetching snapshot", {
          dealId: deal.id,
          hasStoredPhone: Boolean(storedPhone),
          url: requestUrl,
        });
        const response = await fetch(requestUrl, { cache: "no-store" });
        const payload = (await response.json()) as DealRefreshPayload;
        console.log("[GruPin feed refresh] response", {
          ok: response.ok,
          status: response.status,
          joined: payload.joined,
          reservations: payload.reservations?.length ?? 0,
          currentCount: payload.deal?.currentCount,
          expiresAt: payload.deal?.expiresAt,
        });
        if (response.ok && Array.isArray(payload.reservations)) {
          setReservations(payload.reservations);
        }

        if (response.ok && payload.deal) {
          setDeal(payload.deal);
          setTimeLeft(getTimeLeft(payload.deal.expiresAt));
        }

        if (response.ok && payload.joined) {
          window.localStorage.setItem(joinedStorageKey(deal.id), "true");
          setHasJoinedUnlock(true);
        }
      } catch {
        // The feed can stay on the last known state if the refresh misses.
        console.log("[GruPin feed refresh] failed to fetch snapshot", { dealId: deal.id });
      }
    }, 7000);

    return () => window.clearInterval(timer);
  }, [deal.id]);

  function validate() {
    if (!form.name.trim()) {
      return "Name is required.";
    }

    if (!/^[0-9+\-\s()]{8,}$/.test(form.phone.trim())) {
      return "Enter a valid phone number.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return "Enter a valid email address.";
    }

    return "";
  }

  function openJoinModal() {
    if (window.localStorage.getItem(joinedStorageKey(deal.id)) === "true") {
      setHasJoinedUnlock(true);
      setLockedMessage("You have already joined this unlock");
      setUnlockMessage("You can claim the reward when it unlocks.");
      return;
    }

    setModalStep("details");
    setOtpCode("");
    setDemoOtp("");
    setFormError("");
    setIsModalOpen(true);
  }

  async function handlePaymentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validate();
    setFormError(error);

    if (error) {
      return;
    }

    setIsSendingOtp(true);

    try {
      window.localStorage.setItem(joinedPhoneStorageKey(deal.id), form.phone.trim());
      const response = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId: deal.id, phone: form.phone, purpose: "reservation" }),
      });
      const payload = await response.json();

      if (!response.ok) {
        if (payload.alreadyJoined) {
          window.localStorage.setItem(joinedStorageKey(deal.id), "true");
          window.localStorage.setItem(joinedPhoneStorageKey(deal.id), form.phone.trim());
          setHasJoinedUnlock(true);
          setLockedMessage("You have already joined this unlock");
          setUnlockMessage("You can claim the reward when it unlocks.");
          setIsModalOpen(false);
          return;
        }

        throw new Error(payload.message ?? "Could not send OTP.");
      }

      setDemoOtp(payload.demoOtp ?? "");
      setModalStep("otp");
    } catch (otpError) {
      setFormError(otpError instanceof Error ? otpError.message : "Could not send OTP.");
    } finally {
      setIsSendingOtp(false);
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
      const otpResponse = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId: deal.id, phone: form.phone, purpose: "reservation", code: otpCode }),
      });
      const otpPayload = await otpResponse.json();

      if (!otpResponse.ok) {
        throw new Error(otpPayload.message ?? "Could not verify OTP.");
      }

      const orderResponse = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId: deal.id }),
      });
      const order = await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(order.message ?? "Could not create payment order.");
      }

      if (order.demoMode) {
        await confirmReservation({
          razorpay_payment_id: `pay_demo_${Date.now()}`,
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
        description: `Reservation for ${deal.title}`,
        order_id: order.orderId,
        prefill: {
          name: form.name,
          email: form.email,
          contact: form.phone,
        },
        notes: {
          dealId: deal.id,
        },
        theme: {
          color: "#163126",
        },
        handler: async (response: RazorpayResponse) => {
          await confirmReservation(response);
        },
        modal: {
          ondismiss: () => setIsPaying(false),
        },
      });

      checkout.open();
    } catch (paymentError) {
      setFormError(paymentError instanceof Error ? paymentError.message : "Payment could not be started.");
      setIsPaying(false);
    }
  }

  async function confirmReservation(payment: RazorpayResponse) {
    const previousTier = getUnlockedTier(deal.currentCount, deal.tiers);

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: deal.id,
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
        throw new Error(payload.message ?? "Reservation could not be saved.");
      }

      const nextDeal = payload.deal as GroupDeal;
      const nextTier = getUnlockedTier(nextDeal.currentCount, nextDeal.tiers);
      setDeal(nextDeal);
      setReservations((current) => [payload.reservation, ...current].slice(0, 8));
      setLockedMessage("Your buyer pass is locked");
      setUnlockMessage(
        nextTier && nextTier.threshold !== previousTier?.threshold
          ? `You helped clear Level ${nextDeal.tiers.findIndex((tier) => tier.threshold === nextTier.threshold) + 1} and unlock ${getDiscountPercent(nextDeal.originalPrice, nextTier.price)}% off!`
          : nextTier
            ? `You helped keep the Level ${nextDeal.tiers.findIndex((tier) => tier.threshold === nextTier.threshold) + 1} reward active!`
            : "You moved the squad closer to Level 1."
      );
      window.localStorage.setItem(joinedStorageKey(nextDeal.id), "true");
      window.localStorage.setItem(joinedPhoneStorageKey(nextDeal.id), form.phone.trim());
      setHasJoinedUnlock(true);
      setIsModalOpen(false);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Reservation could not be saved.";

      if (message.toLowerCase().includes("already joined")) {
        window.localStorage.setItem(joinedStorageKey(deal.id), "true");
        window.localStorage.setItem(joinedPhoneStorageKey(deal.id), form.phone.trim());
        setHasJoinedUnlock(true);
        setLockedMessage("You have already joined this unlock");
        setUnlockMessage("You can claim the reward when it unlocks.");
        setIsModalOpen(false);
      } else {
        setFormError(message);
      }
    } finally {
      setIsPaying(false);
    }
  }

  function simulateUser() {
    const nextCount = deal.currentCount + 1;
    setDeal((current) => ({ ...current, currentCount: nextCount }));
    setReservations((current) => [
      {
        id: `sim-${Date.now()}`,
        dealId: deal.id,
        name: "Ananya",
        phone: "",
        email: "",
        razorpayPaymentId: "simulated",
        createdAt: new Date().toISOString(),
      },
      ...current,
    ].slice(0, 8));
  }

  function simulateUnlock() {
    const nextThreshold = getNextTier(deal.currentCount, deal.tiers)?.threshold ?? maxThreshold;
    setDeal((current) => ({ ...current, currentCount: Math.max(current.currentCount, nextThreshold) }));
  }

  return (
    <main className="bg-[#f6f8fb]">
      <div className="sticky top-20 z-50 mx-4 mt-3 rounded-[8px] border border-slate-200 bg-white/95 p-2 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-2">
          <div className="min-w-0 flex-1 rounded-[8px] bg-slate-950 px-3 py-2 text-white">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-xs font-semibold text-white/65">Mission charge</span>
              <span className="shrink-0 text-sm font-semibold">{progress}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
              <motion.div
                className="h-full rounded-full bg-[linear-gradient(90deg,#14b8a6,#facc15,#fb923c)]"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              />
            </div>
          </div>
          <div className={`shrink-0 rounded-[8px] px-3 py-2 text-center ${timeLeft.expired ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-slate-950"}`}>
            <div className="flex items-center justify-center gap-1 text-xs font-semibold">
              <Clock3 className="h-3.5 w-3.5" />
              <span>{timeLeft.expired ? "Expired" : "Ends in"}</span>
            </div>
            <p className="mt-0.5 font-mono text-sm font-semibold tracking-normal">{timeLeft.label}</p>
          </div>
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_380px] lg:py-12">
        <section className="space-y-6">
          <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
            <div className="grid gap-0 md:grid-cols-[0.9fr_1.1fr]">
              <div
                className="relative min-h-[430px] overflow-hidden bg-slate-950 px-5 py-6 text-white sm:p-6 md:min-h-[520px]"
                style={{
                  backgroundImage: `url(${productSlides[activeSlide].src})`,
                  backgroundPosition: "center",
                  backgroundSize: "cover",
                }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.18),rgba(2,6,23,0.52)_42%,rgba(2,6,23,0.88))]" />
                <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:34px_34px]" />

                <a
                  href="https://antinorm.com"
                  className="absolute right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full bg-slate-950/70 text-white shadow-[0_10px_24px_rgba(15,23,42,0.28)] ring-1 ring-white/25 backdrop-blur transition hover:bg-slate-950/85"
                  aria-label="View product on brand site"
                  title="View product"
                >
                  <ExternalLink className="h-5 w-5 text-white" />
                </a>

                <div className="relative z-10 flex h-full min-h-[382px] flex-col justify-between md:min-h-[472px]">
                  <div className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-950/55 px-3 py-1 text-sm font-medium backdrop-blur">
                    <Trophy className="h-4 w-4 text-amber-300" />
                    {levelCopy}
                  </div>

                  <div>
                    <p className="inline-flex max-w-[calc(100%-5rem)] rounded-full bg-amber-300 px-3 py-1 text-sm font-bold uppercase tracking-[0.18em] text-slate-950 shadow-[0_8px_22px_rgba(15,23,42,0.24)] sm:max-w-none">
                      {deal.title}
                    </p>
                    {/* <h1 className="mt-3 max-w-[12ch] text-4xl font-semibold tracking-tight sm:text-5xl">{deal.title}</h1> */}
                    <p className="mt-3 max-w-sm text-sm leading-6 text-white/78">
                      A limited combo drop with group-powered pricing. Check the product, join the unlock, and pay less as more buyers come in.
                    </p>
                    <div className="mt-5 flex flex-wrap items-end gap-3">
                      <span className="text-4xl font-semibold">{formatPrice(unlockedPrice)}</span>
                      <span className="pb-1 text-lg text-white/60 line-through">{formatPrice(deal.originalPrice)}</span>
                    </div>
                    {/* <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                      <div className="rounded-[8px] bg-slate-950/45 p-3 backdrop-blur">
                        <p className="text-white/60">Buyers</p>
                        <p className="mt-1 text-lg text-white">{deal.currentCount}</p>
                      </div>
                      <div className="rounded-[8px] bg-slate-950/45 p-3 backdrop-blur">
                        <p className="text-white/60">Next level</p>
                        <p className="mt-1 text-lg text-white">L{nextLevel}</p>
                      </div>
                      <div className="rounded-[8px] bg-amber-300 p-3 text-slate-950">
                        <p className="text-slate-700">Reward</p>
                        <p className="mt-1 text-lg">{unlockedTier ? `${getDiscountPercent(deal.originalPrice, unlockedTier.price)}%` : "Ready"}</p>
                      </div>
                    </div> */}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSlide((current) => (current - 1 + productSlides.length) % productSlides.length)}
                  className="absolute left-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] transition hover:text-amber-300 sm:left-4 sm:h-10 sm:w-10"
                  aria-label="Previous product image"
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSlide((current) => (current + 1) % productSlides.length)}
                  className="absolute right-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] transition hover:text-amber-300 sm:right-4 sm:h-10 sm:w-10"
                  aria-label="Next product image"
                >
                  <ChevronRight className="h-8 w-8" />
                </button>

                {/* <div className="absolute bottom-5 left-6 z-20 flex gap-2">
                  {productSlides.map((slide, index) => (
                    <button
                      key={slide.src}
                      type="button"
                      onClick={() => setActiveSlide(index)}
                      className={`h-2.5 rounded-full transition ${activeSlide === index ? "w-8 bg-amber-300" : "w-2.5 bg-white/55"}`}
                      aria-label={`Show ${slide.label}`}
                    />
                  ))}
                </div> */}
              </div>

              <div className="p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Reward map</p>
                    <h2 className="mt-1 text-2xl font-semibold text-slate-950">Clear levels, better loot</h2>
                  </div>
                  {unlockedTier ? (
                    <div className="flex items-center justify-center rounded-full bg-amber-50 px-3 py-1 text-center text-sm font-semibold text-amber-700">
                      {getDiscountPercent(deal.originalPrice, unlockedTier.price)}% unlocked
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 divide-y divide-slate-100 rounded-[8px] border border-slate-200">
                  {deal.tiers.map((tier, index) => {
                    const isUnlocked = deal.currentCount >= tier.threshold;
                    return (
                      <div
                        key={tier.threshold}
                        className={`flex items-center justify-between gap-4 p-4 transition ${
                          isUnlocked ? "bg-amber-50 text-slate-950" : "bg-white text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`grid h-9 w-9 place-items-center rounded-[8px] ${isUnlocked ? "bg-amber-400 text-slate-950" : "bg-slate-100 text-slate-500"}`}>
                            {isUnlocked ? <Trophy className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">Level {index + 1}</p>
                            <p className="text-xs text-slate-500">{tier.threshold} buyers required</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-semibold">{formatPrice(tier.price)}</p>
                          <p className="text-xs font-medium text-slate-500">
                            {isUnlocked ? "Unlocked" : `${Math.max(0, tier.threshold - deal.currentCount)} away`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[8px] border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-slate-700" />
              <h2 className="text-xl font-semibold text-slate-950">Coupon details</h2>
            </div>
            {/* <p className="mt-3 text-sm leading-6 text-slate-600">
              Antinorm Combo brings together the brand's everyday streetwear essentials in one limited drop. The group unlock keeps the product experience intact while making the final price better for every buyer who joins before the timer runs out.
            </p> */}
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[8px] bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Drop type</p>
                <p className="mt-1 font-semibold text-slate-950">Limited combo</p>
              </div>
              <div className="rounded-[8px] bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Reservation</p>
                <p className="mt-1 font-semibold text-slate-950">₹99 adjusted</p>
              </div>
              <div className="rounded-[8px] bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Best unlock</p>
                <p className="mt-1 font-semibold text-slate-950">{formatPrice(deal.tiers[deal.tiers.length - 1].price)}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[8px] border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-teal-700">
                    <Target className="h-4 w-4" />
                    Unlock progress
                  </div>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{deal.currentCount} / {maxThreshold} buyers joined</p>
                </div>
                <div className="flex items-center justify-center rounded-full bg-slate-950 px-3 py-1 text-center text-sm font-semibold text-white">
                  {progress}% charged
                </div>
              </div>
              <div className="mt-5 h-4 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                <motion.div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#14b8a6,#facc15,#fb923c)]"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {deal.tiers.map((tier, index) => (
                  <div key={tier.threshold} className="text-center">
                    <div className={`mx-auto h-2 w-2 rounded-full ${deal.currentCount >= tier.threshold ? "bg-amber-400" : "bg-slate-300"}`} />
                    <p className="mt-1 text-xs font-semibold text-slate-500">L{index + 1}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm font-medium text-slate-600">
                {nextTier
                  ? `${nextTier.threshold - deal.currentCount} more buyers needed to unlock ${nextDiscount}%`
                  : `Boss level cleared: best price unlocked at ${getDiscountPercent(deal.originalPrice, unlockedPrice)}% off`}
              </p>
            </div>

            <div className={`rounded-[8px] border p-5 sm:p-6 ${timeLeft.expired ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"}`}>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Clock3 className="h-4 w-4" />
                Timed Deal
              </div>
              <p className="mt-3 text-sm text-slate-600">{timeLeft.expired ? "Deal expired" : "Reward window ends in:"}</p>
              <p className="mt-2 font-mono text-3xl font-semibold tracking-normal text-slate-950">{timeLeft.label}</p>
            </div>
          </div>

          {lockedMessage ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[8px] border border-emerald-200 bg-emerald-50 p-5 text-emerald-950"
            >
              <p className="text-lg font-semibold">✅ {lockedMessage}</p>
              <p className="mt-1 text-sm font-medium">🎉 {unlockMessage}</p>
            </motion.div>
          ) : null}

          {/* <div className="rounded-[8px] border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-slate-700" />
              <h2 className="text-xl font-semibold text-slate-950">Checkout reward</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[8px] bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Unlocked price</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{formatPrice(unlockedPrice)}</p>
              </div>
              <div className="rounded-[8px] bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Reservation adjusted</p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">- {formatPrice(reservationAmount)}</p>
              </div>
              <div className="rounded-[8px] bg-emerald-50 p-4">
                <p className="text-sm text-emerald-700">Final payable</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-950">{formatPrice(finalPayable)}</p>
              </div>
            </div>
          </div> */}
        </section>

        <aside className="space-y-6">
          <div className="sticky top-6 rounded-[8px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-6">
            <div className="rounded-[8px] bg-slate-950 p-4 text-white">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
                <ShieldCheck className="h-4 w-4" />
                Buyer pass
              </div>
              <p className="mt-2 text-2xl font-semibold">Reserve your slot</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-[8px] bg-white/10 p-3">
                  <p className="text-white/55">Current reward</p>
                  <p className="mt-1 font-semibold">{formatPrice(unlockedPrice)}</p>
                </div>
                <div className="rounded-[8px] bg-white/10 p-3">
                  <p className="text-white/55">Squad size</p>
                  <p className="mt-1 font-semibold">{deal.currentCount} buyers</p>
                </div>
              </div>
            </div>
            <p className="mt-5 text-3xl font-semibold text-slate-950">Lock best price for ₹99</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Fully adjusted in final amount. Refunded if deal is not unlocked.
            </p>
            {hasJoinedUnlock || timeLeft.expired ? (
              <>
                <a
                  href={`/complete-purchase/${deal.id}`}
                  onClick={() => {
                    if (hasJoinedUnlock) {
                      window.localStorage.setItem(joinedStorageKey(deal.id), "true");
                    }
                  }}
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <span className="text-white">{hasJoinedUnlock && !timeLeft.expired ? "Claim reward" : "Complete purchase"}</span>
                  <ExternalLink className="h-4 w-4 text-white" />
                </a>
                {hasJoinedUnlock ? (
                  <p className="mt-2 rounded-[8px] bg-emerald-50 p-3 text-center text-xs font-medium text-emerald-800">
                    You have already joined this unlock. You can claim the reward when it unlocks.
                  </p>
                ) : null}
                <p className="mt-2 text-center text-xs font-medium text-slate-500">
                  Final payable {formatPrice(finalPayable)}
                </p>
              </>
            ) : (
              <button
                type="button"
                onClick={openJoinModal}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-amber-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
              >
                <Flame className="h-4 w-4" />
                Join the unlock for ₹99
              </button>
            )}

            <div className="mt-6 rounded-[8px] bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Activity className="h-4 w-4 text-teal-600" />
                Live squad feed
              </div>
              <div className="mt-4 space-y-3">
                {reservations.slice(0, 6).map((reservation) => (
                  <div key={reservation.id} className="flex items-start justify-between gap-3 text-sm">
                    <p className="text-slate-700">{friendlyActivityName(reservation)} joined the unlock</p>
                    <span className="shrink-0 text-xs text-slate-400">{timeAgo(reservation.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>

            {showDemoControls ? (
              <div className="mt-5 flex gap-2">
                <button type="button" onClick={simulateUser} className="h-9 flex-1 rounded-[8px] border border-slate-200 text-xs font-semibold text-slate-700">
                  Simulate +1 user
                </button>
                <button type="button" onClick={simulateUnlock} className="h-9 flex-1 rounded-[8px] border border-slate-200 text-xs font-semibold text-slate-700">
                  Simulate unlock
                </button>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <motion.div
        initial={false}
        animate={{ y: isNearBottom ? 120 : 0, opacity: isNearBottom ? 0 : 1 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/96 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-14px_34px_rgba(15,23,42,0.14)] backdrop-blur md:hidden"
        aria-hidden={isNearBottom}
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-2 flex items-center justify-between gap-3 rounded-[8px] bg-slate-50 px-3 py-2 text-xs">
            <div className="flex min-w-0 items-center gap-2 text-slate-700">
              <Activity className="h-3.5 w-3.5 shrink-0 text-teal-600" />
              <span className="truncate">
                {latestReservation
                  ? `${friendlyActivityName(latestReservation)} joined ${timeAgo(latestReservation.createdAt)}`
                  : "Live squad feed is warming up"}
              </span>
            </div>
            <span className="shrink-0 font-semibold text-slate-500">{deal.currentCount}/{maxThreshold}</span>
          </div>

          {timeLeft.expired || hasJoinedUnlock ? (
            <a
              href={`/complete-purchase/${deal.id}`}
              onClick={() => {
                if (hasJoinedUnlock) {
                  window.localStorage.setItem(joinedStorageKey(deal.id), "true");
                }
              }}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-slate-950 px-5 py-3 text-center text-sm font-semibold leading-5 text-white transition hover:bg-slate-800"
            >
              <span className="text-white">{hasJoinedUnlock && !timeLeft.expired ? "Claim reward" : "Complete purchase"}</span>
              <ExternalLink className="h-4 w-4 shrink-0 text-white" />
            </a>
          ) : (
            <button
              type="button"
              onClick={openJoinModal}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-amber-400 px-5 py-3 text-center text-sm font-semibold leading-5 text-slate-950 transition hover:bg-amber-300"
            >
              <Flame className="h-4 w-4 shrink-0" />
              Join unlock for ₹99
            </button>
          )}
        </div>
      </motion.div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 px-4">
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-md rounded-[8px] bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  <Sparkles className="h-4 w-4" />
                  Claim your buyer pass for ₹99
                </div>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">Join the unlock mission</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Fully adjusted in final amount. Refunded if deal is not unlocked.
                </p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="grid h-9 w-9 place-items-center rounded-[8px] text-slate-500 hover:bg-slate-100" aria-label="Close modal">
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalStep === "details" ? (
              <form onSubmit={handlePaymentSubmit} className="mt-5 space-y-4">
                <label className="block text-sm font-medium text-slate-700">
                  Name
                  <input
                    required
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    className="mt-1 h-11 w-full rounded-[8px] border border-slate-200 px-3 outline-none transition focus:border-emerald-500"
                    placeholder="Rohit Sharma"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Phone
                  <input
                    required
                    value={form.phone}
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    className="mt-1 h-11 w-full rounded-[8px] border border-slate-200 px-3 outline-none transition focus:border-emerald-500"
                    placeholder="+91 98765 43210"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Email
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    className="mt-1 h-11 w-full rounded-[8px] border border-slate-200 px-3 outline-none transition focus:border-emerald-500"
                    placeholder="you@example.com"
                  />
                </label>

                {formError ? <p className="rounded-[8px] bg-rose-50 p-3 text-sm font-medium text-rose-700">{formError}</p> : null}

                <button
                  type="submit"
                  disabled={isSendingOtp}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:bg-slate-400"
                >
                  <CreditCard className="h-4 w-4" />
                  {isSendingOtp ? "Sending SMS OTP..." : "Send SMS OTP"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleOtpSubmit} className="mt-5 space-y-4">
                <div className="rounded-[8px] bg-emerald-50 p-4 text-sm text-emerald-900">
                  SMS OTP sent to {form.phone}. Verify your mobile number to proceed to payment.
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

                {formError ? <p className="rounded-[8px] bg-rose-50 p-3 text-sm font-medium text-rose-700">{formError}</p> : null}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setModalStep("details")}
                    className="h-12 flex-1 rounded-[8px] border border-slate-200 px-5 text-sm font-semibold text-slate-700"
                  >
                    Edit details
                  </button>
                  <button
                    type="submit"
                    disabled={isPaying}
                    className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[8px] bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:bg-slate-400"
                  >
                    <CreditCard className="h-4 w-4" />
                    {isPaying ? "Opening..." : "Verify & Pay"}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      ) : null}
    </main>
  );
}
