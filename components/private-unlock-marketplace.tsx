"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgePercent, CreditCard, Search, Share2, Sparkles, Trophy, Users } from "lucide-react";
import { PrivateUnlockDealConfig } from "@/lib/types";
import { AccountMenu } from "@/components/account-menu";

type PrivateUnlockMarketplaceProps = {
  configs: PrivateUnlockDealConfig[];
};

function formatPrice(price: number) {
  return `₹${price.toLocaleString("en-IN")}`;
}

function unlockPrice(originalPrice: number, discountPercent: number) {
  return Math.round(originalPrice * (1 - discountPercent / 100));
}

function stableShuffleScore(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 9973;
  }

  return hash;
}

export function PrivateUnlockMarketplace({ configs }: PrivateUnlockMarketplaceProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Featured");
  const [heroIndex, setHeroIndex] = useState(0);
  const categories = useMemo(() => ["All", "Featured", ...Array.from(new Set(configs.map((config) => config.category)))], [configs]);
  const featuredConfigs = useMemo(() => configs.filter((config) => config.featured), [configs]);
  const heroConfigs = featuredConfigs.length ? featuredConfigs : configs;
  const featured = heroConfigs[heroIndex % Math.max(1, heroConfigs.length)] ?? configs[0];
  const featuredUnlockPrice = featured ? unlockPrice(featured.deal.originalPrice, featured.discountPercent) : 0;
  const filteredConfigs = configs.filter((config) => {
    const matchesCategory = category === "All" || (category === "Featured" ? config.featured : config.category === category);
    const haystack = `${config.brandName} ${config.headline} ${config.category} ${config.shortDescription} ${config.deal.title}`.toLowerCase();
    return matchesCategory && haystack.includes(query.trim().toLowerCase());
  }).sort((first, second) => stableShuffleScore(first.id) - stableShuffleScore(second.id));

  useEffect(() => {
    if (heroConfigs.length <= 1) {
      return;
    }

    setHeroIndex(Math.floor(Math.random() * heroConfigs.length));
    const timer = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % heroConfigs.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [heroConfigs.length]);

  return (
    <main className="min-h-screen bg-[#f3faf7] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link href="/unlock-deals" className="text-xl font-semibold tracking-tight text-emerald-950">
            GruPin
          </Link>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Amazon, Zomato, Nykaa..."
              className="h-11 w-full rounded-[8px] border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium outline-none transition focus:border-cyan-500 focus:bg-white"
            />
          </div>
          <AccountMenu />
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-5">
        <div className="relative min-h-[420px] overflow-hidden rounded-[8px] bg-slate-950 text-white shadow-[0_24px_80px_rgba(8,47,73,0.18)] sm:min-h-[470px]">
          {featured ? (
            <>
              <img src={featured.bannerImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30 blur-2xl scale-110" />
              <div className="absolute inset-4 rounded-[8px] bg-white/8 ring-1 ring-white/10 sm:inset-8" />
              <img src={featured.bannerImage} alt="" className="absolute inset-0 h-full w-full object-contain p-8 sm:p-12" />
            </>
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/72 via-slate-950/28 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-slate-950/72 via-slate-950/18 to-transparent" />
          <div className="absolute right-5 top-5 hidden rounded-[8px] bg-white p-4 text-slate-950 shadow-[0_18px_50px_rgba(0,0,0,0.22)] sm:block">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-700">Limited room deal</p>
            <p className="mt-2 text-3xl font-semibold">{featured ? `${featured.discountPercent}%` : "40%"}</p>
            <p className="text-sm font-semibold text-slate-500">group unlock</p>
          </div>
          <div className="relative flex min-h-[420px] max-w-3xl flex-col justify-between p-6 sm:min-h-[470px] sm:p-8 lg:p-10">
            <div className="absolute inset-4 max-w-3xl rounded-[8px] bg-slate-950/22 backdrop-blur-[1px] sm:inset-6 lg:inset-8" />
            <div className="relative max-w-2xl">
              <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-cyan-300 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-950">
                <Sparkles className="h-3.5 w-3.5" />
                Featured voucher unlock
              </div>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
                Unlock {featured ? featured.brandName : "brand"} vouchers together.
              </h1>
            </div>
            <div className="relative">
              {featured ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  <div className="rounded-[8px] bg-white/12 px-3 py-2 ring-1 ring-white/15">
                    <p className="text-xs font-semibold text-white/60">Voucher value</p>
                    <p className="font-semibold">{formatPrice(featured.deal.originalPrice)}</p>
                  </div>
                  <div className="rounded-[8px] bg-lime-300 px-3 py-2 text-lime-950">
                    <p className="text-xs font-semibold text-lime-900/70">Unlock price</p>
                    <p className="font-semibold">{formatPrice(featuredUnlockPrice)}</p>
                  </div>
                  <div className="rounded-[8px] bg-white/12 px-3 py-2 ring-1 ring-white/15">
                    <p className="text-xs font-semibold text-white/60">Needs</p>
                    <p className="font-semibold">{featured.threshold} people</p>
                  </div>
                </div>
              ) : null}
              {featured ? (
                featured.isOutOfStock ? (
                  <span className="mt-6 inline-flex min-h-12 w-fit items-center justify-center rounded-[8px] bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">
                    Out of stock
                  </span>
                ) : (
                  <Link
                    href={`/private-unlock/${featured.dealId}`}
                    className="mt-6 inline-flex min-h-12 w-fit items-center justify-center gap-2 rounded-[8px] bg-rose-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-600"
                  >
                    Start this room
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )
              ) : null}
            </div>
          </div>
          {heroConfigs.length > 1 ? (
            <div className="absolute bottom-4 right-4 z-10 flex gap-1.5">
              {Array.from({ length: Math.min(8, heroConfigs.length) }).map((_, index) => (
                <span
                  key={index}
                  className={`h-1.5 rounded-full transition-all ${index === heroIndex % Math.min(8, heroConfigs.length) ? "w-6 bg-cyan-300" : "w-1.5 bg-white/45"}`}
                />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-5">
        <div className="rounded-[8px] border border-emerald-100 bg-white p-4 shadow-[0_14px_40px_rgba(15,118,110,0.07)] sm:p-5">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-700">How it works</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Your group unlock path</h2>
            </div>
            <p className="hidden max-w-sm text-sm font-medium text-slate-500 md:block">A private room gives your circle 48 hours to hit the target.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {[
              { icon: CreditCard, title: "Start a room", text: "Join with a ₹49 token, refundable if the deal does not unlock." },
              { icon: Share2, title: "Share link", text: "Invite your friends and family to join." },
              { icon: Users, title: "Hit target", text: "Fill the room before the 48-hour timer ends." },
              { icon: Trophy, title: "Claim voucher", text: "Pay the balance and receive your voucher." },
            ].map((step, index) => {
              const Icon = step.icon;

              return (
                <div key={step.title} className="relative overflow-hidden rounded-[8px] border border-slate-200 bg-slate-50 p-4">
                  {index < 3 ? <div className="absolute right-[-18px] top-1/2 hidden h-1 w-9 -translate-y-1/2 bg-cyan-300 md:block" /> : null}
                  <div className="flex items-center justify-between gap-3">
                    <div className={`grid h-10 w-10 place-items-center rounded-[8px] text-white ${index === 0 ? "bg-rose-500" : index === 1 ? "bg-cyan-600" : index === 2 ? "bg-emerald-600" : "bg-amber-500"}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">Step {index + 1}</span>
                  </div>
                  <p className="mt-4 font-semibold text-slate-950">{step.title}</p>
                  <p className="mt-1 text-sm leading-5 text-slate-500">{step.text}</p>
                </div>
              );
            })}
          </div>
          {/* <div className="mt-3 flex items-center gap-2 rounded-[8px] bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
            <Clock className="h-4 w-4" />
            The 48-hour timer starts only after a private unlock room is created.
          </div> */}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={`h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition ${
                category === item
                  ? "border-cyan-600 bg-cyan-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-cyan-300"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-700">Shop vouchers</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{category === "Featured" ? "Featured unlocks" : "Pick a voucher to unlock"}</h2>
          </div>
          <p className="hidden text-sm font-medium text-slate-500 sm:block">Start a room, invite your circle, unlock the reward.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filteredConfigs.map((config) => {
            const price = unlockPrice(config.deal.originalPrice, config.discountPercent);

            const cardContent = (
              <>
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  <img src={config.cardImage} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  <div className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-950 shadow-sm">
                    {config.category}
                  </div>
                  <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-rose-500 px-3 py-1 text-xs font-bold text-white">
                    <BadgePercent className="h-3.5 w-3.5" />
                    {config.discountPercent}% unlock
                  </div>
                  <div className="absolute bottom-3 right-3 rounded-full bg-amber-300 px-3 py-1 text-xs font-bold text-slate-950">
                    {config.isOutOfStock ? "Out of stock" : `${formatPrice(config.voucherValue ?? config.deal.originalPrice)} voucher`}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-cyan-700">{config.brandName}</p>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">Start a private room and unlock this voucher with your circle.</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-[8px] bg-cyan-50 p-3">
                      <p className="text-xs font-semibold text-slate-500">Needs</p>
                      <p className="mt-1 font-semibold text-slate-950">{config.threshold} people</p>
                    </div>
                    <div className="rounded-[8px] bg-amber-50 p-3">
                      <p className="text-xs font-semibold text-amber-700">Start with</p>
                      <p className="mt-1 font-semibold text-amber-950">{formatPrice(config.tokenAmount)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Unlock price</p>
                      <p className="text-xl font-semibold text-slate-950">{formatPrice(price)}</p>
                    </div>
                    <span className={`inline-flex h-10 items-center justify-center rounded-[8px] px-3 text-sm font-semibold text-white transition ${config.isOutOfStock ? "bg-slate-400" : "bg-slate-950 group-hover:bg-rose-500"}`}>
                      {config.isOutOfStock ? "Out of stock" : "Start room"}
                    </span>
                  </div>
                </div>
              </>
            );

            if (config.isOutOfStock) {
              return (
                <div
                  key={config.id}
                  className="group overflow-hidden rounded-[8px] border border-slate-200 bg-white opacity-75 shadow-[0_14px_40px_rgba(15,118,110,0.06)] transition"
                >
                  {cardContent}
                </div>
              );
            }

            return (
              <Link
                key={config.id}
                href={`/private-unlock/${config.dealId}`}
                className="group overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,118,110,0.06)] transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_18px_50px_rgba(15,118,110,0.12)]"
              >
                {cardContent}
              </Link>
            );
          })}
        </div>

        {!filteredConfigs.length ? (
          <div className="rounded-[8px] border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="font-semibold text-slate-950">No unlocks found</p>
            <p className="mt-1 text-sm text-slate-500">Try another category or search term.</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
