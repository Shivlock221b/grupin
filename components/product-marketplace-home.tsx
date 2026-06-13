"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Copy, ExternalLink, Filter, Link2, Loader2, Search, Share2, ShoppingBag, Sparkles, Star, TrendingUp, Users, X } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { productCategoryOptions } from "@/lib/product-category-inference";
import { TrendingProductPool } from "@/lib/types";
import { formatCatalogPrice } from "@/lib/product-pricing";
import { productImageUrl } from "@/lib/product-images";

type ProductMarketplaceHomeProps = {
  pools: TrendingProductPool[];
  selectedCategory?: string | null;
  selectedTime?: "all" | "today" | "week" | "new";
  nextPage?: number;
  hasMore?: boolean;
};

const categoryOptions = [...productCategoryOptions];
const timeOptions = [
  { label: "All time", value: "all" },
  { label: "Today", value: "today" },
  { label: "This week", value: "week" },
  { label: "Newly Added", value: "new" },
] as const;
const homeInstructionSteps = ["Search a Nykaa product", "Join its product pool for free", "Get notified at 20% off unlock"];
const sheetInstructionSteps = [
  "Join the product pool for free.",
  "The target price is 20% lower than Nykaa.",
  "We notify you when the pool unlocks.",
];
type NykaaSearchResult = {
  id: string;
  title: string;
  url: string;
  imageUrl: string | null;
  mrp: number | null;
  salePrice: number | null;
  rating: number | null;
  ratingCount: number | null;
};

function poolCta(pool: TrendingProductPool) {
  if (pool.status === "closed") return "Closed";
  if (pool.status === "expired") return "Expired";
  if (pool.userHasJoined) return "View Cart";
  return "Join Pool";
}

function Progress({ value, tone = "rose" }: { value: number; tone?: "rose" | "emerald" }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${tone === "emerald" ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

function formatCount(count?: number | null) {
  if (!count) return "";
  return count >= 1000 ? `${(count / 1000).toFixed(count >= 10_000 ? 0 : 1)}k` : count.toLocaleString("en-IN");
}

function poolDisplayValues(pool: TrendingProductPool) {
  const product = pool.product;
  const price = pool.currentMarketPrice ?? product.salePrice ?? product.mrp ?? product.priceMin;
  const targetPrice = pool.unlockPrice ?? (price ? Math.round(Number(price) * 0.8) : null);
  const productUrl = product.productUrl ?? product.sourceUrl ?? product.canonicalUrl ?? "";

  return { price, targetPrice, productUrl };
}

function filterHref(category: string | null, time: string, page?: number) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (time !== "all") params.set("time", time);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function LogoMark() {
  return (
    <Link href="/" aria-label="Home" className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-slate-200 transition hover:ring-cyan-200">
      <img src="/icon.svg" alt="" className="h-8 w-8" />
    </Link>
  );
}

function InstructionMarquee({ steps, compact = false }: { steps: string[]; compact?: boolean }) {
  return (
    <div className="min-w-0 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <style>{`
        @keyframes instructionMarquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .instruction-marquee-track {
          animation: instructionMarquee 18s linear infinite;
        }
        .instruction-marquee-track:hover {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .instruction-marquee-track {
            animation: none;
          }
        }
      `}</style>
      <div className="instruction-marquee-track flex w-max max-w-none gap-3 py-1">
        {[...steps, ...steps].map((step, index) => (
          <div
            key={`${step}-${index}`}
            className={`flex shrink-0 items-center gap-3 rounded-[16px] bg-white/80 ${compact ? "w-64 p-3" : "w-72 p-4"}`}
          >
            <div className={`${compact ? "h-8 w-8" : "h-10 w-10"} flex shrink-0 items-center justify-center rounded-full bg-rose-500 text-sm font-semibold text-white`}>
              {(index % steps.length) + 1}
            </div>
            <p className={`${compact ? "text-xs leading-4" : "text-sm"} font-semibold text-slate-800`}>{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendingPoolCard({ pool, onOpenShare }: { pool: TrendingProductPool; onOpenShare: (pool: TrendingProductPool) => void }) {
  const router = useRouter();
  const product = pool.product;
  const { price, targetPrice, productUrl } = poolDisplayValues(pool);
  const remainingToUnlock = Math.max(0, pool.unlockThreshold - pool.currentJoinCount);
  const poolProgress = Math.min(100, Math.round((pool.currentJoinCount / Math.max(1, pool.unlockThreshold)) * 100));
  const disabled = pool.status === "closed" || pool.status === "expired";

  function act() {
    if (disabled) return;
    if (pool.userHasJoined) {
      router.push("/cart");
      return;
    }

    onOpenShare(pool);
  }

  return (
    <article className="group overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,118,110,0.06)] transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_18px_50px_rgba(15,118,110,0.12)]">
      <button type="button" onClick={() => onOpenShare(pool)} className="relative block aspect-square w-full overflow-hidden bg-[#f7faf5] text-left">
        <img src={productImageUrl(product.primaryImage, 700)} alt="" className="h-full w-full object-contain p-3 transition duration-300 group-hover:scale-105 sm:p-5" loading="lazy" />
        {productUrl ? (
          <span className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm">
            <ExternalLink className="h-4 w-4" />
          </span>
        ) : null}
      </button>
      <div className="p-3 sm:p-4">
        <div className="min-w-0">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="line-clamp-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700">{product.brand?.name ?? product.vendor ?? "Product"}</p>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800">
              <TrendingUp className="h-3 w-3" />
              Pooling
            </span>
          </div>
          <button type="button" onClick={() => onOpenShare(pool)} className="line-clamp-2 min-h-10 text-left text-sm font-semibold leading-5 text-slate-950">
            {product.title}
          </button>
        </div>

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
              <p className="text-xs font-semibold text-emerald-700">Target price</p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-xl font-semibold text-slate-950">{formatCatalogPrice(targetPrice ? Math.round(Number(targetPrice)) : null)}</p>
                {price ? <p className="text-xs font-semibold text-slate-500">Nykaa {formatCatalogPrice(Math.round(Number(price)))}</p> : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenShare(pool)}
              aria-label="Share product"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-cyan-50 hover:text-cyan-800 hover:ring-cyan-200"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>{pool.currentJoinCount}/{pool.unlockThreshold} joined</span>
            <span>{remainingToUnlock ? `${remainingToUnlock} left` : "Unlocked"}</span>
          </div>
          <Progress value={poolProgress} tone="emerald" />
        </div>

        <button
          type="button"
          onClick={act}
          disabled={disabled}
          className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-rose-500 px-2 text-xs font-semibold text-white transition hover:bg-rose-600 disabled:bg-slate-200 disabled:text-slate-500 sm:h-11 sm:px-3 sm:text-sm"
        >
          {pool.userHasJoined ? <ShoppingBag className="h-4 w-4" /> : <Users className="h-4 w-4" />}
          {poolCta(pool)}
        </button>
      </div>
    </article>
  );
}

function PoolShareSheet({ pool, onClose, onOpenPool }: { pool: TrendingProductPool; onClose: () => void; onOpenPool: (pool: TrendingProductPool) => void }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [alternativeUrl, setAlternativeUrl] = useState("");
  const [alternativeSearch, setAlternativeSearch] = useState("");
  const [alternativeSearchBusy, setAlternativeSearchBusy] = useState(false);
  const [showAlternativePasteLink, setShowAlternativePasteLink] = useState(false);
  const [alternativeBusy, setAlternativeBusy] = useState(false);
  const [alternativeMessage, setAlternativeMessage] = useState("");
  const [alternativeResults, setAlternativeResults] = useState<NykaaSearchResult[]>([]);
  const product = pool.product;
  const { price, targetPrice, productUrl } = poolDisplayValues(pool);
  const remainingToUnlock = Math.max(0, pool.unlockThreshold - pool.currentJoinCount);
  const poolProgress = Math.min(100, Math.round((pool.currentJoinCount / Math.max(1, pool.unlockThreshold)) * 100));
  const disabled = pool.status === "closed" || pool.status === "expired";
  const shareUrl = typeof window === "undefined" ? `/?pool=${pool.id}` : `${window.location.origin}/?pool=${pool.id}`;
  const shareText = `Join this product pool for ${product.title}. It unlocks when enough people join.`;

  useEffect(() => {
    setAlternativeResults([]);
    setAlternativeSearch("");
    setAlternativeUrl("");
    setShowAlternativePasteLink(false);
    setAlternativeMessage("");
  }, [pool.id]);

  async function searchAlternativeProducts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = alternativeSearch.trim();
    if (query.length < 2) {
      setError("Type a product name to search.");
      return;
    }

    setAlternativeSearchBusy(true);
    setAlternativeMessage("");
    setError("");
    try {
      const response = await fetch(`/api/nykaa/search?q=${encodeURIComponent(query)}&limit=6`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Could not search Nykaa.");
      setAlternativeResults(Array.isArray(payload.results) ? payload.results : []);
      if (!payload.results?.length) {
        setError("No Nykaa products found. Try pasting the product link instead.");
      }
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Could not search Nykaa.");
    } finally {
      setAlternativeSearchBusy(false);
    }
  }

  async function addAlternativeFromUrl(productUrl: string) {
    setAlternativeBusy(true);
    setAlternativeMessage("");
    setError("");
    try {
      const response = await fetch(`/api/product-pools/${pool.id}/alternatives/from-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: productUrl }),
      });
      const payload = await response.json();
      if (!response.ok) {
        if (response.status === 401) router.push(`/login?next=${encodeURIComponent(`/?pool=${pool.id}`)}`);
        throw new Error(payload.message ?? "Could not add alternative.");
      }
      setAlternativeUrl("");
      setAlternativeResults([]);
      setAlternativeMessage("Alternative added.");
      router.refresh();
    } catch (alternativeError) {
      setError(alternativeError instanceof Error ? alternativeError.message : "Could not add alternative.");
    } finally {
      setAlternativeBusy(false);
    }
  }

  async function addAlternativeFromLink() {
    await addAlternativeFromUrl(alternativeUrl);
  }

  async function sharePool() {
    setCopied(false);
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: product.title, text: shareText, url: shareUrl });
        return;
      } catch {
        // Fall back to copy if native share is cancelled or unavailable.
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      return;
    }

    setError("Could not copy the product link in this browser.");
  }

  function addToCart() {
    if (disabled) return;
    if (pool.userHasJoined) {
      router.push("/cart");
      return;
    }

    startTransition(async () => {
      setError("");
      const response = await fetch(`/api/product-pools/${pool.id}/join`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.message ?? "Could not add this product.");
        if (response.status === 401) router.push(`/login?next=${encodeURIComponent(`/?pool=${pool.id}`)}`);
        return;
      }
      router.push("/cart");
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-3 pb-3 pt-12 backdrop-blur-sm sm:px-5 sm:pb-5">
      <button type="button" aria-label="Close share popup" className="absolute inset-0 cursor-default" onClick={onClose} />
      <section className="relative max-h-[88vh] w-full max-w-xl overflow-hidden rounded-t-[24px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)] sm:rounded-[24px]">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">Product pool</p>
            <h3 className="text-lg font-semibold tracking-tight text-slate-950">Join to unlock 20% off</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(88vh-70px)] overflow-y-auto px-4 py-4 sm:px-5">
          <div className="flex gap-3">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[16px] bg-[#f7faf5] sm:h-28 sm:w-28">
              <img src={productImageUrl(product.primaryImage, 700)} alt="" className="h-full w-full object-contain p-2" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-700">{product.brand?.name ?? product.vendor ?? "Product"}</p>
              <div className="mt-1 flex items-start gap-2">
                <h4 className="line-clamp-3 min-w-0 flex-1 text-base font-semibold leading-5 text-slate-950">{product.title}</h4>
                {productUrl ? (
                  <a
                    href={productUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open product on website"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-cyan-50 hover:text-cyan-800"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {formatCount(pool.currentJoinCount)} joined
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[16px] bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-emerald-700">Target price</p>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="text-2xl font-semibold text-slate-950">{formatCatalogPrice(targetPrice ? Math.round(Number(targetPrice)) : null)}</p>
                  {price ? <p className="text-sm font-semibold text-slate-500">Nykaa {formatCatalogPrice(Math.round(Number(price)))}</p> : null}
                </div>
              </div>
              <button
                type="button"
                onClick={sharePool}
                aria-label="Share product"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-cyan-50 hover:text-cyan-800 hover:ring-cyan-200"
              >
                {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-[16px] border border-slate-200 p-3">
            <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
              <span>{remainingToUnlock ? `${remainingToUnlock} more members to unlock` : "Target price unlocked"}</span>
              <span>{pool.currentJoinCount} / {pool.unlockThreshold}</span>
            </div>
            <div className="mt-2">
              <Progress value={poolProgress} tone="emerald" />
            </div>
          </div>

          {false ? (
          <div className="mt-4 rounded-[16px] border border-slate-200 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-950">Alternatives people suggest</h4>
                {/* <p className="text-xs font-medium text-slate-500">Add a similar product without adding it to your cart.</p> */}
              </div>
            </div>

            {pool.alternatives?.length ? (
              <div className="-mx-3 mt-3 flex gap-2 overflow-x-auto px-3 pb-1">
                {pool.alternatives?.slice(0, 8).map((alternative) => {
                  const alternativeProduct = alternative.product;
                  const alternativeValues = poolDisplayValues(alternative);
                  return (
                    <button
                      key={alternative.id}
                      type="button"
                      onClick={() => {
                        onOpenPool(alternative);
                        router.replace(`/?pool=${alternative.id}`, { scroll: false });
                      }}
                      className="w-36 shrink-0 overflow-hidden rounded-[12px] bg-slate-50 text-left transition hover:bg-cyan-50 sm:w-40"
                    >
                      <div className="aspect-square bg-white">
                        <img src={productImageUrl(alternativeProduct.primaryImage, 500)} alt="" className="h-full w-full object-contain p-2" loading="lazy" />
                      </div>
                      <div className="p-2">
                        <p className="line-clamp-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-cyan-700">{alternativeProduct.brand?.name ?? alternativeProduct.vendor ?? "Product"}</p>
                        <p className="mt-1 line-clamp-2 min-h-8 text-xs font-semibold leading-4 text-slate-900">{alternativeProduct.title}</p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-950">{formatCatalogPrice(alternativeValues.price ? Math.round(Number(alternativeValues.price)) : null)}</span>
                          <span className="text-[10px] font-semibold text-emerald-700">{formatCount(alternative.currentJoinCount)} joined</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 rounded-[12px] bg-slate-50 px-3 py-2 text-sm font-medium text-slate-500">No alternatives yet. Add one if you know a better match.</p>
            )}

            <div className="mt-3 space-y-2">
              <form onSubmit={searchAlternativeProducts} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <label className="flex h-11 items-center gap-2 rounded-[12px] bg-white px-3 ring-1 ring-slate-200 focus-within:ring-cyan-300">
                  <Search className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    value={alternativeSearch}
                    onChange={(event) => setAlternativeSearch(event.target.value)}
                    placeholder="Search Nykaa alternatives"
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </label>
                <button
                  disabled={alternativeSearchBusy || alternativeSearch.trim().length < 2}
                  className="h-11 w-full rounded-[12px] bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-500 sm:w-auto"
                >
                  {alternativeSearchBusy ? "Searching..." : "Search"}
                </button>
              </form>
              {alternativeResults.length ? (
                <div className="max-h-52 space-y-2 overflow-y-auto rounded-[12px] border border-slate-100 bg-white p-2">
                  {alternativeResults.map((result) => {
                    const resultPrice = result.salePrice ?? result.mrp;
                    return (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => addAlternativeFromUrl(result.url)}
                        disabled={alternativeBusy}
                        className="flex w-full items-center gap-3 rounded-[10px] p-2 text-left transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[8px] bg-slate-50">
                          {result.imageUrl ? <img src={productImageUrl(result.imageUrl, 300)} alt="" className="h-full w-full object-contain p-1" /> : <ShoppingBag className="h-4 w-4 text-slate-300" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block line-clamp-2 text-sm font-semibold leading-5 text-slate-900">{result.title}</span>
                          {resultPrice ? <span className="mt-1 block text-xs font-semibold text-slate-500">{formatCatalogPrice(resultPrice)}</span> : null}
                        </span>
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{alternativeBusy ? "Adding" : "Add"}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => setShowAlternativePasteLink((current) => !current)}
                className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-50"
              >
                <Link2 className="h-3.5 w-3.5" />
                {showAlternativePasteLink ? "Hide link paste" : "Paste a Nykaa link to start a discount Pool"}
              </button>
              {showAlternativePasteLink ? (
                <div className="grid gap-2 rounded-[14px] bg-slate-50 p-2 sm:grid-cols-[1fr_auto]">
                  <label className="flex h-11 items-center gap-2 rounded-[12px] bg-white px-3 ring-1 ring-slate-100 focus-within:ring-cyan-300">
                    <Link2 className="h-4 w-4 shrink-0 text-cyan-700" />
                    <input
                      value={alternativeUrl}
                      onChange={(event) => setAlternativeUrl(event.target.value)}
                      placeholder="Paste Nykaa alternative link"
                      className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={addAlternativeFromLink}
                    disabled={alternativeBusy || !alternativeUrl.trim()}
                    className="h-11 rounded-[12px] bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-500"
                  >
                    {alternativeBusy ? "Adding..." : "Add"}
                  </button>
                </div>
              ) : null}
              {alternativeMessage ? <p className="rounded-[10px] bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{alternativeMessage}</p> : null}
            </div>
          </div>
          ) : null}

          <div className="mt-4 rounded-[16px] bg-[#fff6f8] px-2 py-2">
            <InstructionMarquee steps={sheetInstructionSteps} compact />
          </div>

          {error ? <p className="mt-3 rounded-[10px] bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}

        <div className="sticky bottom-0 -mx-4 mt-5 grid gap-2 border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:grid-cols-[1fr_1fr] sm:px-5">
            <button
              type="button"
              onClick={sharePool}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:border-cyan-200 hover:bg-cyan-50"
            >
              {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied ? "Link copied" : "Share product"}
            </button>
            <button
              type="button"
              onClick={addToCart}
              disabled={busy || disabled}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-rose-500 px-4 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:bg-slate-200 disabled:text-slate-500"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              {busy ? "Adding..." : poolCta(pool)}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function ProductMarketplaceHome({ pools, selectedCategory = null, selectedTime = "all", nextPage = 2, hasMore = false }: ProductMarketplaceHomeProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [url, setUrl] = useState("");
  const [nykaaQuery, setNykaaQuery] = useState("");
  const [nykaaResults, setNykaaResults] = useState<NykaaSearchResult[]>([]);
  const [nykaaSearchBusy, setNykaaSearchBusy] = useState(false);
  const [showPasteLink, setShowPasteLink] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activePoolId, setActivePoolId] = useState<string | null>(null);
  const [activePoolOverride, setActivePoolOverride] = useState<TrendingProductPool | null>(null);
  const activePool = activePoolOverride ?? pools.find((pool) => pool.id === activePoolId) ?? null;

  useEffect(() => {
    const sharedPoolId = searchParams.get("pool");
    if (sharedPoolId) {
      setActivePoolOverride(null);
      setActivePoolId(sharedPoolId);
    }
  }, [searchParams]);

  function openPoolSheet(pool: TrendingProductPool) {
    setActivePoolOverride(pool);
    setActivePoolId(pool.id);
  }

  function closeShareSheet() {
    setActivePoolId(null);
    setActivePoolOverride(null);
    if (searchParams.get("pool")) router.replace("/", { scroll: false });
  }

  async function addProductUrl(productUrl: string) {
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/product-pools/from-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: productUrl }),
      });
      const payload = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          router.push(`/login?next=${encodeURIComponent("/")}`);
          return;
        }
        throw new Error(payload.message ?? "Could not add this product.");
      }

      setSuccess("Joined the pool. We will notify you when the target price unlocks.");
      if (payload.pool?.id) {
        setActivePoolOverride(null);
        setActivePoolId(payload.pool.id);
        router.replace(`/?pool=${payload.pool.id}`, { scroll: false });
      }
      setUrl("");
      setNykaaResults([]);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not add this product.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await addProductUrl(url);
  }

  async function searchNykaaProducts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = nykaaQuery.trim();
    if (query.length < 2) {
      setError("Type a product name to search.");
      return;
    }

    setNykaaSearchBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/nykaa/search?q=${encodeURIComponent(query)}&limit=8`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Could not search Nykaa.");
      setNykaaResults(Array.isArray(payload.results) ? payload.results : []);
      if (!payload.results?.length) {
        setError("No Nykaa products found. Try pasting the product link instead.");
      }
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Could not search Nykaa.");
    } finally {
      setNykaaSearchBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8faf8] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-[#f8faf8]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <LogoMark />
          <div className="flex items-center gap-2">
            <Link href="/cart" className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50">
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Cart</span>
            </Link>
            <AccountMenu />
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-8 pt-7 lg:pt-12">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-lime-100 px-3 py-1 text-xs font-semibold text-lime-900">
            <Sparkles className="h-3.5 w-3.5" />
            Live product discount pools
          </div>
          <h1 className="mt-5 max-w-2xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
            Join discount pools for your favourite Nykaa Products and Save big!
          </h1>
          {/* <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            Search a Nykaa product, join its pool, and get notified when enough people unlock the 20% off target price.
          </p> */}

          <div className="mt-6 min-w-0 overflow-hidden rounded-[22px] border border-rose-100 bg-[#ffe8ee] p-4 shadow-[0_18px_60px_rgba(190,56,96,0.12)] sm:p-5">
            <InstructionMarquee steps={homeInstructionSteps} />
          </div>

          <div className="mt-4 rounded-[24px] border border-white bg-white/95 p-3 shadow-[0_18px_60px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 sm:p-4">
            <form onSubmit={searchNykaaProducts} className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <label className="flex h-12 min-w-0 items-center gap-3 rounded-[16px] bg-slate-50 px-4 ring-1 ring-slate-100 transition focus-within:ring-cyan-300">
                <Search className="h-4 w-4 shrink-0 text-cyan-700" />
                <input
                  value={nykaaQuery}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setNykaaQuery(nextValue);
                    if (!nextValue.trim()) {
                      setNykaaResults([]);
                    }
                  }}
                  placeholder="Search Nykaa products"
                  className="h-12 min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-400"
                />
              </label>
              <button
                disabled={nykaaSearchBusy || nykaaQuery.trim().length < 2}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[16px] bg-rose-500 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:bg-slate-200 disabled:text-slate-500"
              >
                {nykaaSearchBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Search
              </button>
            </form>

            {nykaaQuery.trim() && nykaaResults.length ? (
              <div className="mt-3 grid max-h-[330px] gap-2 overflow-y-auto pr-1">
                {nykaaResults.map((result) => {
                  const resultPrice = result.salePrice ?? result.mrp;
                  return (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => addProductUrl(result.url)}
                      disabled={busy}
                      className="grid grid-cols-[64px_1fr_auto] items-center gap-3 rounded-[16px] border border-slate-100 bg-slate-50 p-2 text-left transition hover:border-cyan-200 hover:bg-cyan-50 disabled:opacity-70"
                    >
                      <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-[12px] bg-white">
                        {result.imageUrl ? <img src={result.imageUrl} alt="" className="h-full w-full object-contain p-1" /> : <ShoppingBag className="h-5 w-5 text-slate-300" />}
                      </span>
                      <span className="min-w-0">
                        <span className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">{result.title}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                          {resultPrice ? <span>{formatCatalogPrice(resultPrice)}</span> : null}
                          {result.rating ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700">
                              <Star className="h-3 w-3 fill-current" />
                              {result.rating.toFixed(1)}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-rose-600 shadow-sm">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowPasteLink((current) => !current)}
                className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-50"
              >
                <Link2 className="h-3.5 w-3.5" />
                {showPasteLink ? "Hide link paste" : "Paste a Nykaa link to start a discount Pool"}
              </button>
            </div>

            {showPasteLink ? (
              <form onSubmit={submit} className="mt-3 grid gap-2 rounded-[18px] bg-slate-50 p-2 sm:grid-cols-[1fr_auto]">
                <label className="flex h-12 min-w-0 items-center gap-3 rounded-[14px] bg-white px-4 ring-1 ring-slate-100 transition focus-within:ring-cyan-300">
                  <Link2 className="h-4 w-4 shrink-0 text-cyan-700" />
                  <input
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="Paste Nykaa product link"
                    className="h-12 min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-400"
                  />
                </label>
                <button disabled={busy || !url.trim()} className="inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-500">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Join Pool
                </button>
              </form>
            ) : null}
            {error ? <p className="mt-3 rounded-[10px] bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
            {success ? (
              <p className="mt-3 inline-flex items-center gap-2 rounded-[10px] bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                {success}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-700">Pooling now</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Products close to target price</h2>
          </div>
          <Link href="/cart" className="hidden h-10 items-center justify-center rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-950 sm:inline-flex">
            View cart
          </Link>
        </div>

        <div className="mb-5">
          <div className="flex items-center gap-2">
            <div className="group relative shrink-0">
              <button
                type="button"
                aria-label="Filter by time"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800"
              >
                <Filter className="h-4 w-4" />
              </button>
              <div className="invisible absolute left-0 top-[calc(100%+8px)] z-20 w-44 translate-y-1 rounded-[16px] border border-slate-200 bg-white p-2 opacity-0 shadow-[0_18px_50px_rgba(15,23,42,0.14)] transition group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                {timeOptions.map((option) => (
                  <Link
                    key={option.value}
                    href={filterHref(selectedCategory, option.value)}
                    className={`flex items-center justify-between rounded-[12px] px-3 py-2 text-sm font-semibold transition ${selectedTime === option.value ? "bg-emerald-50 text-emerald-800" : "text-slate-700 hover:bg-slate-50"}`}
                  >
                    {option.label}
                    {selectedTime === option.value ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : null}
                  </Link>
                ))}
              </div>
            </div>
            <div className="-mr-4 flex min-w-0 flex-1 gap-2 overflow-x-auto pr-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Link
                href={filterHref(null, selectedTime)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${!selectedCategory ? "bg-cyan-700 !text-white shadow-sm" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"}`}
              >
                All categories
              </Link>
              {categoryOptions.map((option) => (
                <Link
                  key={option}
                  href={filterHref(option, selectedTime)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${selectedCategory === option ? "bg-cyan-700 !text-white shadow-sm" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"}`}
                >
                  {option}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {pools.length ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {pools.map((pool) => <TrendingPoolCard key={pool.id} pool={pool} onOpenShare={openPoolSheet} />)}
            </div>
            {hasMore ? (
              <div className="mt-6 flex justify-center">
                <Link
                  href={filterHref(selectedCategory, selectedTime, nextPage)}
                  scroll={false}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50"
                >
                  Load more
                </Link>
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-[18px] border border-dashed border-slate-300 bg-white p-10 text-center">
            <h3 className="text-xl font-semibold text-slate-950">{pools.length ? "No matching products" : "No active pools yet"}</h3>
            <p className="mt-2 text-sm text-slate-500">{selectedCategory ? "Try another category." : "Search a Nykaa product to start the first pool."}</p>
          </div>
        )}
      </section>
      {activePool ? <PoolShareSheet pool={activePool} onClose={closeShareSheet} onOpenPool={openPoolSheet} /> : null}
    </main>
  );
}
