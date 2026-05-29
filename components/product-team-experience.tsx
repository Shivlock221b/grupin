"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, CreditCard, ExternalLink, Info, Share2, ShoppingBag, Sparkles, Star, Users, X } from "lucide-react";
import { AccountMenu } from "@/components/account-menu";
import { productImageUrl } from "@/lib/product-images";
import { BrandProduct, ProductTeamCartItem, ProductTeamCheckoutProgress, ProductTeamUnlock, ProductTeamUnlockMember } from "@/lib/types";
import { effectiveTeamDiscountPercent, formatCatalogPrice, highestPricedVariant, productDisplayPrice, productSavings, teamPrice, teamPriceForProduct } from "@/lib/product-pricing";

type ProductTeamExperienceProps = {
  product: BrandProduct;
  initialUnlock?: ProductTeamUnlock | null;
  initialMembers?: ProductTeamUnlockMember[];
  initialCartItems?: ProductTeamCartItem[];
  initialCheckoutProgress?: ProductTeamCheckoutProgress[];
  initiallyJoined?: boolean;
  initialCurrentMemberId?: string | null;
  bestSellerProducts?: BrandProduct[];
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

function cartItemQuantity(item: ProductTeamCartItem) {
  return Math.max(1, Number(item.quantity ?? 1) || 1);
}

function cartItemSavings(item: ProductTeamCartItem) {
  return Math.max(0, (item.mrpSnapshot - item.teamPriceSnapshot) * cartItemQuantity(item));
}

function cartItemMrpTotal(item: ProductTeamCartItem) {
  return item.mrpSnapshot * cartItemQuantity(item);
}

function cartItemTeamTotal(item: ProductTeamCartItem) {
  return item.teamPriceSnapshot * cartItemQuantity(item);
}

function formatRemainingTime(value?: string | null) {
  if (!value) return "24 : 00 : 00";
  const diff = Math.max(0, new Date(value).getTime() - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(" : ");
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

export function ProductTeamExperience({ product, initialUnlock = null, initialMembers = [], initialCartItems = [], initialCheckoutProgress = [], initiallyJoined = false, initialCurrentMemberId = null, bestSellerProducts = [] }: ProductTeamExperienceProps) {
  const defaultVariant = highestPricedVariant(product);
  const [selectedVariantKey, setSelectedVariantKey] = useState("");
  const [imageIndex, setImageIndex] = useState(0);
  const [unlock, setUnlock] = useState<ProductTeamUnlock | null>(initialUnlock);
  const [members, setMembers] = useState(initialMembers);
  const [cartItems, setCartItems] = useState(initialCartItems);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(initialCurrentMemberId);
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
  const [, setClockTick] = useState(0);
  const displayVariant = product.variants.find((variant) => variantKey(variant) === selectedVariantKey) ?? defaultVariant;
  const selectedPrice = displayVariant?.price ?? product.priceMax ?? product.priceMin;
  const discountPercent = Math.max(unlock?.discountPercent ?? 0, effectiveTeamDiscountPercent(product));
  const selectedTeamPrice = teamPrice(selectedPrice, discountPercent);
  const savings = selectedPrice === null || selectedPrice === undefined || selectedTeamPrice === null ? null : Math.max(0, Math.round(selectedPrice - selectedTeamPrice));
  const images = uniqueValues([displayVariant?.image_url ?? "", product.detailImageUrl ?? "", product.primaryImage ?? "", ...product.imageUrls]).map((image) => productImageUrl(image, 1000));
  const hasVariants = product.variants.length > 1;
  const variantType = product.variantType === "shade" ? "shade" : product.variantType === "size" || product.variantType === "weight_configure" ? "size" : "variant";
  const variantTitle = variantType === "shade" ? "Choose shade" : variantType === "size" ? "Choose size" : "Choose variant";
  const joinedCount = unlock?.memberCount ?? members.length;
  const cartCount = unlock?.currentCount ?? new Set(cartItems.map((item) => item.memberId)).size;
  const threshold = unlock?.threshold ?? 3;
  const cartsLeftToUnlock = Math.max(0, threshold - cartCount);
  const checkoutCount = checkoutProgress.length;
  const isTeamCartPage = Boolean(initialUnlock);
  const currentMemberHasCart = Boolean(currentMemberId && cartItems.some((item) => item.memberId === currentMemberId));
  const currentMemberCartItemCount = currentMemberId
    ? cartItems.filter((item) => item.memberId === currentMemberId).reduce((total, item) => total + cartItemQuantity(item), 0)
    : 0;
  const expired = Boolean(unlock && (unlock.status === "expired" || new Date(unlock.expiresAt).getTime() <= Date.now()));
  const roomUnlocked = Boolean(unlock && !expired && (unlock.status === "unlocked" || unlock.currentCount >= unlock.threshold));
  const roomClosed = Boolean(unlock?.status === "completed" || (roomUnlocked && checkoutCount >= cartCount));
  const canCheckout = Boolean(joined && currentMemberHasCart && roomUnlocked && !roomClosed && !expired);
  const roomFullForCurrentMember = Boolean(unlock && !currentMemberHasCart && cartCount >= threshold);
  const roomTimerLabel = roomClosed ? "Team Room closed" : expired ? "Team Room expired" : "Team Room ends in";
  const roomTimerValue = roomClosed ? "Completed" : expired ? "Expired" : formatRemainingTime(unlock?.expiresAt);
  const hasLongDescription = Boolean(product.description && product.description.length > 160);
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
      text: `Share the Team Room link with friends and family. When ${threshold} members add products to their carts, the team price unlocks for those carts.`,
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
  const shareText = `I found ${product.brand?.name ?? "this brand"} team prices on GruPin. Join my Team Room, add what you want to cart, and we can unlock the discount together.`;
  const roomActivityEvents = [
    ...members.map((member) => ({
      id: `member-${member.id}`,
      type: "joined" as const,
      timestamp: member.createdAt,
      member,
      item: null,
    })),
    ...cartItems.map((item) => ({
      id: `cart-${item.id}`,
      type: "cart" as const,
      timestamp: item.createdAt ?? "",
      member: members.find((entry) => entry.id === item.memberId) ?? null,
      item,
    })),
  ].sort((first, second) => new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime());
  const teamCartSavings = cartItems.reduce((total, item) => total + cartItemSavings(item), 0);
  const bestSellers = bestSellerProducts.slice(0, 6);

  useEffect(() => {
    if (!isTeamCartPage) {
      return;
    }

    const timer = window.setInterval(() => setClockTick((current) => current + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isTeamCartPage]);

  useEffect(() => {
    const brandSlug = product.brand?.slug;

    if (isTeamCartPage || !brandSlug) {
      return;
    }

    let cancelled = false;
    fetch(`/api/product-team-cart?brandSlug=${encodeURIComponent(brandSlug)}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (cancelled || !payload?.unlock) {
          return;
        }

        setUnlock(payload.unlock);
        setMembers(payload.members ?? []);
        setCartItems(payload.cartItems ?? []);
        setCurrentMemberId(payload.currentMemberId ?? null);
        setJoined(Boolean(payload.joined));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isTeamCartPage, product.brand?.slug]);

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
    if (hasVariants && !selectedVariantKey) {
      setMessage(`Choose ${variantType === "shade" ? "a shade" : variantType === "size" ? "a size" : "a variant"} before adding to cart.`);
      setFlowError(`Choose ${variantType === "shade" ? "a shade" : variantType === "size" ? "a size" : "a variant"} before adding to cart.`);
      return;
    }

    setBusy(true);
    setMessage("");
    setFlowError("");
    try {
      const response = await fetch("/api/product-team-cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandSlug: product.brand?.slug,
          productSlug: isTeamCartPage ? undefined : product.slug,
          code: unlock?.shareCode,
          selectedVariantKey,
          quantity: 1,
        }),
      });
      const payload = await response.json();
      if (response.status === 401) {
        setFlowOpen(true);
        setFlowStep("phone");
        return;
      }
      if (!response.ok) throw new Error(payload.message ?? "Could not join unlock.");
      setUnlock(payload.unlock);
      setMembers(payload.members ?? []);
      setCartItems(payload.cartItems ?? []);
      setCurrentMemberId(payload.currentMemberId ?? currentMemberId);
      setJoined(true);
      setFlowStep("joined");
      setMessage("Added to cart. Share the Team Room to unlock the team price.");
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
    trackProductTeamCta(product, unlock ? "team_cart" : "product_detail");
    if (joined) {
      void joinTeamPriceRoom();
      return;
    }

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
      title: `Join my GruPin Team Room for ${product.brand?.name ?? product.title}`,
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

  async function leaveTeamCart() {
    if (!unlock || !window.confirm("Leave this Team Room? Your cart items will be removed.")) {
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/product-team-cart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: unlock.shareCode }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not leave Team Room.");
      }

      setJoined(false);
      setCurrentMemberId(null);
      setMessage("You left this Team Room.");
      setUnlock(payload.unlock ?? unlock);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not leave Team Room.");
    } finally {
      setBusy(false);
    }
  }

  async function updateCartItem(itemId: string, quantity: number) {
    if (!unlock) return;
    setBusy(true);
    try {
      const response = await fetch("/api/product-team-cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: unlock.shareCode, itemId, quantity }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Could not update cart.");
      setUnlock(payload.unlock ?? unlock);
      setMembers(payload.members ?? members);
      setCartItems(payload.cartItems ?? cartItems);
      setCurrentMemberId(payload.currentMemberId ?? currentMemberId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update cart.");
    } finally {
      setBusy(false);
    }
  }

  async function removeCartItem(itemId: string) {
    if (!unlock) return;
    setBusy(true);
    try {
      const response = await fetch("/api/product-team-cart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: unlock.shareCode, itemId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "Could not remove item.");
      setUnlock(payload.unlock ?? unlock);
      setMembers(payload.members ?? members);
      setCartItems(payload.cartItems ?? cartItems);
      setCurrentMemberId(payload.currentMemberId ?? currentMemberId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove item.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="overflow-x-hidden bg-[#fbfcf8] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link href={`/catalog/${product.brand?.slug ?? "foxtale"}`} className="text-xl font-semibold tracking-tight text-emerald-950">GruPin</Link>
          <AccountMenu />
        </div>
      </header>
      {!isTeamCartPage && unlock && joined && !expired && !roomClosed ? (
        <Link
          href={`/team-room/${unlock.shareCode}`}
          className="sticky top-[69px] z-30 block border-b border-lime-200 bg-lime-300 text-lime-950 shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{product.brand?.name ?? product.vendor} Team Room is active</p>
                <p className="truncate text-[11px] font-semibold text-lime-950/70 sm:hidden">{cartCount}/{threshold} member carts ready</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs font-semibold">
              <span className="hidden sm:inline">{cartCount}/{threshold} member carts ready</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/65 px-2 py-1">
                <ShoppingBag className="h-3.5 w-3.5" />
                {currentMemberCartItemCount}
              </span>
              <span className="rounded-full bg-white/65 px-2 py-1">{formatRemainingTime(unlock.expiresAt)}</span>
            </div>
          </div>
        </Link>
      ) : null}

      <section className="mx-auto grid max-w-7xl min-w-0 items-start gap-5 px-4 py-4 sm:py-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="min-w-0 overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(20,33,29,0.08)]">
          {isTeamCartPage ? (
            <div className="relative min-h-[320px] bg-[#ffe7ed] p-4 text-slate-950 sm:p-6">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.88),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(201,240,69,0.34),transparent_36%)]" />
              <div className="relative flex h-full min-h-[270px] flex-col gap-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-rose-600 shadow-sm">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-white/75 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-white">
                    {cartCount}/{threshold} member carts ready
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-rose-700">GruPin x {product.brand?.name ?? product.vendor}</p>
                  <h1 className="mt-3 break-words text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Unlock brand-wide Team Prices</h1>
                  <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-rose-950/70">
                    Add products together, unlock together, and checkout your own cart at the same Team discount.
                  </p>
                </div>

                <div className="rounded-[18px] bg-white/82 p-4 shadow-[0_16px_40px_rgba(214,63,98,0.12)] ring-1 ring-white">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-600">{roomTimerLabel}</p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{roomTimerValue}</p>
                    </div>
                    <div className="rounded-[12px] bg-lime-300 px-3 py-2 text-lime-950">
                      <p className="text-xs font-semibold text-lime-900/70">Team saved</p>
                      <p className="text-xl font-semibold">{formatCatalogPrice(teamCartSavings)}</p>
                    </div>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-rose-100">
                    <div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.min(100, (cartCount / threshold) * 100)}%` }} />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-rose-700">
                    {cartsLeftToUnlock > 0 ? `${cartsLeftToUnlock} member cart${cartsLeftToUnlock === 1 ? "" : "s"} left to unlock Team Price` : "Team Price unlocked"}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">Member carts</p>
                  </div>
                  {cartItems.length ? (
                    <div className="space-y-2">
                      {cartItems.map((item) => {
                        const member = members.find((entry) => entry.id === item.memberId);
                        const savings = cartItemSavings(item);
                        return (
                          <div key={item.id} className="rounded-[16px] bg-white p-3 text-slate-950 shadow-[0_16px_36px_rgba(214,63,98,0.12)]">
                            <div className="flex min-w-0 gap-3">
                              <Link href={`/team-price/${item.productSnapshot.brandSlug}/${item.productSnapshot.slug}`} className="shrink-0">
                                <img src={productImageUrl(item.productSnapshot.imageUrl ?? "", 180)} alt="" className="h-16 w-16 rounded-[12px] bg-slate-50 object-contain p-1" />
                              </Link>
                              <div className="min-w-0 flex-1">
                                <Link href={`/team-price/${item.productSnapshot.brandSlug}/${item.productSnapshot.slug}`} className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">
                                  {item.productSnapshot.title ?? "Product"}
                                </Link>
                                <p className="mt-1 text-xs font-semibold text-slate-500">{maskedPhone(member?.phone ?? "")} · Qty {item.quantity}</p>
                              </div>
                            </div>
                            <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-[12px] bg-slate-50 px-3 py-2 text-sm">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xs font-semibold text-slate-500">MRP</span>
                                <span className="font-bold text-slate-500 line-through decoration-rose-400 decoration-2">{formatCatalogPrice(cartItemMrpTotal(item))}</span>
                              </div>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xs font-semibold text-lime-800">Team price</span>
                                <span className="font-bold text-slate-950">{formatCatalogPrice(cartItemTeamTotal(item))}</span>
                              </div>
                              <div className="ml-auto rounded-full bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-700">
                                Save {formatCatalogPrice(savings)}
                              </div>
                            </div>
                            {item.memberId === currentMemberId && !roomClosed ? (
                              <div className="mt-3 flex flex-wrap items-center justify-end gap-1">
                                <button type="button" onClick={() => updateCartItem(item.id, item.quantity - 1)} disabled={busy || item.quantity <= 1} className="grid h-8 w-8 place-items-center rounded-full bg-white text-sm font-bold text-slate-700 ring-1 ring-slate-200 disabled:opacity-40">
                                  -
                                </button>
                                <button type="button" onClick={() => updateCartItem(item.id, item.quantity + 1)} disabled={busy || item.quantity >= 4} className="grid h-8 w-8 place-items-center rounded-full bg-white text-sm font-bold text-slate-700 ring-1 ring-slate-200 disabled:opacity-40">
                                  +
                                </button>
                                <button type="button" onClick={() => removeCartItem(item.id)} disabled={busy} className="h-8 rounded-full bg-white px-2 text-xs font-bold text-rose-700 ring-1 ring-rose-100 disabled:opacity-40">
                                  Remove
                                </button>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-[16px] bg-white/70 p-4 text-sm font-semibold leading-6 text-rose-950/70 ring-1 ring-white">
                      No products have been added yet. Join and add products from the catalog to start unlocking.
                    </div>
                  )}
                </div>

              </div>
            </div>
          ) : (
            <>
              <div className="relative grid aspect-[4/3] place-items-center bg-[#f7faf5]">
                <img src={images[imageIndex] ?? ""} alt="" className="h-full w-full object-contain p-6 sm:p-8" />
              </div>
              <div className="flex gap-2 overflow-x-auto border-t border-slate-100 p-3">
                {images.map((image, index) => (
                  <button key={image} type="button" onClick={() => setImageIndex(index)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-[12px] border ${index === imageIndex ? "border-slate-950" : "border-slate-200"}`}>
                    <img src={productImageUrl(image, 200)} alt="" className="h-full w-full object-contain bg-slate-50 p-1" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="min-w-0 rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_18px_60px_rgba(20,33,29,0.08)] sm:p-5">
          {isTeamCartPage ? (
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">How GruPin works</p>
              <h2 className="mt-2 break-words text-2xl font-semibold tracking-tight text-slate-950">Join and add to cart to unlock</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                This Team Room is for the entire {product.brand?.name ?? "brand"} catalog. Members can add products to their own carts, view each other&apos;s cart items, and unlock the discount when 3 members have non-empty carts.
              </p>
              <div className="mt-4 grid gap-3">
                <div className="grid grid-cols-[42px_1fr] gap-3 rounded-[16px] border border-cyan-100 bg-cyan-50 p-3">
                  <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-cyan-100 text-sm font-black text-cyan-900">1</span>
                  <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-cyan-700">Step 1</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">Join the Team Room</p>
                  </div>
                </div>
                <div className="grid grid-cols-[42px_1fr] gap-3 rounded-[16px] border border-lime-100 bg-lime-50 p-3">
                  <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-lime-200 text-sm font-black text-lime-950">2</span>
                  <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-lime-700">Step 2</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">Add products from catalog</p>
                  </div>
                </div>
                <div className="grid grid-cols-[42px_1fr] gap-3 rounded-[16px] border border-rose-100 bg-rose-50 p-3">
                  <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-rose-100 text-sm font-black text-rose-800">3</span>
                  <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-rose-700">Step 3</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">Checkout at Team price</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-[16px] bg-slate-50 p-4">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-600">Unlock Progress</span>
                  <span className="min-w-0 break-words text-xl font-semibold text-slate-950">
                    {cartsLeftToUnlock > 0 ? `${cartsLeftToUnlock} member cart${cartsLeftToUnlock === 1 ? "" : "s"} left` : "Team Price unlocked"}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-lime-400" style={{ width: `${Math.min(100, (cartCount / threshold) * 100)}%` }} />
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  {cartsLeftToUnlock > 0 ? `${cartCount} of ${threshold} member carts ready. ${cartsLeftToUnlock} more member cart${cartsLeftToUnlock === 1 ? "" : "s"} needed to unlock Team Price.` : `${cartCount} member carts ready. Team Price is unlocked.`}
                </p>
              </div>
            </div>
          ) : (
            <>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-700">{product.brand?.name ?? product.vendor}</p>
          <h1 className="mt-2 break-words text-2xl font-semibold leading-snug tracking-tight text-slate-950 sm:text-3xl">{product.title}</h1>
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
            <div className="rounded-[12px] bg-lime-300 px-3 py-2 text-lime-950">
              <p className="text-xs font-semibold text-lime-900/70">Team price</p>
              <p className="text-2xl font-semibold">{formatCatalogPrice(selectedTeamPrice)}</p>
            </div>
            {savings ? (
              <div className="rounded-[12px] bg-rose-50 px-3 py-2 text-rose-700">
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
                <p className="text-xs font-semibold text-slate-500">
                  {selectedVariantKey && displayVariant ? `Selected: ${variantLabel(displayVariant)}` : "Select before adding"}
                </p>
              </div>
              <div className={variantType === "shade" ? "-mx-2 mt-3 flex gap-3 overflow-x-auto px-2 py-2" : "mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4"}>
                {product.variants.map((variant) => {
                  const key = variantKey(variant);
                  const active = selectedVariantKey === key;
                  const label = variantLabel(variant);

                  if (variantType === "shade") {
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setSelectedVariantKey(key);
                          setImageIndex(0);
                        }}
                        className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white transition ${
                          active ? "ring-2 ring-slate-950 ring-offset-2" : "ring-1 ring-slate-200 hover:ring-cyan-300"
                        } ${variant.available === false ? "opacity-45" : ""}`}
                        aria-label={`Choose shade ${label}`}
                        title={label}
                      >
                        {variant.shade_image ? (
                          <img src={productImageUrl(variant.shade_image, 96)} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="grid h-full w-full place-items-center bg-slate-100 text-[10px] font-semibold uppercase text-slate-500">
                            {label.slice(0, 2)}
                          </span>
                        )}
                        {active ? (
                          <span className="absolute inset-0 grid place-items-center bg-black/10">
                            <Check className="h-4 w-4 rounded-full bg-white p-0.5 text-slate-950 shadow-sm" />
                          </span>
                        ) : null}
                        {variant.available === false ? <span className="absolute inset-x-1 top-1/2 h-px -rotate-45 bg-rose-500" /> : null}
                      </button>
                    );
                  }

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSelectedVariantKey(key);
                        setImageIndex(0);
                      }}
                      className={`min-h-12 rounded-[12px] border p-2 text-left text-sm font-semibold transition ${
                        active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-800 hover:border-cyan-300"
                      }`}
                    >
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
              <p className="mt-2 text-xs leading-5 text-slate-500">Choose the variant you want before adding this item to cart.</p>
            </div>
          ) : null}
            </>
          )}

          {isTeamCartPage && unlock ? (
            <div className="mt-5 space-y-3">
              <div className="min-w-0 rounded-[16px] border border-cyan-200 bg-cyan-50 p-3 sm:p-4">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <Share2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-950">Share this Team Room</p>
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
                  <button type="button" onClick={shareRoom} className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-[12px] bg-slate-950 px-3 text-sm font-semibold text-white sm:w-auto">
                    <Copy className="h-4 w-4" />
                    Share
                  </button>
                </div>
                {shareFeedback ? <p className="mt-3 rounded-[8px] bg-white/70 px-3 py-2 text-sm font-semibold text-cyan-800">{shareFeedback}</p> : null}
              </div>
              {roomActivityEvents.length ? (
                <div className="rounded-[16px] border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">Team Room activity</p>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{roomActivityEvents.length} updates</span>
                  </div>
                  <div className="mt-3 h-72 space-y-2 overflow-y-auto pr-1">
                    {roomActivityEvents.map((event) => {
                      if (event.type === "joined") {
                        return (
                          <div key={event.id} className="flex items-center gap-3 rounded-full bg-rose-50 px-3 py-2">
                            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cyan-100 text-cyan-800">
                              <Users className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-800">{maskedPhone(event.member.phone)} joined Team Room</p>
                              <p className="text-xs font-medium text-slate-500">{formatJoinedTime(event.timestamp)}</p>
                            </div>
                          </div>
                        );
                      }

                      const item = event.item;
                      return (
                        <div key={event.id} className="flex items-center gap-3 rounded-full bg-lime-50 px-3 py-2">
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lime-100 text-lime-800">
                            <Check className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {maskedPhone(event.member?.phone ?? "")} added {item.productSnapshot.title ?? "an item"} to cart
                            </p>
                            <p className="text-xs font-medium text-slate-500">{item.quantity} item{item.quantity > 1 ? "s" : ""}{event.timestamp ? ` · ${formatJoinedTime(event.timestamp)}` : ""}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {!isTeamCartPage && cartItems.length ? (
                <div className="rounded-[16px] border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">Cart items</p>
                  </div>
                  <div className="mt-3 space-y-2">
                    {cartItems.map((item) => {
                      const member = members.find((entry) => entry.id === item.memberId);
                      return (
                        <div
                          key={item.id}
                          className="flex min-w-0 flex-col gap-3 rounded-[12px] bg-slate-50 px-3 py-2 sm:flex-row sm:items-center"
                        >
                          <Link href={`/team-price/${item.productSnapshot.brandSlug}/${item.productSnapshot.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
                            <img src={productImageUrl(item.productSnapshot.imageUrl ?? "", 120)} alt="" className="h-11 w-11 shrink-0 rounded-[8px] object-cover" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-800">{item.productSnapshot.title ?? "Product"}</p>
                              <p className="text-xs font-medium text-slate-500">
                                {maskedPhone(member?.phone ?? "")} · Qty {item.quantity}
                              </p>
                            </div>
                          </Link>
                          {item.memberId === currentMemberId && !roomClosed ? (
                            <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-1 sm:w-auto sm:shrink-0">
                              <button type="button" onClick={() => updateCartItem(item.id, item.quantity - 1)} disabled={busy || item.quantity <= 1} className="grid h-8 w-8 place-items-center rounded-full bg-white text-sm font-bold text-slate-700 ring-1 ring-slate-200 disabled:opacity-40">
                                -
                              </button>
                              <button type="button" onClick={() => updateCartItem(item.id, item.quantity + 1)} disabled={busy || item.quantity >= 4} className="grid h-8 w-8 place-items-center rounded-full bg-white text-sm font-bold text-slate-700 ring-1 ring-slate-200 disabled:opacity-40">
                                +
                              </button>
                              <button type="button" onClick={() => removeCartItem(item.id)} disabled={busy} className="h-8 rounded-full bg-white px-2 text-xs font-bold text-rose-700 ring-1 ring-rose-100 disabled:opacity-40">
                                Remove
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {roomUnlocked ? (
                <div className="rounded-[16px] border border-lime-200 bg-lime-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">Checkout progress</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {roomClosed ? "This Team Room is closed. All eligible carts have checked out." : `${checkoutCount} of ${cartCount} eligible carts have placed their order on hold.`}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-lime-900">{checkoutCount}/{cartCount}</span>
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
                            <p className="text-xs font-medium text-slate-500">{order.status === "confirmed" ? "Confirmed" : order.status === "refund_pending" ? "Refund pending" : "Order on hold"}{order.createdAt ? ` · ${formatJoinedTime(order.createdAt)}` : ""}</p>
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

          {isTeamCartPage ? (
            <div className="mt-5 grid gap-2">
              {expired ? (
                <div className="rounded-[8px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                  This Team Room has expired. Paid hold orders, if any, will move to refund pending.
                </div>
              ) : roomClosed ? (
                <div className="rounded-[8px] border border-lime-200 bg-lime-50 px-4 py-3 text-sm font-semibold text-lime-900">
                  Team Room closed. All team orders have been placed.
                </div>
              ) : joined && currentMemberHasCart ? (
                <div className="fixed inset-x-4 bottom-4 z-40 grid gap-2 sm:static sm:w-full sm:shadow-none">
                  {canCheckout ? (
                    <Link href={`/team-checkout/${unlock?.shareCode}`} className="inline-flex h-12 items-center justify-center rounded-[12px] bg-lime-300 px-3 text-sm font-bold text-lime-950 shadow-[0_16px_36px_rgba(132,204,22,0.22)] transition hover:bg-lime-200 sm:w-full sm:shadow-none">
                      Complete Purchase
                    </Link>
                  ) : (
                    <Link href={`/catalog/${product.brand?.slug ?? "brand"}`} className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-rose-500 px-3 text-sm font-bold text-white shadow-[0_16px_36px_rgba(244,63,94,0.28)] transition hover:bg-rose-600 sm:w-full sm:px-5 sm:shadow-none">
                      Continue Shopping
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              ) : joined ? (
                <>
                  {roomFullForCurrentMember ? (
                    <div className="rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                      This Team Room already has {threshold} eligible carts. Leave this room to start a new one.
                    </div>
                  ) : null}
                  <Link href={`/catalog/${product.brand?.slug ?? "brand"}`} className="fixed inset-x-4 bottom-4 z-40 inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-rose-500 px-5 text-sm font-bold text-white shadow-[0_16px_36px_rgba(244,63,94,0.28)] transition hover:bg-rose-600 sm:static sm:w-full sm:shadow-none">
                    Explore Catalog
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              ) : (
                <button
                  type="button"
                  onClick={openTeamPriceFlow}
                  disabled={busy || expired}
                  className="fixed inset-x-4 bottom-4 z-40 inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-rose-500 px-5 text-sm font-bold text-white shadow-[0_16px_36px_rgba(244,63,94,0.28)] transition hover:bg-rose-600 disabled:opacity-50 sm:static sm:w-full sm:shadow-none"
                >
                  Join Team Room
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
              {joined && unlock && !roomClosed && !expired && !(roomUnlocked && currentMemberHasCart) ? (
                <button type="button" onClick={leaveTeamCart} disabled={busy} className="inline-flex h-11 w-full items-center justify-center rounded-[12px] border border-rose-200 bg-white px-3 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50">
                  Leave Team Room
                </button>
              ) : null}
              {message ? <p className="mt-2 text-sm font-semibold text-cyan-700">{message}</p> : null}
            </div>
          ) : (
            <div className="mt-5 grid gap-2">
              {roomFullForCurrentMember ? (
                <div className="rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                  This Team Room already has {threshold} eligible carts. Start a new Team Room to unlock this product.
                </div>
              ) : null}
              <button
                type="button"
                onClick={openTeamPriceFlow}
                disabled={busy || expired || roomFullForCurrentMember}
                className="fixed inset-x-4 bottom-4 z-40 inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-rose-500 px-5 text-sm font-black text-white shadow-[0_16px_36px_rgba(244,63,94,0.28)] transition hover:bg-rose-600 disabled:opacity-50 sm:static sm:w-full sm:shadow-none"
              >
                {roomFullForCurrentMember ? "Team Room full" : "Add to Cart"}
                <ArrowRight className="h-4 w-4" />
              </button>
              {product.productUrl ? (
                <a href={product.productUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-[12px] border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50">
                  View product on site
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
              {expired ? <p className="mt-2 text-sm font-semibold text-rose-700">This Team Room has expired.</p> : null}
              {message ? <p className="mt-2 text-sm font-semibold text-cyan-700">{message}</p> : null}
            </div>
          )}
        </div>
      </section>

      {!isTeamCartPage ? (
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
      ) : bestSellers.length ? (
        <section className="mx-auto max-w-7xl px-4 pb-24 sm:pb-12">
          <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-[0_14px_40px_rgba(15,118,110,0.06)] sm:p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-700">Best sellers</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Add more to unlock faster</h2>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {bestSellers.map((item) => {
                const price = productDisplayPrice(item);
                const discounted = teamPriceForProduct(item);
                const saved = productSavings(item);
                const imageUrl = productImageUrl(item.primaryImage ?? item.imageUrls[0], 700);

                return (
                  <Link
                    key={item.id}
                    href={`/team-price/${item.brand?.slug ?? product.brand?.slug ?? "brand"}/${item.slug}`}
                    className="group overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,118,110,0.06)] transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-[0_18px_50px_rgba(15,118,110,0.12)]"
                  >
                    <div className="relative aspect-square overflow-hidden bg-[#f7faf5]">
                      <img src={imageUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain p-3 transition duration-300 group-hover:scale-105 sm:p-5" />
                    </div>
                    <div className="p-3 sm:p-4">
                      <p className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-slate-950">{item.title}</p>
                      <div className="mt-3 rounded-[12px] bg-slate-50 p-2.5 sm:p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-emerald-700">Team price</p>
                            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                              <p className="text-lg font-semibold text-slate-950 sm:text-xl">{formatCatalogPrice(discounted)}</p>
                              <p className="text-xs font-semibold text-slate-500 sm:text-sm">
                                MRP <span className="line-through decoration-rose-400 decoration-2">{formatCatalogPrice(price)}</span>
                              </p>
                            </div>
                          </div>
                          {saved ? (
                            <div className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1.5 text-right text-[11px] font-black leading-tight text-rose-700 sm:text-xs">
                              Save<br />{formatCatalogPrice(saved)}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <span className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-[10px] bg-rose-500 px-2 text-xs font-black text-white transition group-hover:bg-rose-600 sm:h-11 sm:px-3 sm:text-sm">
                        View Product
                      </span>
                    </div>
                  </Link>
                );
              })}
              <Link
                href={`/catalog/${product.brand?.slug ?? "brand"}`}
                className="group flex min-h-[260px] flex-col justify-between rounded-[16px] border border-dashed border-cyan-300 bg-cyan-50 p-4 text-cyan-950 transition hover:border-cyan-500 hover:bg-cyan-100 sm:min-h-full"
              >
                <div>
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-white text-cyan-700 shadow-sm">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-lg font-semibold tracking-tight">Explore More</p>
                  <p className="mt-2 text-sm leading-5 text-cyan-900/75">Find more products from {product.brand?.name ?? "this brand"} and add them to cart.</p>
                </div>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-cyan-700">
                  Full catalog
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {flowOpen ? (
        <div className="fixed inset-0 z-50 overflow-x-hidden bg-slate-950/45 px-0 py-4 backdrop-blur-sm sm:grid sm:place-items-center sm:px-4">
          <div className="fixed inset-x-0 bottom-0 w-full max-w-full overflow-x-hidden overflow-y-auto rounded-t-[16px] bg-white p-4 shadow-[0_-18px_60px_rgba(15,23,42,0.22)] sm:static sm:max-h-[88vh] sm:w-full sm:max-w-md sm:rounded-[12px] sm:p-5">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-cyan-700">Team price</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              {flowStep === "intro" ? "Unlock this price together" : flowStep === "joined" ? "Added to Cart" : "Verify your phone"}
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
                <p className="text-sm leading-6 text-slate-600">Enter your phone number once. We will verify it with an OTP and add this item to cart.</p>
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
                  <p className="font-semibold">{isTeamCartPage ? "You have joined this Team Room." : "This item is in cart."}</p>
                  <p className="mt-1 text-sm leading-5">Share it with friends or family. When {threshold} members add products, eligible carts unlock the team price.</p>
                </div>
                {shareUrl ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={shareRoom}
                      className="inline-flex min-h-12 w-full min-w-0 items-center justify-center gap-2 rounded-[8px] bg-rose-500 px-4 py-3 text-sm font-semibold text-white"
                    >
                      <Share2 className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 truncate">Share Team Room</span>
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
