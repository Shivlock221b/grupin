"use client";

import Link from "next/link";
import { Check, CreditCard, Link2, Share2, ShoppingBag, Star, Users } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { BrandProduct } from "@/lib/types";
import { formatCatalogPrice, productDisplayPrice, productSavings, teamPriceForProduct } from "@/lib/product-pricing";
import { productImageUrl } from "@/lib/product-images";

type MarketplaceBrand = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  productCount: number;
};

const brandAccents = [
  "bg-rose-100 text-rose-700 ring-rose-200",
  "bg-cyan-100 text-cyan-800 ring-cyan-200",
  "bg-amber-100 text-amber-800 ring-amber-200",
  "bg-lime-100 text-lime-800 ring-lime-200",
  "bg-violet-100 text-violet-800 ring-violet-200",
  "bg-emerald-100 text-emerald-800 ring-emerald-200",
];

function brandInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("") || "G";
}

function formatCount(count?: number | null) {
  if (!count) {
    return "";
  }

  return count >= 1000 ? `${(count / 1000).toFixed(count >= 10_000 ? 0 : 1)}k` : count.toLocaleString("en-IN");
}

function isFaviconLogo(url?: string | null) {
  if (!url) {
    return false;
  }

  return /google\.com\/s2\/favicons|favicon|\/ip3\//i.test(url);
}

function MarketplaceProductCard({ product }: { product: BrandProduct }) {
  const price = productDisplayPrice(product);
  const teamPrice = teamPriceForProduct(product);
  const savings = productSavings(product);
  const href = `/team-price/${product.brand?.slug ?? "brand"}/${product.slug}`;

  return (
    <div className="overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,118,110,0.06)] transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_18px_50px_rgba(15,118,110,0.12)]">
      <Link href={href} className="block">
        <div className="relative aspect-square overflow-hidden bg-[#f7faf5]">
          <img src={productImageUrl(product.primaryImage, 700)} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain p-3 transition duration-300 hover:scale-105 sm:p-5" />
        </div>
      </Link>
      <div className="p-3 sm:p-4">
        <p className="mb-1 line-clamp-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700">
          {product.brand?.name ?? product.vendor ?? "GruPin"}
        </p>
        <Link href={href} className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-slate-950">
          {product.title}
        </Link>
        <div className="mt-2 flex min-h-7 flex-wrap items-center gap-2">
          {product.rating ? (
            <div className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-xs font-bold text-white">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span>{product.rating.toFixed(1)}</span>
              {product.ratingCount ? <span className="font-semibold text-white/80">({formatCount(product.ratingCount)})</span> : null}
            </div>
          ) : null}
          {product.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.04em] text-amber-900">
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-3 rounded-[12px] bg-slate-50 p-2.5 sm:p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-emerald-700">Team price</p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-xl font-semibold text-slate-950">{formatCatalogPrice(teamPrice)}</p>
                <p className="text-sm font-semibold text-slate-500">
                  MRP <span className="line-through decoration-rose-400 decoration-2">{formatCatalogPrice(price)}</span>
                </p>
              </div>
            </div>
            {savings ? (
              <div className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1.5 text-right text-xs font-black leading-tight text-rose-700">
                Save<br />{formatCatalogPrice(savings)}
              </div>
            ) : null}
          </div>
        </div>
        <Link href={href} className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-[10px] bg-rose-500 px-2 text-xs font-semibold text-white transition hover:bg-rose-600 sm:h-11 sm:px-3 sm:text-sm">
          Buy at Team Price
        </Link>
      </div>
    </div>
  );
}

function HeroAnimation() {
  const activity = [
    "A***5 added Cleanser",
    "M***8 added Serum",
    "S***1 joined room",
  ];

  return (
    <div className="relative overflow-hidden rounded-[18px] bg-[#ffe8ee] text-slate-950 shadow-[0_24px_80px_rgba(190,56,96,0.15)] ring-1 ring-rose-100">
      <style>{`
        @keyframes grupinPulseLine {
          0%, 12% { transform: scaleX(0); opacity: .35; }
          55%, 100% { transform: scaleX(1); opacity: 1; }
        }
        @keyframes grupinPhoneStep {
          0%, 15% { transform: translateY(16px) scale(.96); opacity: .3; }
          23%, 72% { transform: translateY(0) scale(1); opacity: 1; }
          85%, 100% { transform: translateY(-10px) scale(.98); opacity: .55; }
        }
        @keyframes grupinCartDrop {
          0%, 20% { transform: translate(-130px, -24px) rotate(-12deg); opacity: 0; }
          31%, 72% { transform: translate(0, 0) rotate(0); opacity: 1; }
          100% { transform: translate(72px, 10px) rotate(6deg); opacity: .25; }
        }
        @keyframes grupinMemberOne {
          0%, 30% { transform: translate(0, 34px) scale(.7); opacity: 0; }
          42%, 100% { transform: translate(0, 0) scale(1); opacity: 1; }
        }
        @keyframes grupinMemberTwo {
          0%, 38% { transform: translate(-30px, 28px) scale(.7); opacity: 0; }
          50%, 100% { transform: translate(0, 0) scale(1); opacity: 1; }
        }
        @keyframes grupinMemberThree {
          0%, 46% { transform: translate(30px, 28px) scale(.7); opacity: 0; }
          58%, 100% { transform: translate(0, 0) scale(1); opacity: 1; }
        }
        @keyframes grupinUnlock {
          0%, 56% { transform: scale(.72) rotate(-8deg); opacity: 0; }
          66%, 82% { transform: scale(1.08) rotate(3deg); opacity: 1; }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        @keyframes grupinCheckout {
          0%, 66% { transform: translateY(22px); opacity: 0; }
          76%, 100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes grupinRoomLink {
          0%, 34% { transform: translateX(-40px) scale(.75); opacity: 0; }
          46%, 68% { transform: translateX(0) scale(1); opacity: 1; }
          88%, 100% { transform: translateX(52px) scale(.82); opacity: 0; }
        }
        @keyframes grupinCartStackOne {
          0%, 28% { transform: translateY(18px) rotate(-5deg); opacity: 0; }
          38%, 100% { transform: translateY(0) rotate(-5deg); opacity: 1; }
        }
        @keyframes grupinCartStackTwo {
          0%, 42% { transform: translateY(18px) rotate(4deg); opacity: 0; }
          54%, 100% { transform: translateY(0) rotate(4deg); opacity: 1; }
        }
        @keyframes grupinCartStackThree {
          0%, 50% { transform: translateY(18px) rotate(-2deg); opacity: 0; }
          62%, 100% { transform: translateY(0) rotate(-2deg); opacity: 1; }
        }
        @keyframes grupinSavingsFill {
          0%, 54% { transform: scaleX(.18); }
          72%, 100% { transform: scaleX(1); }
        }
        @keyframes grupinActivity {
          0%, 30% { transform: translateY(12px); opacity: 0; }
          40%, 86% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-8px); opacity: .45; }
        }
        @keyframes grupinConfetti {
          0%, 58% { transform: translateY(-8px) rotate(0); opacity: 0; }
          70% { opacity: 1; }
          100% { transform: translateY(62px) rotate(160deg); opacity: 0; }
        }
        @keyframes grupinFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes grupinScan {
          0% { transform: translateX(-25%); opacity: .25; }
          50% { opacity: .7; }
          100% { transform: translateX(125%); opacity: .25; }
        }
        @keyframes grupinMobileSceneOne {
          0%, 16% { opacity: 1; transform: translateY(0) scale(1); }
          22%, 100% { opacity: 0; transform: translateY(-10px) scale(.98); }
        }
        @keyframes grupinMobileSceneTwo {
          0%, 18% { opacity: 0; transform: translateY(12px) scale(.98); }
          24%, 36% { opacity: 1; transform: translateY(0) scale(1); }
          42%, 100% { opacity: 0; transform: translateY(-10px) scale(.98); }
        }
        @keyframes grupinMobileSceneThree {
          0%, 38% { opacity: 0; transform: translateY(12px) scale(.98); }
          44%, 56% { opacity: 1; transform: translateY(0) scale(1); }
          62%, 100% { opacity: 0; transform: translateY(-10px) scale(.98); }
        }
        @keyframes grupinMobileSceneFour {
          0%, 58% { opacity: 0; transform: translateY(12px) scale(.98); }
          64%, 76% { opacity: 1; transform: translateY(0) scale(1); }
          82%, 100% { opacity: 0; transform: translateY(-10px) scale(.98); }
        }
        @keyframes grupinMobileSceneFive {
          0%, 78% { opacity: 0; transform: translateY(12px) scale(.98); }
          84%, 96% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-8px) scale(.98); }
        }
        @keyframes grupinMobileProgress {
          0%, 16% { transform: scaleX(.18); }
          24%, 36% { transform: scaleX(.38); }
          44%, 56% { transform: scaleX(.62); }
          64%, 76% { transform: scaleX(.82); }
          84%, 100% { transform: scaleX(1); }
        }
        @keyframes grupinMobileCartPop {
          0%, 24% { transform: translateY(10px) scale(.9); opacity: 0; }
          30%, 100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        .grupin-sequence-line { transform-origin: left; animation: grupinPulseLine 7.2s ease-in-out infinite; }
        .grupin-phone { animation: grupinPhoneStep 7.2s ease-in-out infinite; }
        .grupin-cart { animation: grupinCartDrop 7.2s ease-in-out infinite; }
        .grupin-member-1 { animation: grupinMemberOne 7.2s ease-in-out infinite; }
        .grupin-member-2 { animation: grupinMemberTwo 7.2s ease-in-out infinite; }
        .grupin-member-3 { animation: grupinMemberThree 7.2s ease-in-out infinite; }
        .grupin-unlock { animation: grupinUnlock 7.2s ease-in-out infinite; }
        .grupin-checkout { animation: grupinCheckout 7.2s ease-in-out infinite; }
        .grupin-room-link { animation: grupinRoomLink 7.2s ease-in-out infinite; }
        .grupin-stack-1 { animation: grupinCartStackOne 7.2s ease-in-out infinite; }
        .grupin-stack-2 { animation: grupinCartStackTwo 7.2s ease-in-out infinite; }
        .grupin-stack-3 { animation: grupinCartStackThree 7.2s ease-in-out infinite; }
        .grupin-savings-fill { transform-origin: left; animation: grupinSavingsFill 7.2s ease-in-out infinite; }
        .grupin-activity { animation: grupinActivity 7.2s ease-in-out infinite; }
        .grupin-confetti { animation: grupinConfetti 7.2s ease-in-out infinite; }
        .grupin-float { animation: grupinFloat 3.6s ease-in-out infinite; }
        .grupin-scan { animation: grupinScan 3s ease-in-out infinite; }
        .grupin-mobile-scene-1 { animation: grupinMobileSceneOne 12s ease-in-out infinite; }
        .grupin-mobile-scene-2 { animation: grupinMobileSceneTwo 12s ease-in-out infinite; }
        .grupin-mobile-scene-3 { animation: grupinMobileSceneThree 12s ease-in-out infinite; }
        .grupin-mobile-scene-4 { animation: grupinMobileSceneFour 12s ease-in-out infinite; }
        .grupin-mobile-scene-5 { animation: grupinMobileSceneFive 12s ease-in-out infinite; }
        .grupin-mobile-progress { transform-origin: left; animation: grupinMobileProgress 12s ease-in-out infinite; }
        .grupin-mobile-cart-pop { animation: grupinMobileCartPop 12s ease-in-out infinite; }
      `}</style>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),transparent_34%),radial-gradient(circle_at_80%_18%,rgba(201,240,69,0.34),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(244,63,94,0.24),transparent_38%)]" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/70 to-transparent" />

      <div className="relative p-3 sm:p-5">
        <div className="relative min-h-[410px] overflow-hidden rounded-[18px] border border-white/80 bg-white/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur sm:hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.80),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(244,63,94,0.18),transparent_36%)]" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-600">GruPin</p>
              <p className="mt-1 text-lg font-semibold">Shop together. Pay less.</p>
            </div>
            <div className="rounded-full bg-lime-300 px-3 py-1.5 text-xs font-semibold text-lime-950 ring-1 ring-lime-400/40">Team Price</div>
          </div>

          <div className="absolute left-4 right-4 top-[88px] z-10 h-1.5 overflow-hidden rounded-full bg-rose-100">
            <div className="grupin-mobile-progress h-full rounded-full bg-rose-500" />
          </div>

          <div className="grupin-mobile-scene-1 absolute inset-x-4 top-[118px] rounded-[20px] bg-white p-4 text-slate-950 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-600">Pick a brand</p>
                <h3 className="mt-1 text-xl font-semibold">Enter a Team Room</h3>
                <p className="mt-2 text-sm font-semibold leading-5 text-slate-500">One tap opens the brand deal.</p>
              </div>
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose-100 text-rose-700">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {["LP", "C", "F"].map((brand) => (
                <div key={brand} className="rounded-[18px] bg-[#fff7f8] p-3 text-center shadow-sm">
                  <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-white text-sm font-semibold text-rose-700 ring-1 ring-rose-100">{brand}</div>
                  <div className="mt-2 h-1.5 rounded-full bg-rose-100" />
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-[14px] bg-rose-500 px-3 py-2 text-center text-sm font-semibold text-white">Buy at Team Price</div>
          </div>

          <div className="grupin-mobile-scene-2 absolute inset-x-4 top-[118px] rounded-[20px] bg-white p-4 text-slate-950 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-lime-700">Add to cart</p>
                <h3 className="mt-1 text-xl font-semibold">Choose products</h3>
                <p className="mt-2 text-sm font-semibold leading-5 text-slate-500">Shade, size, quantity. Done.</p>
              </div>
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lime-100 text-lime-800">
                <ShoppingBag className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3 rounded-[18px] bg-[#f7faf5] p-3">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[16px] bg-white text-lime-800 shadow-sm">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">Serum Foundation</p>
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <span className="font-semibold text-slate-950">₹749</span>
                  <span className="text-xs font-semibold text-slate-400 line-through">₹999</span>
                </div>
              </div>
              <div className="grupin-mobile-cart-pop rounded-full bg-lime-300 px-3 py-1.5 text-xs font-black text-lime-950">Added</div>
            </div>
          </div>

          <div className="grupin-mobile-scene-3 absolute inset-x-4 top-[118px] rounded-[20px] bg-white p-4 text-slate-950 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-700">Share</p>
                <h3 className="mt-1 text-xl font-semibold">Share the room</h3>
                <p className="mt-2 text-sm font-semibold leading-5 text-slate-500">More members make the deal real.</p>
              </div>
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose-100 text-rose-700">
                <Share2 className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-5 rounded-[18px] bg-rose-50 p-3">
              <div className="flex items-center justify-between rounded-full bg-white px-3 py-2 shadow-sm">
                <span className="text-xs font-semibold text-slate-500">grupin.shop/r/WAQJ5B</span>
                <Link2 className="h-4 w-4 text-rose-500" />
              </div>
              <div className="mt-4 flex justify-center -space-x-2">
                {["A", "M", "S"].map((name) => (
                  <span key={name} className="grid h-11 w-11 place-items-center rounded-full border-2 border-white bg-slate-950 text-sm font-semibold text-white shadow-sm">{name}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="grupin-mobile-scene-4 absolute inset-x-4 top-[118px] rounded-[20px] bg-lime-300 p-4 text-lime-950 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-lime-900/65">Unlock</p>
                <h3 className="mt-1 text-2xl font-semibold">Team Price unlocks</h3>
                <p className="mt-2 text-sm font-semibold leading-5 text-lime-900/70">First checkouts get the deal.</p>
              </div>
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-lime-800">
                <Check className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {[1, 2, 3].map((slot) => (
                <div key={slot} className="rounded-[16px] bg-white p-3 text-center shadow-sm">
                  <Check className="mx-auto h-5 w-5" />
                  <p className="mt-1 text-xs font-black">Member {slot}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-full bg-lime-950 px-4 py-2 text-center text-sm font-semibold text-white">Team saved ₹1,240</div>
          </div>

          <div className="grupin-mobile-scene-5 absolute inset-x-4 top-[118px] rounded-[20px] bg-white p-4 text-slate-950 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Checkout</p>
                <h3 className="mt-1 text-xl font-semibold">Pay Team Price</h3>
                <p className="mt-2 text-sm font-semibold leading-5 text-slate-500">Complete purchase before slots close.</p>
              </div>
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
                <CreditCard className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-5 space-y-2 rounded-[18px] bg-slate-50 p-3">
              {["A***5 checked out", "M***8 checked out", "Your slot is ready"].map((item) => (
                <div key={item} className="flex items-center justify-between rounded-full bg-white px-3 py-2 text-sm font-semibold shadow-sm">
                  <span>{item}</span>
                  <Check className="h-4 w-4 text-emerald-600" />
                </div>
              ))}
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map((dot) => (
              <span key={dot} className="h-1.5 w-6 rounded-full bg-white/25" />
            ))}
          </div>
        </div>

        <div className="relative hidden min-h-[460px] overflow-hidden rounded-[18px] border border-white/80 bg-white/60 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur sm:block">
          <div className="pointer-events-none absolute inset-0 opacity-70">
            {[16, 34, 58, 82].map((left, index) => (
              <span
                key={left}
                className="grupin-confetti absolute top-10 h-2.5 w-2.5 rounded-[3px] bg-lime-300"
                style={{ left: `${left}%`, animationDelay: `${index * 130}ms` }}
              />
            ))}
            {[24, 46, 72].map((left, index) => (
              <span
                key={left}
                className="grupin-confetti absolute top-16 h-2 w-4 rounded-full bg-rose-300"
                style={{ left: `${left}%`, animationDelay: `${index * 180 + 80}ms` }}
              />
            ))}
          </div>
          <div className="absolute left-8 right-8 top-[48%] h-1 rounded-full bg-white/12">
            <div className="grupin-sequence-line h-full rounded-full bg-lime-300" />
          </div>

          <div className="grupin-phone absolute left-1/2 top-8 h-52 w-32 -translate-x-1/2 rounded-[30px] border-[6px] border-white/80 bg-slate-950/60 shadow-[0_20px_60px_rgba(0,0,0,0.32)] sm:top-10 sm:h-60 sm:w-36">
            <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-white/35" />
            <div className="mx-3 mt-5 overflow-hidden rounded-[18px] bg-white p-3 text-slate-950">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-black text-rose-700">Team Room</span>
                <span className="text-[10px] font-bold text-slate-400">23:42</span>
              </div>
              <div className="mt-4 h-16 rounded-[14px] bg-[#f7faf5]">
                <div className="grupin-scan h-full w-1/2 rounded-[14px] bg-gradient-to-r from-transparent via-lime-200 to-transparent" />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 rounded-[12px] bg-slate-50 px-2 py-1.5">
                <span className="text-[10px] font-bold text-slate-500">MRP ₹999</span>
                <span className="rounded-full bg-lime-300 px-2 py-1 text-[10px] font-black text-lime-950">Team ₹749</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-100" />
              <div className="mt-2 h-2 w-2/3 rounded-full bg-slate-100" />
              <div className="mt-4 rounded-[12px] bg-rose-500 px-3 py-2 text-center text-xs font-semibold text-white">Add to Cart</div>
            </div>
          </div>

          <div className="grupin-room-link absolute left-[17%] top-[18%] hidden items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-950 shadow-xl sm:flex">
            <Share2 className="h-4 w-4 text-cyan-700" />
            Link shared
            <Link2 className="h-3.5 w-3.5 text-slate-400" />
          </div>

          <div className="grupin-cart absolute left-[8%] top-[32%] rounded-[18px] bg-white p-3 text-slate-950 shadow-xl sm:left-[13%]">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-[12px] bg-lime-100 text-lime-800">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500">Cart added</p>
                <p className="text-sm font-semibold">You save ₹250</p>
              </div>
            </div>
          </div>

          <div className="absolute right-[6%] top-[26%] grid gap-2 sm:right-[10%]">
            <div className="grupin-member-1 flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-2 text-cyan-900 shadow-lg">
              <Users className="h-4 w-4" />
              <span className="text-xs font-black">A***5</span>
            </div>
            <div className="grupin-member-2 flex items-center gap-2 rounded-full bg-lime-300 px-3 py-2 text-lime-950 shadow-lg">
              <ShoppingBag className="h-4 w-4" />
              <span className="text-xs font-black">2 items</span>
            </div>
            <div className="grupin-member-3 flex items-center gap-2 rounded-full bg-rose-100 px-3 py-2 text-rose-800 shadow-lg">
              <Users className="h-4 w-4" />
              <span className="text-xs font-black">M***8</span>
            </div>
          </div>

          <div className="absolute bottom-36 left-5 hidden w-44 sm:block">
            <div className="grupin-stack-1 rounded-[16px] bg-white p-3 text-slate-950 shadow-xl">
              <p className="text-xs font-bold text-slate-500">A***5 cart</p>
              <p className="mt-1 text-sm font-semibold">Cleanser + Serum</p>
            </div>
            <div className="grupin-stack-2 -mt-3 ml-5 rounded-[16px] bg-lime-100 p-3 text-lime-950 shadow-xl">
              <p className="text-xs font-bold text-lime-800/70">M***8 cart</p>
              <p className="mt-1 text-sm font-semibold">Foundation</p>
            </div>
            <div className="grupin-stack-3 -mt-3 ml-10 rounded-[16px] bg-rose-100 p-3 text-rose-900 shadow-xl">
              <p className="text-xs font-bold text-rose-700/70">S***1 cart</p>
              <p className="mt-1 text-sm font-semibold">Moisturizer</p>
            </div>
          </div>

          <div className="grupin-unlock absolute bottom-28 left-1/2 w-56 -translate-x-1/2 rounded-[20px] bg-lime-300 p-4 text-center text-lime-950 shadow-[0_20px_60px_rgba(201,240,69,0.28)]">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-lime-900/70">Unlocked</p>
            <p className="mt-1 text-2xl font-semibold">Team Price</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-lime-100">
              <div className="grupin-savings-fill h-full rounded-full bg-rose-500" />
            </div>
            <p className="mt-2 text-xs font-bold text-lime-900/70">Team saved ₹1,240</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              {[1, 2, 3].map((slot) => (
                <span key={slot} className="grid h-7 w-7 place-items-center rounded-full bg-white text-xs font-black text-lime-950">
                  <Check className="h-4 w-4" />
                </span>
              ))}
            </div>
          </div>

          <div className="grupin-checkout absolute bottom-5 left-5 right-5 rounded-[18px] bg-white p-3 text-slate-950 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-500">Checkout slots</p>
                <p className="text-sm font-semibold">First 3 complete purchase</p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white">
                <CreditCard className="h-3.5 w-3.5" />
                Complete Purchase
              </div>
            </div>
          </div>

          <div className="grupin-float absolute right-5 top-5 rounded-[16px] bg-white/85 px-3 py-2 text-xs font-semibold text-slate-950 shadow-lg ring-1 ring-rose-100">
            <p className="text-slate-500">Activity</p>
            <div className="grupin-activity mt-1 space-y-1">
              {activity.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type ProductMarketplaceHomeProps = {
  brands: MarketplaceBrand[];
  products: BrandProduct[];
};

export function ProductMarketplaceHome({ brands, products }: ProductMarketplaceHomeProps) {
  return (
    <main className="min-h-screen bg-[#fbfcf8] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="text-xl font-semibold tracking-tight text-emerald-950">GruPin</Link>
          <AccountMenu />
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-4 sm:py-5">
        <HeroAnimation />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-3">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">Brand catalogs</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Pick a brand to start</h2>
          </div>
        </div>
        <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-3">
          {brands.map((brand, index) => (
            <Link key={brand.id} href={`/catalog/${brand.slug}`} className="w-28 shrink-0 text-center">
              <div className={`mx-auto grid h-20 w-20 place-items-center overflow-hidden rounded-full text-2xl font-semibold ring-1 ${brand.logoUrl ? "bg-white text-slate-900 ring-slate-200" : brandAccents[index % brandAccents.length]}`}>
                {brand.logoUrl ? (
                  <img
                    src={brand.logoUrl}
                    alt={`${brand.name} logo`}
                    loading="lazy"
                    decoding="async"
                    className={isFaviconLogo(brand.logoUrl) ? "h-11 w-11 object-contain" : "h-full w-full object-contain p-3"}
                  />
                ) : (
                  brandInitials(brand.name)
                )}
              </div>
              <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-slate-950">{brand.name}</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">{brand.productCount}+ products</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 pb-14">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">Trending products</p>
            {/* <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Random picks from Team Price catalogs</h2> */}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {products.map((product) => (
            <MarketplaceProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </main>
  );
}
