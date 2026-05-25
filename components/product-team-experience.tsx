"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, CreditCard, ExternalLink, Info, Share2, Sparkles, Star, Users, X } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { productImageUrl } from "@/lib/product-images";
import { BrandProduct, ProductTeamCheckoutProgress, ProductTeamUnlock, ProductTeamUnlockMember } from "@/lib/types";
import { effectiveTeamDiscountPercent, formatCatalogPrice, highestPricedVariant, teamPrice } from "@/lib/product-pricing";

type ProductTeamExperienceProps = {
  product: BrandProduct;
  initialUnlock?: ProductTeamUnlock | null;
  initialMembers?: ProductTeamUnlockMember[];
  initialCheckoutProgress?: ProductTeamCheckoutProgress[];
  initiallyJoined?: boolean;
};

function formatCount(count?: number | null) {
  if (count === null || count === undefined) {
    return "";
  }

  return count >= 1000 ? `${(count / 1000).toFixed(count >= 10_000 ? 0 : 1)}k` : count.toLocaleString("en-IN");
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function variantKey(variant: BrandProduct["variants"][number]) {
  return variant.child_id || variant.sku || variant.title;
}

function variantLabel(variant: BrandProduct["variants"][number]) {
  return variant.variant_name || variant.pack_size || variant.title;
}

function maskedPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (!digits) {
    return "Someone";
  }

  const visible = digits.slice(-4);
  return `${"X".repeat(Math.max(5, Math.min(7, digits.length - visible.length)))}${visible}`;
}

function formatJoinedTime(value: string) {
  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return "";
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (diffSeconds < 60) return "Just now";
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function trackProductTeamCta(product: BrandProduct, source: string) {
  void fetch("/api/telegram/events", {
    method: "POST",
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

export function ProductTeamExperience({ product, initialUnlock = null, initialMembers = [], initialCheckoutProgress = [], initiallyJoined = false }: ProductTeamExperienceProps) {
  const defaultVariant = highestPricedVariant(product);
  const [selectedVariantKey, setSelectedVariantKey] = useState(defaultVariant ? variantKey(defaultVariant) : "");
  const [imageIndex, setImageIndex] = useState(0);
  const [unlock, setUnlock] = useState<ProductTeamUnlock | null>(initialUnlock);
  const [members, setMembers] = useState(initialMembers);
  const [checkoutProgress] = useState(initialCheckoutProgress);
  const [joined, setJoined] = useState(initiallyJoined);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [flowOpen, setFlowOpen] = useState(false);
  const [instructionsOnly, setInstructionsOnly] = useState(false);
  const [flowStep, setFlowStep] = useState<"intro" | "phone" | "otp" | "joined">("intro");
  const [introIndex, setIntroIndex] = useState(0);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [flowError, setFlowError] = useState("");
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareFeedback, setShareFeedback] = useState("");
  const displayVariant = product.variants.find((variant) => variantKey(variant) === selectedVariantKey) ?? defaultVariant;
  const selectedPrice = displayVariant?.price ?? product.priceMax ?? product.priceMin;
  const discountPercent = Math.max(unlock?.discountPercent ?? 0, effectiveTeamDiscountPercent(product));
  const selectedTeamPrice = teamPrice(selectedPrice, discountPercent);
  const savings = selectedPrice === null || selectedPrice === undefined || selectedTeamPrice === null ? null : Math.max(0, Math.round(selectedPrice - selectedTeamPrice));
  const images = uniqueValues([displayVariant?.image_url ?? "", product.detailImageUrl ?? "", product.primaryImage ?? "", ...product.imageUrls]).map((image) => productImageUrl(image, 1000));
  const hasVariants = product.variants.length > 1;
  const variantType = product.variantType === "shade" ? "shade" : product.variantType === "size" || product.variantType === "weight_configure" ? "size" : "variant";
  const variantTitle = variantType === "shade" ? "Choose shade" : variantType === "size" ? "Choose size" : "Choose variant";
  const joinedCount = unlock?.currentCount ?? members.length;
  const threshold = unlock?.threshold ?? 3;
  const checkoutCount = checkoutProgress.length;
  const roomUnlocked = Boolean(unlock && unlock.currentCount >= unlock.threshold);
  const roomClosed = Boolean(roomUnlocked && checkoutCount >= joinedCount);
  const expired = Boolean(unlock && new Date(unlock.expiresAt).getTime() <= Date.now() && !roomUnlocked);
  const hasLongDescription = Boolean(product.description && product.description.length > 160);
  const introSlides = [
    {
      icon: Sparkles,
      title: "Start or Join in one Tap",
      text: "Tap to enter a Team unlock room for this product. It is easy, quick, and absolutely free.",
      accent: "bg-lime-300 text-lime-950",
      graphic: "join",
    },
    {
      icon: Users,
      title: "Share and Unlock Together",
      text: `Share room link with friends and family. When ${threshold} people join, the team price unlocks for everyone in the room.`,
      accent: "bg-cyan-100 text-cyan-950",
      graphic: "share",
    },
    {
      icon: CreditCard,
      title: "Everyone avails the Team Discount",
      text: "After the room unlocks, everyone can checkout the product at the Team price.",
      accent: "bg-rose-100 text-rose-950",
      graphic: "discount",
    },
  ];
  const activeIntro = introSlides[introIndex];
  const shareText = `I found ${product.title} at a team price of ${formatCatalogPrice(selectedTeamPrice)} on GruPin. Join my room so we can unlock it together.`;
  const activityMembers = [...members].sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime());

  useEffect(() => {
    if (!unlock || typeof window === "undefined") {
      setShareUrl("");
      return;
    }

    setShareUrl(`${window.location.origin}/team-room/${unlock.shareCode}`);
  }, [unlock]);

  useEffect(() => {
    if (!shareFeedback) {
      return;
    }

    const timer = window.setTimeout(() => setShareFeedback(""), 1800);
    return () => window.clearTimeout(timer);
  }, [shareFeedback]);

  async function joinTeamPriceRoom() {
    setBusy(true);
    setMessage("");
    setFlowError("");
    try {
      const response = await fetch("/api/product-team-unlocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandSlug: product.brand?.slug,
          productSlug: product.slug,
          code: unlock?.shareCode,
        }),
      });
      const payload = await response.json();
      if (response.status === 401) {
        setFlowStep("phone");
        return;
      }
      if (!response.ok) throw new Error(payload.message ?? "Could not join unlock.");
      setUnlock(payload.unlock);
      setMembers(payload.members ?? []);
      setJoined(true);
      setFlowStep("joined");
      setMessage("You are in. Share your room to unlock the team price.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Could not join unlock.";
      setMessage(errorMessage);
      setFlowError(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  async function sendOtp() {
    setBusy(true);
    setFlowError("");
    try {
      const response = await fetch("/api/account/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Could not send OTP.");
      setDemoOtp(payload.demoOtp ?? "");
      setFlowStep("otp");
    } catch (error) {
      setFlowError(error instanceof Error ? error.message : "Could not send OTP.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtpAndJoin() {
    setBusy(true);
    setFlowError("");
    try {
      const response = await fetch("/api/account/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otp }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Could not verify OTP.");
      setOtp("");
      await joinTeamPriceRoom();
    } catch (error) {
      setFlowError(error instanceof Error ? error.message : "Could not verify OTP.");
      setBusy(false);
    }
  }

  function openTeamPriceFlow() {
    trackProductTeamCta(product, unlock ? "team_room" : "product_detail");
    setInstructionsOnly(false);
    setFlowOpen(true);
    setFlowError("");
    setIntroIndex(0);
    setFlowStep(joined ? "joined" : "intro");
  }

  function openInstructionsOnly() {
    setInstructionsOnly(true);
    setFlowOpen(true);
    setFlowError("");
    setIntroIndex(0);
    setFlowStep("intro");
  }

  async function copyShareLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setShareFeedback("Link copied.");
  }

  async function shareRoom() {
    if (!shareUrl) return;

    const shareData = {
      title: `Join my GruPin room for ${product.title}`,
      text: shareText,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareFeedback("Share window opened.");
        return;
      }

      await copyShareLink();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      await copyShareLink();
    }
  }

  return (
    <main className="overflow-x-hidden bg-[#f3faf7] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link href={`/catalog/${product.brand?.slug ?? "foxtale"}`} className="text-xl font-semibold tracking-tight text-emerald-950">GruPin</Link>
          <AccountMenu />
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-start gap-6 px-4 py-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white">
          <div className="relative grid aspect-[4/3] place-items-center bg-slate-50">
            <div className="absolute right-3 top-3 z-10 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
              {joinedCount} / {threshold} joined
            </div>
            <img src={images[imageIndex] ?? ""} alt="" className="h-full w-full object-contain p-6" />
          </div>
          <div className="flex gap-2 overflow-x-auto border-t border-slate-100 p-3">
            {images.map((image, index) => (
              <button key={image} type="button" onClick={() => setImageIndex(index)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-[8px] border ${index === imageIndex ? "border-cyan-600" : "border-slate-200"}`}>
                <img src={productImageUrl(image, 200)} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,118,110,0.06)]">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-700">{product.brand?.name ?? product.vendor}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{product.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {product.rating ? (
              <div className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-sm font-bold text-white">
                <Star className="h-4 w-4 fill-current" />
                <span>{product.rating.toFixed(1)}</span>
                {product.ratingCount ? <span className="font-semibold text-white/80">({formatCount(product.ratingCount)})</span> : null}
              </div>
            ) : null}
            {product.inStock !== null && product.inStock !== undefined ? (
              <span className={`rounded-full px-2.5 py-1 text-sm font-bold ${product.inStock ? "bg-lime-100 text-lime-900" : "bg-rose-100 text-rose-700"}`}>
                {product.inStock ? "In stock" : "Out of stock"}
              </span>
            ) : null}
            {product.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.04em] text-amber-900">
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">MRP</p>
              <p className="text-lg font-semibold text-slate-500 line-through decoration-rose-400 decoration-2">{formatCatalogPrice(selectedPrice)}</p>
            </div>
            <div className="rounded-[8px] bg-lime-300 px-3 py-2 text-lime-950">
              <p className="text-xs font-semibold text-lime-900/70">Team price</p>
              <p className="text-2xl font-semibold">{formatCatalogPrice(selectedTeamPrice)}</p>
            </div>
            {savings ? (
              <div className="rounded-[8px] bg-rose-50 px-3 py-2 text-rose-700">
                <p className="text-xs font-semibold text-rose-500">You save</p>
                <p className="text-lg font-semibold">{formatCatalogPrice(savings)} ({discountPercent}% off)</p>
              </div>
            ) : null}
          </div>
          {product.description ? (
            <div className="mt-4 text-sm leading-6 text-slate-600">
              <p className={descriptionExpanded ? "" : "line-clamp-2"}>{product.description}</p>
              {hasLongDescription ? (
                <button
                  type="button"
                  onClick={() => setDescriptionExpanded((current) => !current)}
                  className="mt-1 text-sm font-semibold text-cyan-700"
                >
                  {descriptionExpanded ? "View less" : "View more"}
                </button>
              ) : null}
            </div>
          ) : null}

          {hasVariants ? (
            <div className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800">{variantTitle}</p>
                {displayVariant ? <p className="text-xs font-semibold text-slate-500">Selected: {variantLabel(displayVariant)}</p> : null}
              </div>
              <div className={`mt-2 grid gap-2 ${variantType === "shade" ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-3 sm:grid-cols-4"}`}>
                {product.variants.map((variant) => {
                  const key = variantKey(variant);
                  const active = displayVariant ? variantKey(displayVariant) === key : false;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSelectedVariantKey(key);
                        setImageIndex(0);
                      }}
                      className={`min-h-12 rounded-[8px] border p-2 text-left text-sm font-semibold transition ${
                        active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-800 hover:border-cyan-300"
                      }`}
                    >
                      {variantType === "shade" && variant.shade_image ? (
                        <span className="mb-2 block h-8 w-8 overflow-hidden rounded-full border border-slate-200 bg-white">
                          <img src={productImageUrl(variant.shade_image, 80)} alt="" className="h-full w-full object-cover" />
                        </span>
                      ) : null}
                      <span className="block leading-4">{variantLabel(variant)}</span>
                      {variant.price !== null && variant.price !== undefined ? (
                        <span className={`mt-1 block text-xs ${active ? "text-white/70" : "text-slate-500"}`}>
                          {formatCatalogPrice(variant.price)}
                        </span>
                      ) : null}
                      {variant.available === false ? <span className="mt-1 block text-xs text-rose-500">Out of stock</span> : null}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">You can browse variants here. Final selection will be confirmed during checkout after the room unlocks.</p>
            </div>
          ) : null}

          {unlock ? (
            <div className="mt-5 space-y-3">
              <div className="min-w-0 rounded-[8px] border border-cyan-200 bg-cyan-50 p-3 sm:p-4">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <Share2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-950">Share this room</p>
                        <button
                          type="button"
                          onClick={openInstructionsOnly}
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-cyan-800 ring-1 ring-cyan-200 transition hover:bg-cyan-100"
                          aria-label="View team price instructions"
                          title="View team price instructions"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-1 break-all text-sm leading-5 text-slate-600">{shareUrl}</p>
                    </div>
                  </div>
                  <button type="button" onClick={shareRoom} className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-[8px] bg-slate-950 px-3 text-sm font-semibold text-white sm:w-auto">
                    <Copy className="h-4 w-4" />
                    Share
                  </button>
                </div>
                {shareFeedback ? <p className="mt-3 rounded-[8px] bg-white/70 px-3 py-2 text-sm font-semibold text-cyan-800">{shareFeedback}</p> : null}
              </div>
              {activityMembers.length ? (
                <div className="rounded-[8px] border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">Room activity</p>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{activityMembers.length} joined</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {activityMembers.slice(0, 6).map((member) => (
                      <div key={member.id} className="flex items-center gap-3 rounded-[8px] bg-slate-50 px-3 py-2">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cyan-100 text-cyan-800">
                          <Users className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">{maskedPhone(member.phone)} joined the room</p>
                          <p className="text-xs font-medium text-slate-500">{formatJoinedTime(member.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {roomUnlocked ? (
                <div className="rounded-[8px] border border-lime-200 bg-lime-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">Checkout progress</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {roomClosed ? "This room is closed. All joined users have checked out." : `${checkoutCount} of ${joinedCount} joined users have placed their order on hold.`}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-lime-900">{checkoutCount}/{joinedCount}</span>
                  </div>
                  {checkoutProgress.length ? (
                    <div className="mt-3 space-y-2">
                      {checkoutProgress.slice(0, 6).map((order) => (
                        <div key={order.id} className="flex items-center gap-3 rounded-[8px] bg-white/80 px-3 py-2">
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lime-100 text-lime-800">
                            <Check className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-800">{maskedPhone(order.buyerPhone)} checked out</p>
                            <p className="text-xs font-medium text-slate-500">{order.status === "confirmed" ? "Confirmed" : "Order on hold"}{order.createdAt ? ` · ${formatJoinedTime(order.createdAt)}` : ""}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 rounded-[8px] bg-white/75 px-3 py-2 text-sm font-semibold text-lime-900">No checkouts yet. Share a reminder with the room.</p>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          {roomUnlocked ? (
            <div className="mt-5 grid gap-2">
              {roomClosed ? (
                <div className="rounded-[8px] border border-lime-200 bg-lime-50 px-4 py-3 text-sm font-semibold text-lime-900">
                  Room closed. All team orders have been placed.
                </div>
              ) : (
                <Link href={`/team-checkout/${unlock?.shareCode}`} className="fixed inset-x-4 bottom-4 z-40 inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-rose-500 px-5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(244,63,94,0.28)] transition hover:bg-rose-600 sm:static sm:w-full sm:shadow-none">
                  Complete Purchase
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              {product.productUrl ? (
                <a href={product.productUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-[8px] border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
                  View product on site
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
            </div>
          ) : (
            <div className="mt-5 grid gap-2">
              <button
                type="button"
                onClick={openTeamPriceFlow}
                disabled={busy || expired}
                className="fixed inset-x-4 bottom-4 z-40 inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-rose-500 px-5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(244,63,94,0.28)] transition hover:bg-rose-600 disabled:opacity-50 sm:static sm:w-full sm:shadow-none"
              >
                Buy at Team Price
                <ArrowRight className="h-4 w-4" />
              </button>
              {product.productUrl ? (
                <a href={product.productUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-[8px] border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
                  View product on site
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
              {expired ? <p className="mt-2 text-sm font-semibold text-rose-700">This room has expired.</p> : null}
              {message ? <p className="mt-2 text-sm font-semibold text-cyan-700">{message}</p> : null}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-5">
        {(product.howToUse || product.ingredients) ? (
          <details className="mt-4 rounded-[8px] border border-slate-200 bg-white p-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-950">Product details</summary>
            <div className="mt-3 space-y-4 text-sm leading-6 text-slate-600">
              {product.howToUse ? (
                <div>
                  <p className="font-semibold text-slate-950">How to use</p>
                  <p className="mt-1">{product.howToUse}</p>
                </div>
              ) : null}
              {product.ingredients ? (
                <div>
                  <p className="font-semibold text-slate-950">Ingredients</p>
                  <p className="mt-1">{product.ingredients}</p>
                </div>
              ) : null}
            </div>
          </details>
        ) : null}
      </section>

      {flowOpen ? (
        <div className="fixed inset-0 z-50 overflow-x-hidden bg-slate-950/45 px-0 py-4 backdrop-blur-sm sm:grid sm:place-items-center sm:px-4">
          <div className="fixed inset-x-0 bottom-0 w-full max-w-full overflow-x-hidden overflow-y-auto rounded-t-[16px] bg-white p-4 shadow-[0_-18px_60px_rgba(15,23,42,0.22)] sm:static sm:max-h-[88vh] sm:w-full sm:max-w-md sm:rounded-[12px] sm:p-5">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-700">Team price</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                  {flowStep === "intro" ? "Unlock this price together" : flowStep === "joined" ? "You are in" : "Verify your phone"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setFlowOpen(false)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {flowStep === "intro" ? (
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
                        <div className="absolute left-8 top-8 h-3 w-3 animate-ping rounded-full bg-white/80" />
                        <div className="absolute right-10 top-4 h-2 w-2 animate-ping rounded-full bg-white/70 [animation-delay:350ms]" />
                      </div>
                    ) : null}
                    {activeIntro.graphic === "share" ? (
                      <div className="relative flex h-full w-full items-center justify-center">
                        <div className="absolute left-1/2 top-1/2 h-px w-44 -translate-x-1/2 -translate-y-1/2 bg-cyan-500/30" />
                        <div className="absolute left-[28%] top-[30%] h-px w-28 rotate-45 bg-cyan-500/30" />
                        <div className="absolute left-[28%] bottom-[30%] h-px w-28 -rotate-45 bg-cyan-500/30" />
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
                        <div className="absolute right-12 top-7 grid h-8 w-8 animate-pulse place-items-center rounded-full bg-cyan-500 text-white">
                          <Share2 className="h-4 w-4" />
                        </div>
                      </div>
                    ) : null}
                    {activeIntro.graphic === "discount" ? (
                      <div className="relative flex h-full w-full items-center justify-center">
                        <div className="absolute left-7 top-5 rotate-[-8deg] rounded-[10px] bg-white p-3 text-center shadow-md">
                          <p className="text-[10px] font-bold opacity-60">YOU</p>
                          <p className="text-sm font-semibold">{formatCatalogPrice(selectedTeamPrice)}</p>
                        </div>
                        <div className="absolute right-7 top-5 rotate-[8deg] rounded-[10px] bg-white p-3 text-center shadow-md">
                          <p className="text-[10px] font-bold opacity-60">FRIEND</p>
                          <p className="text-sm font-semibold">{formatCatalogPrice(selectedTeamPrice)}</p>
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
                {instructionsOnly ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIntroIndex((current) => Math.max(0, current - 1))}
                      disabled={introIndex === 0}
                      className="h-11 rounded-[8px] border border-slate-200 px-5 text-sm font-semibold text-slate-700 disabled:opacity-45"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setIntroIndex((current) => Math.min(introSlides.length - 1, current + 1))}
                      disabled={introIndex === introSlides.length - 1}
                      className="h-11 rounded-[8px] border border-slate-200 px-5 text-sm font-semibold text-slate-700 disabled:opacity-45"
                    >
                      Next
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (introIndex < introSlides.length - 1) {
                          setIntroIndex((current) => current + 1);
                          return;
                        }
                        void joinTeamPriceRoom();
                      }}
                      disabled={busy}
                      className="h-12 rounded-[8px] bg-rose-500 px-5 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {busy ? "Checking..." : introIndex < introSlides.length - 1 ? "Next" : "Continue"}
                    </button>
                    <button
                      type="button"
                      onClick={joinTeamPriceRoom}
                      disabled={busy}
                      className="h-11 rounded-[8px] px-5 text-sm font-semibold text-slate-600 disabled:opacity-50"
                    >
                      Skip intro
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {flowStep === "phone" ? (
              <div className="mt-5 space-y-4">
                <p className="text-sm leading-6 text-slate-600">Enter your phone number once. We will verify it with an OTP and add you to this team-price room.</p>
                <label className="block text-sm font-semibold text-slate-700">
                  Mobile number
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="mt-1 h-12 w-full rounded-[8px] border border-slate-200 px-3 text-base outline-none focus:border-cyan-500"
                  />
                </label>
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={busy || !phone.trim()}
                  className="h-12 w-full rounded-[8px] bg-rose-500 px-5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "Sending..." : "Send OTP"}
                </button>
              </div>
            ) : null}

            {flowStep === "otp" ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-[8px] bg-cyan-50 p-4 text-sm text-cyan-950">
                  OTP sent to <span className="font-semibold">{phone}</span>.
                  {demoOtp ? <span className="mt-1 block font-semibold">Demo OTP: {demoOtp}</span> : null}
                </div>
                <label className="block text-sm font-semibold text-slate-700">
                  Enter OTP
                  <input
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="mt-1 h-12 w-full rounded-[8px] border border-slate-200 px-3 text-center text-lg font-semibold tracking-[0.3em] outline-none focus:border-cyan-500"
                  />
                </label>
                <button
                  type="button"
                  onClick={verifyOtpAndJoin}
                  disabled={busy || otp.length < 6}
                  className="h-12 w-full rounded-[8px] bg-rose-500 px-5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "Verifying..." : "Verify & join"}
                </button>
              </div>
            ) : null}

            {flowStep === "joined" ? (
              <div className="mt-5 min-w-0 space-y-4">
                <div className="rounded-[10px] bg-emerald-50 p-4 text-emerald-950">
                  <p className="font-semibold">You have joined this team-price room.</p>
                  <p className="mt-1 text-sm leading-5">Share it with friends or family. When {threshold} people join, everyone gets the team price.</p>
                </div>
                {shareUrl ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={shareRoom}
                      className="inline-flex min-h-12 w-full min-w-0 items-center justify-center gap-2 rounded-[8px] bg-rose-500 px-4 py-3 text-sm font-semibold text-white"
                    >
                      <Share2 className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 truncate">Share room</span>
                    </button>
                    <button
                      type="button"
                      onClick={copyShareLink}
                      className="inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-[8px] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
                    >
                      <Copy className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 truncate">Copy link</span>
                    </button>
                    <p className="break-words rounded-[8px] bg-slate-50 p-3 text-xs leading-5 text-slate-600">{shareText}</p>
                    {shareFeedback ? <p className="rounded-[8px] bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800">{shareFeedback}</p> : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {flowError ? <p className="mt-4 rounded-[8px] bg-rose-50 p-3 text-sm font-semibold text-rose-700">{flowError}</p> : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
