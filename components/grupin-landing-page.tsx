"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeIndianRupee,
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
  Zap,
} from "lucide-react";

const tiers = [
  { people: 10, price: 899 },
  { people: 25, price: 749 },
  { people: 50, price: 649 },
];

const categoryExamples = {
  apparel: {
    label: "Apparel",
    product: "Premium Gym T-shirt",
    basePrice: 999,
    expectedInterest: 50,
    purchased: 30,
    tiers: [
      { people: 10, price: 899 },
      { people: 25, price: 749 },
      { people: 50, price: 699 },
    ],
    feed: ["Rohit joined", "Ayesha joined", "Kabir joined", "Meera joined", "Nikhil joined"],
  },
  skincare: {
    label: "Skincare",
    product: "Vitamin C Glow Serum",
    basePrice: 1499,
    expectedInterest: 60,
    purchased: 36,
    tiers: [
      { people: 15, price: 1299 },
      { people: 35, price: 1099 },
      { people: 60, price: 949 },
    ],
    feed: ["Ira joined", "Tanya joined", "Devika joined", "Neha joined", "Sana joined"],
  },
  fitness: {
    label: "Fitness",
    product: "Performance Shaker Bundle",
    basePrice: 1299,
    expectedInterest: 45,
    purchased: 27,
    tiers: [
      { people: 10, price: 1099 },
      { people: 25, price: 899 },
      { people: 45, price: 799 },
    ],
    feed: ["Arjun joined", "Rhea joined", "Vivaan joined", "Maya joined", "Aman joined"],
  },
};

type CategoryKey = keyof typeof categoryExamples;
type Tier = { people: number; price: number };

const problemPoints = [
  {
    icon: TrendingDown,
    title: "Public discounts hurt brand perception",
    text: "Customers learn to wait, and full-price buyers feel punished.",
  },
  {
    icon: CircleDollarSign,
    title: "High CAC makes growth expensive",
    text: "Traffic costs rise while purchase intent stays hard to prove.",
  },
  {
    icon: Gauge,
    title: "Low conversion rates",
    text: "A drop can get attention and still produce only a few buyers.",
  },
  {
    icon: Boxes,
    title: "Inventory sits unsold",
    text: "Demand exists, but not enough buyers move at the same time.",
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

const objectionPoints = [
  "Discount only activates if demand is real",
  "You control pricing tiers completely",
  "No public discounting",
  "You only fulfill confirmed orders",
];

function getPrice(joined: number, activeTiers: Tier[] = tiers, basePrice = 999) {
  return [...activeTiers].reverse().find((tier) => joined >= tier.people)?.price ?? basePrice;
}

function getUnlockedTier(joined: number, activeTiers: Tier[] = tiers) {
  return [...activeTiers].reverse().find((tier) => joined >= tier.people);
}

function formatPrice(price: number) {
  return `₹${price.toLocaleString("en-IN")}`;
}

function formatNumber(value: number) {
  return value.toLocaleString("en-IN");
}

function HeroAtmosphere() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-60 md:opacity-100" aria-hidden="true">
      <div className="absolute -left-20 top-8 h-56 w-56 rounded-full bg-sky-200/35 blur-3xl md:-left-24 md:top-6 md:h-72 md:w-72 md:bg-sky-200/45" />
      <div className="absolute right-[-8rem] top-28 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl md:right-[-7rem] md:top-20 md:h-96 md:w-96 md:bg-emerald-200/45" />
      <div className="absolute bottom-[-8rem] left-1/4 h-64 w-64 rounded-full bg-amber-100/25 blur-3xl md:bottom-[-9rem] md:left-1/3 md:h-80 md:w-80 md:bg-amber-100/35" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(14,165,233,0.07),transparent_30%),radial-gradient(circle_at_78%_24%,rgba(16,185,129,0.08),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.78),rgba(240,253,250,0.28))] md:bg-[radial-gradient(circle_at_18%_16%,rgba(14,165,233,0.10),transparent_30%),radial-gradient(circle_at_78%_24%,rgba(16,185,129,0.12),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.72),rgba(240,253,250,0.28))]" />
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-white/70 to-transparent" />
    </div>
  );
}

function FaintPattern({ variant = "light" }: { variant?: "light" | "dark" }) {
  const isDark = variant === "dark";

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className={`absolute inset-0 ${
          isDark
            ? "opacity-[0.08] [background-image:radial-gradient(circle,rgba(255,255,255,0.9)_1px,transparent_1px)]"
            : "opacity-[0.36] [background-image:radial-gradient(circle,rgba(15,23,42,0.18)_1px,transparent_1px)]"
        } [background-size:22px_22px]`}
      />
      <div
        className={`absolute inset-0 ${
          isDark
            ? "bg-[linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.045)_1px,transparent_1px)]"
            : "bg-[linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(0deg,rgba(15,23,42,0.035)_1px,transparent_1px)]"
        } [background-size:72px_72px]`}
      />
      <div className={`absolute inset-0 ${isDark ? "bg-slate-950/80" : "bg-white/70"}`} />
    </div>
  );
}

function DemandFlowBackground() {
  const paths = [
    "M-80 220 C 120 80, 260 360, 520 190 S 860 80, 1220 240",
    "M-40 420 C 180 300, 360 470, 620 330 S 920 270, 1240 420",
    "M120 60 C 320 180, 520 40, 720 150 S 980 260, 1180 110",
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg className="absolute inset-0 h-full w-full opacity-[0.09]" viewBox="0 0 1200 620" fill="none" preserveAspectRatio="none">
        <defs>
          <linearGradient id="demand-flow-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="#10b981" />
            <stop offset="0.5" stopColor="#0ea5e9" />
            <stop offset="1" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        {paths.map((path, index) => (
          <motion.path
            key={path}
            d={path}
            stroke="url(#demand-flow-gradient)"
            strokeWidth={index === 1 ? 2.5 : 1.7}
            strokeLinecap="round"
            strokeDasharray="10 18"
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: -140 }}
            transition={{ duration: 18 + index * 5, repeat: Infinity, ease: "linear" }}
          />
        ))}
        {[
          [300, 174],
          [640, 328],
          [870, 120],
          [1040, 388],
        ].map(([cx, cy], index) => (
          <motion.circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r="5"
            fill="#10b981"
            initial={{ opacity: 0.18, scale: 0.8 }}
            animate={{ opacity: [0.18, 0.7, 0.18], scale: [0.8, 1.25, 0.8] }}
            transition={{ duration: 5, delay: index * 0.7, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,transparent_0%,rgba(255,255,255,0.78)_66%)]" />
    </div>
  );
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
      className="relative z-30 w-full max-w-[420px] scale-[0.94] rounded-[28px] border border-white/70 bg-white/88 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.16)] backdrop-blur-xl md:w-[min(420px,86vw)] md:max-w-none md:scale-100 md:border-white/55 md:bg-white/82 md:shadow-[0_30px_90px_rgba(15,23,42,0.18)]"
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

function RevenueCalculator() {
  const [productPrice, setProductPrice] = useState(999);
  const [expectedInterest, setExpectedInterest] = useState(50);
  const lowBuyers = Math.max(1, Math.round(expectedInterest * 0.04));
  const highBuyers = Math.max(lowBuyers + 1, Math.ceil(expectedInterest * 0.05));
  const withoutLow = lowBuyers * productPrice;
  const withoutHigh = highBuyers * productPrice;
  const unlockPrice = Math.max(99, Math.round(productPrice * 0.7));
  const withBuyers = Math.round(expectedInterest * 0.6);
  const withRevenue = withBuyers * unlockPrice;
  const multiple = withRevenue / Math.max(1, withoutHigh);

  return (
    <section className="relative overflow-hidden bg-slate-950 px-6 py-24 text-white">
      <FaintPattern variant="dark" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/60 to-transparent" />
      <div className="relative z-10 mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.55 }}
        >
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Revenue math</p>
          <h2 className="mt-4 text-4xl font-semibold md:text-5xl">What this does for your revenue</h2>
          <p className="mt-5 max-w-lg text-lg leading-8 text-slate-300">
            Same demand, different outcome. GruPin turns passive interest into a group event with a purchase trigger.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <label className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <span className="text-sm font-semibold text-slate-300">Product price</span>
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-slate-950">
                <span className="font-semibold">₹</span>
                <input
                  type="number"
                  min="199"
                  step="50"
                  value={productPrice}
                  onChange={(event) => setProductPrice(Number(event.target.value) || 0)}
                  className="w-full bg-transparent text-lg font-semibold outline-none"
                />
              </div>
            </label>
            <label className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <span className="text-sm font-semibold text-slate-300">Expected interest</span>
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-slate-950">
                <input
                  type="number"
                  min="10"
                  step="5"
                  value={expectedInterest}
                  onChange={(event) => setExpectedInterest(Number(event.target.value) || 0)}
                  className="w-full bg-transparent text-lg font-semibold outline-none"
                />
                <span className="font-semibold">users</span>
              </div>
            </label>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6 }}
          className="rounded-[30px] border border-white/10 bg-white p-4 text-slate-950 shadow-[0_30px_100px_rgba(16,185,129,0.18)] md:p-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Without GruPin</p>
              <p className="mt-5 text-sm font-medium text-slate-600">Conversion rate: 2-5%</p>
              <motion.p key={`without-buyers-${lowBuyers}-${highBuyers}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-3xl font-semibold">
                {lowBuyers}-{highBuyers} buyers
              </motion.p>
              <motion.p key={`without-revenue-${withoutLow}-${withoutHigh}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-4xl font-semibold text-slate-500">
                {formatPrice(withoutLow)}-{formatPrice(withoutHigh)}
              </motion.p>
              <p className="mt-4 text-sm leading-6 text-slate-500">Most interested users stay undecided, and the brand still has no urgency signal.</p>
            </div>

            <div className="relative overflow-hidden rounded-3xl bg-emerald-950 p-5 text-white">
              <div className="absolute right-4 top-4 rounded-full bg-emerald-300 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-emerald-950">
                GruPin
              </div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-200">With GruPin</p>
              <p className="mt-5 text-sm font-medium text-emerald-100">{formatNumber(expectedInterest)} people join</p>
              <motion.p key={`buyers-${withBuyers}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-3xl font-semibold">
                60% convert ({withBuyers} buyers)
              </motion.p>
              <p className="mt-3 text-sm font-medium text-emerald-100">Unlock price {formatPrice(unlockPrice)}</p>
              <motion.p key={`revenue-${withRevenue}`} initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="mt-4 text-5xl font-semibold text-emerald-200">
                {formatPrice(withRevenue)}
              </motion.p>
            </div>
          </div>

          <div className="mt-5 rounded-3xl bg-slate-950 p-5 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-300">Founder takeaway</p>
            <motion.p key={`multiple-${multiple.toFixed(1)}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-3xl font-semibold">
              Up to {Math.max(5, Math.round(multiple))}x more revenue from the same demand
            </motion.p>
            <div className="mt-5 grid grid-cols-[1fr_3fr] items-end gap-3">
              <div className="rounded-t-xl bg-slate-600 p-3 text-center text-xs font-semibold">
                Old path
              </div>
              <motion.div
                initial={{ height: 40 }}
                animate={{ height: 132 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="rounded-t-xl bg-gradient-to-r from-emerald-400 to-sky-400 p-3 text-center text-xs font-semibold text-slate-950"
              >
                GruPin unlock
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function UnlockDemo() {
  const [category, setCategory] = useState<CategoryKey>("apparel");
  const example = categoryExamples[category];
  const maxPeople = example.tiers[example.tiers.length - 1].people;
  const [joined, setJoined] = useState(Math.round(maxPeople * 0.42));
  const price = getPrice(joined, example.tiers, example.basePrice);
  const unlockedTier = getUnlockedTier(joined, example.tiers);
  const progress = Math.min(100, Math.round((joined / maxPeople) * 100));
  const isComplete = joined >= maxPeople;
  const purchased = isComplete ? example.purchased : Math.max(0, Math.round(joined * 0.3));

  useEffect(() => {
    setJoined(Math.round(categoryExamples[category].tiers.at(-1)!.people * 0.42));
  }, [category]);

  const status = useMemo(() => {
    if (joined >= maxPeople) return "UNLOCKED";
    const next = example.tiers.find((tier) => joined < tier.people);
    return next ? `${next.people - joined} more to unlock ${formatPrice(next.price)}` : "Unlocked";
  }, [example.tiers, joined, maxPeople]);

  const visibleFeed = example.feed.slice(0, Math.min(example.feed.length, Math.max(2, Math.ceil(joined / 12))));

  return (
    <section id="demo" className="relative overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_58%,#ecfdf5_100%)] px-6 py-24">
      <DemandFlowBackground />
      <div className="relative z-10 mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.55 }}
          className="max-w-3xl"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Live pricing system</p>
          <h2 className="mt-4 text-4xl font-semibold text-slate-950 md:text-5xl">Show buyers the price getting better in real time</h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Category-specific unlocks make the value feel concrete. The only discount buyers see is the one they help create.
          </p>
        </motion.div>

        <div className="mt-10 flex flex-wrap gap-2">
          {(Object.keys(categoryExamples) as CategoryKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                category === key ? "bg-slate-950 text-white shadow-lg" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {categoryExamples[key].label}
            </button>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6 }}
          className="relative mt-8 rounded-[30px] border border-slate-200 bg-white p-4 shadow-[0_24px_90px_rgba(15,23,42,0.10)] md:p-6"
        >
          <ConfettiBurst active={isComplete} />
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[22px] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-slate-950 to-slate-700 text-white">
                  <Gift className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Product drop</p>
                  <h3 className="text-2xl font-semibold text-slate-950">{example.product}</h3>
                </div>
              </div>
              <div className="rounded-2xl bg-emerald-50 px-5 py-3 text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  {isComplete ? "UNLOCKED" : "Current price"}
                </p>
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
              {example.tiers.map((tier) => {
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
                  onClick={() => setJoined((value) => Math.min(maxPeople, value + 5))}
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
                max={maxPeople}
                value={joined}
                onChange={(event) => setJoined(Number(event.target.value))}
                className="mt-5 w-full accent-emerald-600"
              />
              <div className="mt-3 flex justify-between text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                <span>0</span>
                <span>{unlockedTier ? `${formatPrice(unlockedTier.price)} unlocked` : "Start"}</span>
                <span>{maxPeople}</span>
              </div>
            </div>
          </div>

          <div className="rounded-[22px] bg-slate-950 p-5 text-white">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">Live join feed</p>
              {isComplete ? (
                <span className="rounded-full bg-emerald-300 px-3 py-1 text-xs font-bold text-emerald-950">UNLOCKED</span>
              ) : null}
            </div>
            <div className="mt-5 space-y-3">
              {visibleFeed.map((item, index) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.04 }}
                  className="flex items-center justify-between rounded-2xl bg-white/8 px-4 py-3"
                >
                  <span>{item}</span>
                  <span className="text-sm text-emerald-200">just now</span>
                </motion.div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl bg-white p-4 text-slate-950">
              <p className="text-sm font-semibold text-slate-500">Conversion after unlock</p>
              <motion.p key={purchased} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-2 text-3xl font-semibold">
                {purchased} people purchased
              </motion.p>
              <p className="mt-2 text-sm text-slate-500">Revenue captured at {formatPrice(price)} without a public sale.</p>
            </div>
          </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section className="bg-slate-50 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">How it works</p>
            <h2 className="mt-4 text-4xl font-semibold text-slate-950 md:text-5xl">Three moves from interest to revenue.</h2>
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
  );
}

export function GruPinLandingPage() {
  return (
    <div className="bg-white text-slate-950">
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#eef6ff_48%,#ecfdf5_100%)] px-5 py-8 pb-12 md:min-h-[calc(100vh-65px)] md:px-6 md:py-28">
        <HeroAtmosphere />
        <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(255,255,255,0.72)_38%,rgba(255,255,255,0.34)_72%,rgba(255,255,255,0)_100%)] md:bg-[linear-gradient(180deg,rgba(255,255,255,0.42)_0%,rgba(255,255,255,0.22)_46%,rgba(255,255,255,0)_100%)]" />
        <div className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
        <div className="relative mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65 }}
              className="relative z-20 mx-auto max-w-[480px] rounded-[28px] border border-white/70 bg-white/72 p-5 shadow-sm backdrop-blur-md md:mx-0 md:max-w-3xl md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-0"
            >
              <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                Group price unlocks for D2C drops
              </p>
              <h1 className="mt-7 text-4xl font-semibold leading-[1.08] text-slate-950 sm:text-5xl md:mt-8 md:text-7xl md:leading-[1.02]">
                Sell more without putting your brand on sale
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 md:mt-6 md:text-xl">
                Prices drop as more customers join — unlock demand without public discounts.
              </p>
              <button
                type="button"
                onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-800 md:mt-9"
              >
                See how it works
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
            <div className="relative z-20 flex justify-center lg:justify-end">
              <HeroUnlockVisual />
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-white px-6 py-24">
        <FaintPattern />
        <div className="relative z-10 mx-auto max-w-6xl">
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

      <RevenueCalculator />

      <HowItWorksSection />

      <UnlockDemo />

      <section className="bg-slate-950 px-6 py-24 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Why brands love this</p>
            <h2 className="mt-4 text-4xl font-semibold md:text-5xl">More revenue without training buyers to wait.</h2>
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
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">Mock case study</p>
              <h2 className="mt-4 text-4xl font-semibold text-slate-950 md:text-5xl">Fitness brand drop</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                A limited activewear drop turned interest into confirmed orders without publishing a discount.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["52", "people joined"],
                ["₹699", "final unlock price"],
                ["34", "purchases completed"],
                ["₹23,766", "revenue generated"],
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

      <section className="bg-white px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Margin safe</p>
              <h2 className="mt-4 text-4xl font-semibold text-slate-950 md:text-5xl">
                Why this doesn't hurt your brand or margins
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                GruPin is not a coupon blast. Lower prices only appear when enough demand is already proven.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {objectionPoints.map((point, index) => (
                <motion.div
                  key={point}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.4, delay: index * 0.06 }}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <p className="mt-4 font-semibold text-slate-950">{point}</p>
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
            Launch your first demand unlock in 10 minutes
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-slate-600">
            No integration. No risk. Just results.
          </p>
          <button
            type="button"
            onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
            className="mt-9 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-7 py-4 text-sm font-semibold text-white shadow-[0_20px_50px_rgba(22,163,74,0.25)] transition hover:-translate-y-0.5 hover:bg-emerald-700"
          >
            Start a test drop
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      </section>
    </div>
  );
}
