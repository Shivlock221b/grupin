"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, CreditCard, ExternalLink, Search, ShoppingBag, Sparkles, Star, Users, X } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { productImageUrl } from "@/lib/product-images";
import { BrandProduct, ProductTeamCartItem, ProductTeamUnlock, ProductTeamUnlockMember } from "@/lib/types";
import { formatCatalogPrice, productDisplayPrice, productSavings, teamPrice, teamPriceForProduct } from "@/lib/product-pricing";

type ProductCatalogProps = {
  products: BrandProduct[];
  brandSlug?: string;
};

function stableShuffleScore(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 9973;
  }

  return hash;
}

function productCategory(product: BrandProduct) {
  return product.productTypes[0] || product.tags.find((tag) => !tag.includes(":")) || "Skincare";
}

function productFilterValues(product: BrandProduct) {
  return [...product.productTypes, ...product.tags].filter(Boolean);
}

function formatCount(count?: number | null) {
  if (count === null || count === undefined) {
    return "";
  }

  return count >= 1000 ? `${(count / 1000).toFixed(count >= 10_000 ? 0 : 1)}k` : count.toLocaleString("en-IN");
}

function ProductRating({ product }: { product: BrandProduct }) {
  if (!product.rating) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-xs font-bold text-white">
      <Star className="h-3.5 w-3.5 fill-current" />
      <span>{product.rating.toFixed(1)}</span>
      {product.ratingCount ? <span className="font-semibold text-white/80">({formatCount(product.ratingCount)})</span> : null}
    </div>
  );
}

function formatRemaining(value?: string | null) {
  if (!value) return "24h";
  const diff = new Date(value).getTime() - Date.now();
  if (!Number.isFinite(diff) || diff <= 0) return "ending soon";
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}

function ProductTags({ product, limit = 2 }: { product: BrandProduct; limit?: number }) {
  const tags = product.tags.slice(0, limit);

  if (!tags.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span key={tag} className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.04em] text-amber-900">
          {tag}
        </span>
      ))}
    </div>
  );
}

function variantTypeLabel(product: BrandProduct) {
  const type = product.variantType === "shade" ? "shade" : product.variantType === "size" || product.variantType === "weight_configure" ? "size" : "variant";
  const count = product.variantCount ?? product.variants.length;
  return count > 1 ? `${count} ${type}${count === 1 ? "" : "s"}` : "";
}

function trackProductTeamCta(product: BrandProduct, source: string) {
  void fetch("/api/telegram/events", {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "product_team_cta_click",
      source,
      productTitle: product.title,
      productSlug: product.slug,
      brandName: product.brand?.name ?? product.vendor,
      brandSlug: product.brand?.slug,
    }),
  }).catch(() => {});
}

export function ProductCatalog({ products, brandSlug }: ProductCatalogProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [heroIndex, setHeroIndex] = useState(0);
  const [activeCart, setActiveCart] = useState<{
    unlock: ProductTeamUnlock;
    members: ProductTeamUnlockMember[];
    cartItems: ProductTeamCartItem[];
    currentMemberId?: string | null;
  } | null>(null);
  const [, setClockTick] = useState(0);
  const brandName = products[0]?.brand?.name ?? products[0]?.vendor ?? "Brand";
  const catalogHref = brandSlug ? `/catalog/${brandSlug}` : "/catalog";
  const sortedProducts = useMemo(
    () => [...products].sort((first, second) => stableShuffleScore(first.id) - stableShuffleScore(second.id)),
    [products],
  );
  const categories = useMemo(() => {
    const values = products.flatMap(productFilterValues);
    return ["All", ...Array.from(new Set(values)).sort((first, second) => first.localeCompare(second))];
  }, [products]);
  const featured = sortedProducts[heroIndex % Math.max(1, sortedProducts.length)] ?? products[0];
  const featuredPrice = featured ? productDisplayPrice(featured) : null;
  const featuredImage = productImageUrl(featured?.primaryImage ?? featured?.imageUrls[0], 1200);
  const filteredProducts = sortedProducts.filter((product) => {
    const matchesCategory = category === "All" || productFilterValues(product).includes(category);
    const haystack = `${product.title} ${product.vendor ?? ""} ${product.brand?.name ?? ""} ${product.tags.join(" ")} ${product.productTypes.join(" ")}`.toLowerCase();
    return matchesCategory && haystack.includes(query.trim().toLowerCase());
  });

  useEffect(() => {
    if (sortedProducts.length <= 1) {
      return;
    }

    setHeroIndex(Math.floor(Math.random() * sortedProducts.length));
    const timer = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % sortedProducts.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [sortedProducts.length]);

  useEffect(() => {
    if (!brandSlug) {
      return;
    }

    let cancelled = false;
    fetch(`/api/product-team-cart?brandSlug=${encodeURIComponent(brandSlug)}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (cancelled) return;
        setActiveCart(payload.unlock ? { unlock: payload.unlock, members: payload.members ?? [], cartItems: payload.cartItems ?? [], currentMemberId: payload.currentMemberId ?? null } : null);
      })
      .catch(() => {
        if (!cancelled) setActiveCart(null);
      });

    return () => {
      cancelled = true;
    };
  }, [brandSlug]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick((current) => current + 1), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const hasActiveBrandCart = Boolean(activeCart);
  const activeCartItemCount = activeCart?.currentMemberId
    ? activeCart.cartItems
        .filter((item) => item.memberId === activeCart.currentMemberId)
        .reduce((total, item) => total + Math.max(1, Number(item.quantity ?? 1) || 1), 0)
    : 0;

  return (
    <main className="min-h-screen bg-[#fbfcf8] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4">
          <Link href={catalogHref} className="text-xl font-semibold tracking-tight text-emerald-950">
            GruPin
          </Link>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${brandName} products...`}
              className="h-11 w-full rounded-[8px] border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium outline-none transition focus:border-cyan-500 focus:bg-white"
            />
          </div>
          <AccountMenu />
        </div>
      </header>
      {activeCart ? (
        <Link
          href={`/team-room/${activeCart.unlock.shareCode}`}
          className="sticky top-[69px] z-30 block border-b border-lime-200 bg-lime-300 text-lime-950 shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{brandName} Team Room is active</p>
                <p className="truncate text-[11px] font-bold text-lime-950/70 sm:hidden">{activeCart.unlock.currentCount}/{activeCart.unlock.threshold} member carts ready</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs font-semibold">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/65 px-2 py-1">
                <ShoppingBag className="h-3.5 w-3.5" />
                {activeCartItemCount}
              </span>
              <span className="hidden sm:inline">{activeCart.unlock.currentCount}/{activeCart.unlock.threshold} member carts ready</span>
              <span className="rounded-full bg-white/65 px-2 py-1">{formatRemaining(activeCart.unlock.expiresAt)}</span>
            </div>
          </div>
        </Link>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 py-4 sm:py-5">
        <div className="relative h-[390px] overflow-hidden rounded-[18px] bg-slate-950 text-white shadow-[0_24px_80px_rgba(20,33,29,0.16)] sm:h-[470px]">
          {featured ? (
            <>
              <img src={featuredImage} alt="" fetchPriority="high" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-2xl" />
              <div className="absolute inset-4 rounded-[16px] bg-white/8 ring-1 ring-white/10 sm:inset-8" />
              <img src={featuredImage} alt="" fetchPriority="high" className="absolute inset-0 h-full w-full object-contain p-7 sm:p-12" />
            </>
          ) : null}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(201,240,69,0.26),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.12),rgba(15,23,42,0.72))]" />
          <div className="relative flex h-[390px] max-w-3xl flex-col justify-end p-5 sm:h-[470px] sm:p-8 lg:p-10">
            {featured ? (
              <div className="relative max-w-md">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">{brandName} top pick</p>
                <h1 className="mt-2 line-clamp-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{featured.title}</h1>
                <p className="mt-3 max-w-sm text-sm font-semibold leading-6 text-white/75">Team Price unlocks brand-wide when 3 member carts are ready.</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <div className="rounded-[12px] bg-white px-3 py-2 text-slate-950 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
                    <p className="text-xs font-semibold text-slate-500">MRP</p>
                    <p className="font-semibold line-through decoration-rose-400 decoration-2">{formatCatalogPrice(featuredPrice)}</p>
                  </div>
                  <div className="rounded-[12px] bg-lime-300 px-3 py-2 text-lime-950">
                    <p className="text-xs font-semibold text-lime-900/70">Team price</p>
                    <p className="font-semibold">{featured ? formatCatalogPrice(teamPriceForProduct(featured)) : formatCatalogPrice(teamPrice(featuredPrice))}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/team-price/${featured.brand?.slug ?? brandSlug ?? "brand"}/${featured.slug}`}
                    onClick={() => trackProductTeamCta(featured, "catalog_hero")}
                    className="inline-flex min-h-12 w-fit items-center justify-center gap-2 rounded-[12px] bg-rose-500 px-5 py-3 text-sm font-black text-white shadow-[0_16px_36px_rgba(244,63,94,0.32)] transition hover:bg-rose-600"
                  >
                    {hasActiveBrandCart ? "Add to Cart" : "Buy at Team Price"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
          {sortedProducts.length > 1 ? (
            <div className="absolute bottom-4 right-4 z-10 flex gap-1.5">
              {Array.from({ length: Math.min(8, sortedProducts.length) }).map((_, index) => (
                <span key={index} className={`h-1.5 rounded-full transition-all ${index === heroIndex % Math.min(8, sortedProducts.length) ? "w-6 bg-cyan-300" : "w-1.5 bg-white/45"}`} />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={`h-10 shrink-0 rounded-full border px-4 text-sm font-bold transition ${
                category === item
                  ? "border-slate-950 bg-slate-950 text-white"
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
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">Shop products</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Unlock team prices</h2>
          </div>
          <p className="hidden text-sm font-medium text-slate-500 sm:block">Browse products, compare site price, and start a team unlock.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCatalogCard key={product.id} product={product} brandSlug={brandSlug} hasActiveBrandCart={hasActiveBrandCart} />
          ))}
        </div>

        {!filteredProducts.length ? (
          <div className="rounded-[8px] border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="font-semibold text-slate-950">No products found</p>
            <p className="mt-1 text-sm text-slate-500">Try another category or search term.</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function ProductCatalogCard({ product, brandSlug, hasActiveBrandCart }: { product: BrandProduct; brandSlug?: string; hasActiveBrandCart: boolean }) {
  const router = useRouter();
  const selectedPrice = productDisplayPrice(product);
  const selectedTeamPrice = teamPriceForProduct(product);
  const savings = productSavings(product);
  const productHref = `/team-price/${product.brand?.slug ?? brandSlug ?? "brand"}/${product.slug}`;
  const imageUrl = productImageUrl(product.primaryImage ?? product.imageUrls[0], 700);
  const variantsLabel = variantTypeLabel(product);
  const [flowOpen, setFlowOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requiresVariantSelection = Boolean(variantsLabel);

  function openProductDetails() {
    router.push(productHref);
  }

  async function addToActiveTeamCart() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/product-team-cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandSlug: product.brand?.slug,
          productSlug: product.slug,
          quantity: 1,
        }),
      });
      const payload = await response.json();

      if (response.status === 401) {
        setFlowOpen(true);
        return;
      }

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not add to cart.");
      }

      router.push(`/team-room/${payload.unlock.shareCode}`);
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Could not add to cart.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={openProductDetails}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          openProductDetails();
        }
      }}
      className="group cursor-pointer overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,118,110,0.06)] transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_18px_50px_rgba(15,118,110,0.12)] focus:outline-none focus:ring-2 focus:ring-cyan-500"
    >
      <div className="relative aspect-square overflow-hidden bg-[#f7faf5]">
        <img src={imageUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain p-3 transition duration-300 group-hover:scale-105 sm:p-5" />
      </div>
      <div className="p-3 sm:p-4">
        <p className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-slate-950">{product.title}</p>
        <div className="mt-2 flex min-h-7 flex-wrap items-center gap-2">
          <ProductRating product={product} />
          <ProductTags product={product} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="line-clamp-1 text-xs font-semibold text-cyan-700">{productCategory(product)}</p>
          {variantsLabel ? (
            <span className="rounded-full bg-cyan-50 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.04em] text-cyan-800">
              {variantsLabel}
            </span>
          ) : null}
        </div>
        <div className="mt-3 rounded-[12px] bg-slate-50 p-2.5 sm:p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-emerald-700">Team price</p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-xl font-semibold text-slate-950">{formatCatalogPrice(selectedTeamPrice)}</p>
                <p className="text-sm font-semibold text-slate-500">
                  MRP <span className="line-through decoration-rose-400 decoration-2">{formatCatalogPrice(selectedPrice)}</span>
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
        <div className="mt-3 grid gap-2">
          {product.productUrl ? (
            <a
              href={product.productUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[10px] border border-slate-200 bg-white px-2 text-xs font-bold text-slate-800 transition hover:bg-slate-50 sm:h-11 sm:px-3 sm:text-sm"
            >
              View on site
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : (
            <span className="inline-flex h-10 w-full items-center justify-center rounded-[10px] border border-slate-200 bg-slate-50 px-2 text-xs font-bold text-slate-400 sm:h-11 sm:px-3 sm:text-sm">
              Site link
            </span>
          )}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              trackProductTeamCta(product, "catalog_card");
              if (requiresVariantSelection) {
                router.push(productHref);
                return;
              }
              if (hasActiveBrandCart) {
                void addToActiveTeamCart();
                return;
              }
              setFlowOpen(true);
            }}
            disabled={busy}
            className="inline-flex h-10 w-full items-center justify-center rounded-[10px] bg-rose-500 px-2 text-xs font-black text-white transition hover:bg-rose-600 disabled:opacity-50 sm:h-11 sm:px-3 sm:text-sm"
          >
            {busy ? "Adding..." : hasActiveBrandCart ? "Add to Cart" : "Buy at Team Price"}
          </button>
          {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
        </div>
      </div>
      {flowOpen ? (
        <CatalogUnlockFlow
          product={product}
          teamPriceText={formatCatalogPrice(selectedTeamPrice)}
          onClose={() => setFlowOpen(false)}
        />
      ) : null}
    </div>
  );
}

function CatalogUnlockFlow({ product, teamPriceText, onClose }: { product: BrandProduct; teamPriceText: string; onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<"intro" | "phone" | "otp">("intro");
  const [introIndex, setIntroIndex] = useState(0);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const threshold = 3;
  const introSlides = [
    {
      icon: Sparkles,
      title: "Start or Join in one Tap",
      text: "Tap to enter a Team Room for this brand. It is easy, quick, and absolutely free.",
      accent: "bg-lime-300 text-lime-950",
      graphic: "join",
    },
    {
      icon: Users,
      title: "Share and Unlock Together",
      text: "Share the Team Room link with friends and family. When 3 members add products to their carts, the team price unlocks for those carts.",
      accent: "bg-cyan-100 text-cyan-950",
      graphic: "share",
    },
    {
      icon: CreditCard,
      title: "Everyone avails the Team Discount",
      text: "After the Team Room unlocks, eligible members can checkout their cart at the Team price.",
      accent: "bg-rose-100 text-rose-950",
      graphic: "discount",
    },
  ];
  const activeIntro = introSlides[introIndex];

  async function joinRoom() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/product-team-cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandSlug: product.brand?.slug,
          productSlug: product.slug,
          quantity: 1,
        }),
      });
      const payload = await response.json();

      if (response.status === 401) {
        setStep("phone");
        return;
      }

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not add to cart.");
      }

      router.push(`/team-room/${payload.unlock.shareCode}`);
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Could not add to cart.");
    } finally {
      setBusy(false);
    }
  }

  async function sendOtp() {
    setBusy(true);
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
    } catch (otpError) {
      setError(otpError instanceof Error ? otpError.message : "Could not send OTP.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtpAndJoin() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/account/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otp }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not verify OTP.");
      }

      setOtp("");
      await joinRoom();
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Could not verify OTP.");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-x-hidden bg-slate-950/45 px-0 py-4 backdrop-blur-sm sm:grid sm:place-items-center sm:px-4"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="fixed inset-x-0 bottom-0 w-full max-w-full overflow-x-hidden overflow-y-auto rounded-t-[16px] bg-white p-4 shadow-[0_-18px_60px_rgba(15,23,42,0.22)] sm:static sm:max-h-[88vh] sm:w-full sm:max-w-md sm:rounded-[12px] sm:p-5">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-700">Team price</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              {step === "intro" ? "Unlock this price together" : "Verify your phone"}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === "intro" ? (
          <div className="mt-5 space-y-4">
            <div className={`overflow-hidden rounded-[12px] p-4 ${activeIntro.accent}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold opacity-75">Step {introIndex + 1} of {introSlides.length}</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight">{activeIntro.title}</p>
                </div>
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/75">
                  <activeIntro.icon className="h-6 w-6" />
                </div>
              </div>

              <div className="mt-5 grid h-36 place-items-center overflow-hidden rounded-[10px] bg-white/55">
                {activeIntro.graphic === "join" ? (
                  <div className="relative h-full w-full">
                    <div className="absolute left-1/2 top-5 h-24 w-16 -translate-x-1/2 animate-pulse rounded-[18px] border-[5px] border-white bg-slate-950 shadow-lg">
                      <div className="mx-auto mt-2 h-1 w-6 rounded-full bg-white/40" />
                      <div className="mx-2 mt-4 rounded-[8px] bg-lime-300 px-2 py-1 text-center text-[10px] font-bold text-lime-950">JOIN</div>
                    </div>
                    <div className="absolute left-[54%] top-[74px] grid h-10 w-10 animate-bounce place-items-center rounded-full bg-white shadow-md">
                      <Sparkles className="h-5 w-5" />
                    </div>
                  </div>
                ) : null}
                {activeIntro.graphic === "share" ? (
                  <div className="relative flex h-full w-full items-center justify-center">
                    <div className="absolute left-1/2 top-1/2 h-px w-44 -translate-x-1/2 -translate-y-1/2 bg-cyan-500/30" />
                    {Array.from({ length: threshold }).map((_, index) => (
                      <div
                        key={index}
                        className={`absolute grid rounded-full bg-white shadow-md ${
                          index === 0 ? "left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 animate-pulse" : index === 1 ? "left-8 top-5 h-12 w-12 animate-bounce" : "right-8 bottom-5 h-12 w-12 animate-bounce [animation-delay:250ms]"
                        } place-items-center`}
                      >
                        <Users className={index === 1 ? "h-7 w-7" : "h-5 w-5"} />
                      </div>
                    ))}
                  </div>
                ) : null}
                {activeIntro.graphic === "discount" ? (
                  <div className="relative flex h-full w-full items-center justify-center">
                    <div className="absolute left-7 top-5 rotate-[-8deg] rounded-[10px] bg-white p-3 text-center shadow-md">
                      <p className="text-[10px] font-bold opacity-60">YOU</p>
                      <p className="text-sm font-semibold">{teamPriceText}</p>
                    </div>
                    <div className="absolute right-7 top-5 rotate-[8deg] rounded-[10px] bg-white p-3 text-center shadow-md">
                      <p className="text-[10px] font-bold opacity-60">FRIEND</p>
                      <p className="text-sm font-semibold">{teamPriceText}</p>
                    </div>
                    <div className="grid h-20 w-20 animate-pulse place-items-center rounded-full bg-rose-500 text-center text-white shadow-lg">
                      <div>
                        <p className="text-[10px] font-bold">SAME</p>
                        <p className="text-sm font-semibold">PRICE</p>
                      </div>
                    </div>
                    <div className="absolute bottom-5 flex animate-bounce items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold shadow-md">
                      <Check className="h-3.5 w-3.5" />
                      Unlocked
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <p className="text-center text-sm leading-6 text-slate-600">{activeIntro.text}</p>
            <div className="flex justify-center gap-1.5">
              {introSlides.map((slide, index) => (
                <span key={slide.title} className={`h-1.5 rounded-full transition-all ${index === introIndex ? "w-7 bg-cyan-600" : "w-1.5 bg-slate-200"}`} />
              ))}
            </div>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => {
                  if (introIndex < introSlides.length - 1) {
                    setIntroIndex((current) => current + 1);
                    return;
                  }
                  void joinRoom();
                }}
                disabled={busy}
                className="h-12 rounded-[8px] bg-rose-500 px-5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? "Checking..." : introIndex < introSlides.length - 1 ? "Next" : "Continue"}
              </button>
              <button type="button" onClick={joinRoom} disabled={busy} className="h-11 rounded-[8px] px-5 text-sm font-semibold text-slate-600 disabled:opacity-50">
                Skip intro
              </button>
            </div>
          </div>
        ) : null}

        {step === "phone" ? (
          <div className="mt-5 space-y-4">
            <p className="text-sm leading-6 text-slate-600">Enter your phone number once. We will verify it with an OTP, add this item to cart, and take you to the Team Room.</p>
            <label className="block text-sm font-semibold text-slate-700">
              Mobile number
              <input value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 h-12 w-full rounded-[8px] border border-slate-200 px-3 text-base outline-none focus:border-cyan-500" />
            </label>
            <button type="button" onClick={sendOtp} disabled={busy || !phone.trim()} className="h-12 w-full rounded-[8px] bg-rose-500 px-5 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? "Sending..." : "Send OTP"}
            </button>
          </div>
        ) : null}

        {step === "otp" ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-[8px] bg-cyan-50 p-4 text-sm text-cyan-950">
              OTP sent to <span className="font-semibold">{phone}</span>.
              {demoOtp ? <span className="mt-1 block font-semibold">Demo OTP: {demoOtp}</span> : null}
            </div>
            <label className="block text-sm font-semibold text-slate-700">
              Enter OTP
              <input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} className="mt-1 h-12 w-full rounded-[8px] border border-slate-200 px-3 text-center text-lg font-semibold tracking-[0.3em] outline-none focus:border-cyan-500" />
            </label>
            <button type="button" onClick={verifyOtpAndJoin} disabled={busy || otp.length < 6} className="h-12 w-full rounded-[8px] bg-rose-500 px-5 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? "Verifying..." : "Verify & add"}
            </button>
          </div>
        ) : null}

        {error ? <p className="mt-4 rounded-[8px] bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}
      </div>
    </div>
  );
}
