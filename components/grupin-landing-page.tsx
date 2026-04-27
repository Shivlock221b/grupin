"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeIndianRupee,
  BarChart3,
  Boxes,
  Check,
  ChevronRight,
  CircleDollarSign,
  Gauge,
  Gift,
  PackageCheck,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  Users,
  WalletCards,
  Zap,
} from "lucide-react";

const tiers = [
  { people: 10, price: 899 },
  { people: 25, price: 749 },
  { people: 50, price: 649 },
];

const problemPoints = [
  {
    icon: TrendingDown,
    title: "Public discounts hurt brand perception",
    text: "Customers learn to wait for the next sale.",
  },
  {
    icon: CircleDollarSign,
    title: "High CAC makes growth expensive",
    text: "Paid acquisition keeps eating into contribution margin.",
  },
  {
    icon: Gauge,
    title: "Low conversion rates",
    text: "Interest does not always convert into a purchase today.",
  },
  {
    icon: Boxes,
    title: "Inventory sits unsold",
    text: "Good products lose momentum because demand is fragmented.",
  },
];

const benefits = [
  "Sell more units without public discounts",
  "Lower customer acquisition cost",
  "Move inventory faster",
  "Discover optimal pricing through real demand",
];

const trustPoints = [
  "You control pricing tiers",
  "No upfront integration required",
  "We handle the entire flow",
  "You only fulfill confirmed orders",
];

function getPrice(joined: number) {
  return [...tiers].reverse().find((tier) => joined >= tier.people)?.price ?? 999;
}

function getUnlockedTier(joined: number) {
  return [...tiers].reverse().find((tier) => joined >= tier.people);
}

function formatPrice(price: number) {
  return `₹${price.toLocaleString("en-IN")}`;
}

function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 18 }).map((_, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, x: "50%", y: "55%", scale: 0.4, rotate: 0 }}
          animate={{
            opacity: [0, 1, 0],
            x: `${50 + Math.cos(index) * (18 + index * 2)}%`,
            y: `${48 + Math.sin(index * 1.7) * (18 + index)}%`,
            scale: [0.4, 1, 0.8],
            rotate: 180 + index * 18,
          }}
          transition={{ duration: 1.25, ease: "easeOut" }}
          className="absolute h-2 w-2 rounded-[2px]"
          style={{
            backgroundColor: ["#16a34a", "#2563eb", "#f59e0b", "#ef4444"][index % 4],
          }}
        />
      ))}
    </div>
  );
}

function HeroUnlockVisual() {
  const [joined, setJoined] = useState(12);
  const price = getPrice(joined);
  const progress = Math.min(100, Math.round((joined / 50) * 100));

  useEffect(() => {
    const sequence = [12, 18, 25, 34, 50, 16];
    let index = 0;
    const timer = window.setInterval(() => {
      index = (index + 1) % sequence.length;
      setJoined(sequence[index]);
    }, 1600);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotate: -2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.7, delay: 0.2 }}
      className="absolute bottom-8 right-4 w-[min(420px,86vw)] rounded-[28px] border border-white/55 bg-white/82 p-5 shadow-[0_30px_90px_rgba(15,23,42,0.18)] backdrop-blur-xl md:bottom-16 md:right-12"
    >
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Live product unlock</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">Premium Gym T-shirt</h3>
        </div>
        <div className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
          {formatPrice(price)}
        </div>
      </div>
      <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-white">
        <div className="flex items-center justify-between text-sm">
          <span>{joined}/50 joined</span>
          <span className="text-emerald-300">Unlocking demand</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-amber-300"
          />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
        {tiers.map((tier) => (
          <div
            key={tier.people}
            className={`rounded-2xl border p-3 transition ${
              joined >= tier.people
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            <p className="font-semibold">{tier.people} people</p>
            <p className="mt-1">{formatPrice(tier.price)}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function UnlockDemo() {
  const [joined, setJoined] = useState(18);
  const price = getPrice(joined);
  const unlockedTier = getUnlockedTier(joined);
  const progress = Math.min(100, Math.round((joined / 50) * 100));
  const isComplete = joined >= 50;

  const status = useMemo(() => {
    if (joined >= 50) return "Best price unlocked";
    const next = tiers.find((tier) => joined < tier.people);
    return next ? `${next.people - joined} more to unlock ${formatPrice(next.price)}` : "Unlocked";
  }, [joined]);

  return (
    <section id="demo" className="relative overflow-hidden bg-white px-6 py-24">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.55 }}
        >
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Core mechanic</p>
          <h2 className="mt-4 max-w-xl text-4xl font-semibold text-slate-950 md:text-5xl">Unlock pricing with demand</h2>
          <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
            Customers join the drop first. As the group grows, the product price unlocks tier by tier.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6 }}
          className="relative rounded-[28px] border border-slate-200 bg-slate-50 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-6"
        >
          <ConfettiBurst active={isComplete} />
          <div className="rounded-[22px] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-slate-950 to-slate-700 text-white">
                  <Gift className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Product drop</p>
                  <h3 className="text-2xl font-semibold text-slate-950">Premium Gym T-shirt</h3>
                </div>
              </div>
              <div className="rounded-2xl bg-emerald-50 px-5 py-3 text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Unlocked price</p>
                <motion.p
                  key={price}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-3xl font-semibold text-emerald-900"
                >
                  {formatPrice(price)}
                </motion.p>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between text-sm font-medium text-slate-600">
                <span>{joined} people joined</span>
                <span>{status}</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4 }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-amber-400"
                />
              </div>
            </div>

            <div className="mt-7 grid gap-3 md:grid-cols-3">
              {tiers.map((tier) => {
                const unlocked = joined >= tier.people;
                return (
                  <motion.div
                    key={tier.people}
                    animate={{ y: unlocked ? -4 : 0 }}
                    className={`rounded-2xl border p-4 transition ${
                      unlocked ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-950">{tier.people} people</p>
                      {unlocked ? <Check className="h-5 w-5 text-emerald-600" /> : null}
                    </div>
                    <p className={`mt-2 text-2xl font-semibold ${unlocked ? "text-emerald-800" : "text-slate-500"}`}>
                      {formatPrice(tier.price)}
                    </p>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <label htmlFor="joined-slider" className="text-sm font-semibold text-slate-700">
                  Simulate users joining
                </label>
                <button
                  type="button"
                  onClick={() => setJoined((value) => Math.min(50, value + 5))}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <Zap className="h-4 w-4" />
                  Add users
                </button>
              </div>
              <input
                id="joined-slider"
                type="range"
                min="0"
                max="50"
                value={joined}
                onChange={(event) => setJoined(Number(event.target.value))}
                className="mt-5 w-full accent-emerald-600"
              />
              <div className="mt-3 flex justify-between text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                <span>0</span>
                <span>{unlockedTier ? `${formatPrice(unlockedTier.price)} unlocked` : "Start"}</span>
                <span>50</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function GruPinLandingPage() {
  return (
    <div className="bg-white text-slate-950">
      <section className="relative min-h-[calc(100vh-65px)] overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#eef6ff_48%,#ecfdf5_100%)] px-6 py-20 md:py-28">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65 }}
            className="relative z-10 max-w-3xl"
          >
            <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              Group price unlocks for D2C drops
            </p>
            <h1 className="mt-8 text-5xl font-semibold leading-[1.02] text-slate-950 md:text-7xl">
              Sell more without putting your brand on sale
            </h1>
            <p className="mt-6 max-w-2xl text-xl leading-8 text-slate-600">
              Prices drop as more customers join — unlock demand without public discounts.
            </p>
            <button
              type="button"
              onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
              className="mt-9 inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              See how it works
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
          <HeroUnlockVisual />
        </div>
      </section>

      <section className="bg-white px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.55 }}
            className="max-w-2xl"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-600">The problem</p>
            <h2 className="mt-4 text-4xl font-semibold text-slate-950 md:text-5xl">Discounting is broken</h2>
          </motion.div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {problemPoints.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-red-50 group-hover:text-red-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.text}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <UnlockDemo />

      <section className="bg-slate-50 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">How it works</p>
              <h2 className="mt-4 text-4xl font-semibold text-slate-950 md:text-5xl">Three moves. One demand signal.</h2>
            </div>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              { icon: SlidersHorizontal, title: "Create a group unlock for a product" },
              { icon: Users, title: "Customers join (no upfront payment)" },
              { icon: PackageCheck, title: "Price unlocks → they purchase" },
            ].map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-sky-50 text-sky-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    {index < 2 ? <ChevronRight className="hidden h-5 w-5 text-slate-300 md:block" /> : null}
                  </div>
                  <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Step {index + 1}</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950">{step.title}</h3>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 px-6 py-24 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Why brands love this</p>
            <h2 className="mt-4 text-4xl font-semibold md:text-5xl">More demand. Less brand damage.</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <Check className="h-5 w-5 shrink-0 text-emerald-300" />
                <span className="font-medium text-white/90">{benefit}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">Real example</p>
              <h2 className="mt-4 text-4xl font-semibold text-slate-950 md:text-5xl">Brand X ran a group unlock</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                A focused drop created urgency without publishing a coupon code or training buyers to wait for sales.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["43", "people joined in 24 hours"],
                ["₹699", "final unlock price"],
                ["31", "units sold"],
                ["0", "public discounts"],
              ].map(([value, label], index) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.4, delay: index * 0.06 }}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <p className="text-4xl font-semibold text-slate-950">{value}</p>
                  <p className="mt-2 text-sm font-medium text-slate-600">{label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm md:p-10"
          >
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Low risk</p>
                <h2 className="mt-4 text-4xl font-semibold text-slate-950 md:text-5xl">Zero risk to try</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {trustPoints.map((point) => (
                  <div key={point} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                    <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
                    <span className="text-sm font-semibold text-slate-700">{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="bg-white px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          className="mx-auto max-w-4xl text-center"
        >
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-950 text-white">
            <BadgeIndianRupee className="h-6 w-6" />
          </div>
          <h2 className="mt-7 text-4xl font-semibold text-slate-950 md:text-6xl">
            Turn your next product drop into a demand unlock
          </h2>
          <button
            type="button"
            onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
            className="mt-9 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-7 py-4 text-sm font-semibold text-white shadow-[0_20px_50px_rgba(22,163,74,0.25)] transition hover:-translate-y-0.5 hover:bg-emerald-700"
          >
            Run a test with us
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      </section>
    </div>
  );
}
