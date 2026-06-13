"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Copy, Loader2, Share2, Trash2 } from "lucide-react";
import { ProductPoolCartItem } from "@/lib/types";
import { formatCatalogPrice } from "@/lib/product-pricing";
import { productImageUrl } from "@/lib/product-images";

type PoolCartClientProps = {
  cartItems: ProductPoolCartItem[];
};

function progress(current: number, threshold: number) {
  if (!threshold) return 0;
  return Math.min(100, Math.round((current / threshold) * 100));
}

function trendTarget(count: number) {
  if (count <= 50) return 50;
  let target = 100;
  while (count > target) target *= 2;
  return target;
}

function PoolProgress({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${value}%` }} />
    </div>
  );
}

export function PoolCartClient({ cartItems }: PoolCartClientProps) {
  const router = useRouter();
  const [copiedPoolId, setCopiedPoolId] = useState("");
  const [removingItemId, setRemovingItemId] = useState("");
  const [error, setError] = useState("");

  async function sharePool(poolId: string, title: string) {
    setError("");
    setCopiedPoolId("");
    const shareUrl = typeof window === "undefined" ? `/?pool=${poolId}` : `${window.location.origin}/?pool=${poolId}`;
    const shareText = `I added ${title} to my cart. Add it too if you're watching this product.`;

    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, text: shareText, url: shareUrl });
        return;
      } catch {
        // Fall back to copy if native share is unavailable or dismissed.
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedPoolId(poolId);
      window.setTimeout(() => setCopiedPoolId(""), 1800);
      return;
    }

    setError("Could not copy the product link in this browser.");
  }

  async function removeItem(itemId: string) {
    setError("");
    setRemovingItemId(itemId);

    try {
      const response = await fetch(`/api/cart/items/${itemId}`, { method: "DELETE" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message ?? "Could not remove this item.");
      }

      router.refresh();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Could not remove this item.");
    } finally {
      setRemovingItemId("");
    }
  }

  if (!cartItems.length) {
    return (
      <div className="rounded-[18px] border border-dashed border-slate-300 bg-white p-10 text-center">
        <h2 className="text-xl font-semibold text-slate-950">Your cart is empty</h2>
        <p className="mt-2 text-sm text-slate-500">Add a Nykaa Product in your cart to start tracking it.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-[10px] bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
      {cartItems.map((item) => {
        const pool = item.pool;
        const product = item.product;
        const nextTrendTarget = pool ? trendTarget(pool.currentJoinCount) : 50;
        const joinProgress = pool ? progress(pool.currentJoinCount, nextTrendTarget) : 0;
        const price = Number(item.productSnapshot.currentPrice ?? product?.salePrice ?? product?.mrp ?? 0) || null;
        const closed = pool?.status === "closed" || pool?.status === "expired";
        const title = String(item.productSnapshot.title ?? product?.title ?? "Product");

        return (
          <article key={item.id} className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_14px_42px_rgba(15,23,42,0.06)]">
            <div className="flex gap-4">
              <img src={productImageUrl(String(item.productSnapshot.imageUrl ?? product?.primaryImage ?? ""), 400)} alt="" className="h-24 w-24 shrink-0 rounded-[14px] bg-slate-50 object-contain p-2" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-700">{product?.brand?.name ?? product?.vendor ?? "Product"}</p>
                    <h2 className="mt-1 line-clamp-2 text-base font-semibold text-slate-950">{title}</h2>
                  </div>
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${closed ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-800"}`}>
                    {closed ? "Closed" : "Tracking"}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-baseline gap-3">
                  {price ? <p className="text-lg font-semibold text-slate-950">{formatCatalogPrice(price)}</p> : null}
                  <p className="text-sm font-semibold text-slate-500">Qty {item.quantity}</p>
                </div>
              </div>
            </div>

            {pool ? (
              <div className="mt-4">
                <div className="rounded-[14px] bg-slate-50 p-3">
                  <div className="mb-2 flex justify-between text-xs font-semibold text-slate-600">
                    <span>{pool.currentJoinCount} carts tracking this</span>
                    {/* <span>{nextTrendTarget}</span> */}
                  </div>
                  <PoolProgress value={joinProgress} />
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* {closed ? (
                <p className="rounded-[12px] bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">This pool is closed.</p>
              ) : (
                <p className="inline-flex items-center gap-2 rounded-[12px] bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                  <Leaf className="h-4 w-4 shrink-0" />
                  Share this product with friends to see if it trends.
                </p>
              )} */}
              {pool && !closed ? (
                <button
                  type="button"
                  onClick={() => sharePool(pool.id, title)}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:border-cyan-200 hover:bg-cyan-50 sm:w-auto"
                >
                  {copiedPoolId === pool.id ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : copiedPoolId ? <Copy className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                  {copiedPoolId === pool.id ? "Link copied" : "Share product"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                disabled={removingItemId === item.id}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-rose-100 bg-white px-5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:text-rose-300 sm:w-auto"
              >
                {removingItemId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Remove
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
