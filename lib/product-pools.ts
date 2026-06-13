import { createAdminClient } from "@/lib/supabase-admin";
import { FetchedProduct } from "@/lib/product-fetchers";
import { nykaaParentProductId, nykaaProductId, nykaaSkuId } from "@/lib/product-fetchers/nykaa";
import { ProductVariant } from "@/lib/types";
import { slugify } from "@/lib/utils";

export const DEFAULT_UNLOCK_THRESHOLD = Number(process.env.DEFAULT_UNLOCK_THRESHOLD ?? 50);
export const DEFAULT_CHECKOUT_THRESHOLD = Number(process.env.DEFAULT_CHECKOUT_THRESHOLD ?? 50);
export const DEFAULT_CHECKOUT_WINDOW_HOURS = Number(process.env.DEFAULT_CHECKOUT_WINDOW_HOURS ?? 12);
export const DEFAULT_UNLOCK_WINDOW_HOURS = Number(process.env.DEFAULT_UNLOCK_WINDOW_HOURS ?? 48);

type PoolProductRow = {
  id: string;
  brand_id: string;
  title: string;
  slug: string;
  primary_image?: string | null;
  source_url?: string | null;
  source_platform?: string | null;
  external_product_id?: string | null;
  source_product_ids?: string[] | null;
  variant_type?: string | null;
  variants?: ProductVariant[] | null;
  selected_sku_id?: string | null;
  selected_variant?: ProductVariant | null;
  pool_key?: string | null;
  source_snapshot?: Record<string, unknown>;
  mrp?: number | null;
  sale_price?: number | null;
};

function cleanUrl(url?: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.href;
  } catch {
    return url.trim();
  }
}

function productSelectColumns() {
  return "id, brand_id, title, slug, primary_image, source_url, source_platform, external_product_id, source_product_ids, variant_type, variants, mrp, sale_price";
}

function unlockPrice(currentPrice?: number | null) {
  return currentPrice ? Math.round(currentPrice * 0.8) : null;
}

function checkoutDeadlineFromNow() {
  return new Date(Date.now() + DEFAULT_CHECKOUT_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
}

function unlockDeadlineFromNow() {
  return new Date(Date.now() + DEFAULT_UNLOCK_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
}

function isPast(value?: string | null) {
  if (!value) return false;
  return new Date(value).getTime() <= Date.now();
}

function isShadeVariantType(type?: string | null) {
  return String(type ?? "").toLowerCase() === "shade";
}

function isSizeVariantType(type?: string | null) {
  return ["size", "weight_configure", "weight", "pack_size", "volume"].includes(String(type ?? "").toLowerCase());
}

function variantKeyValues(variant: ProductVariant) {
  return [
    variant.child_id,
    variant.sku,
    ...(variant.source_variant_ids ?? []).map(String),
    ...(variant.source_product_ids ?? []).map(String),
  ].filter(Boolean).map(String);
}

function variantForSku(product: PoolProductRow, skuId?: string | null) {
  if (!skuId || !Array.isArray(product.variants)) {
    return null;
  }

  return product.variants.find((variant) => variantKeyValues(variant).includes(skuId)) ?? null;
}

function variantLabel(variant?: ProductVariant | null) {
  return variant?.variant_name ?? variant?.pack_size ?? variant?.title ?? null;
}

function variantMrp(variant?: ProductVariant | null) {
  return variant?.compare_at_price ?? variant?.price ?? variant?.sale_price ?? null;
}

function variantCurrentPrice(variant?: ProductVariant | null) {
  return variant?.sale_price ?? variant?.price ?? variant?.compare_at_price ?? null;
}

function applySelectedVariant(product: PoolProductRow, skuId?: string | null): PoolProductRow {
  const selectedVariant = variantForSku(product, skuId);

  if (!selectedVariant) {
    return {
      ...product,
      selected_sku_id: skuId ?? null,
      pool_key: product.pool_key ?? null,
    };
  }

  const mrp = variantMrp(selectedVariant);
  const currentPrice = variantCurrentPrice(selectedVariant);
  return {
    ...product,
    selected_sku_id: skuId ?? selectedVariant.child_id ?? selectedVariant.sku ?? null,
    selected_variant: selectedVariant,
    mrp: mrp ?? product.mrp ?? null,
    sale_price: currentPrice ?? product.sale_price ?? product.mrp ?? null,
    primary_image: selectedVariant.image_url ?? product.primary_image ?? null,
  };
}

function nykaaPoolKey(product: PoolProductRow, parentProductId?: string | null, skuId?: string | null) {
  const parentId = parentProductId ?? product.external_product_id ?? product.source_product_ids?.[0] ?? product.id;

  if (skuId) {
    return `nykaa:sku:${skuId}`;
  }

  return `nykaa:product:${parentId}`;
}

export function productWithFetchedDisplay(product: PoolProductRow, fetched: FetchedProduct): PoolProductRow {
  const price = fetched.currentPrice ?? fetched.mrp ?? product.sale_price ?? product.mrp ?? null;
  const mrp = fetched.mrp ?? product.mrp ?? price;
  const poolKey = nykaaPoolKey(product, fetched.parentProductId ?? fetched.externalProductId, fetched.skuId);

  return {
    ...product,
    title: fetched.title || product.title,
    primary_image: fetched.imageUrl ?? product.primary_image ?? null,
    source_url: fetched.sourceUrl ?? product.source_url ?? null,
    selected_sku_id: fetched.skuId ?? product.selected_sku_id ?? null,
    pool_key: poolKey,
    mrp,
    sale_price: price,
    source_snapshot: {
      title: fetched.title || product.title,
      imageUrl: fetched.imageUrl ?? product.primary_image ?? null,
      sourceUrl: fetched.sourceUrl ?? product.source_url ?? null,
      canonicalUrl: fetched.canonicalUrl ?? null,
      parentProductId: fetched.parentProductId ?? fetched.externalProductId ?? null,
      skuId: fetched.skuId ?? null,
      brandName: fetched.brandName ?? null,
      mrp,
      currentPrice: price,
    },
  };
}

export async function upsertProductFromFetchedProduct(fetched: FetchedProduct) {
  const supabase = createAdminClient();
  if (!supabase) throw new Error("Supabase admin client is not configured.");

  const sourceUrl = cleanUrl(fetched.sourceUrl);
  const canonicalUrl = cleanUrl(fetched.canonicalUrl);
  const brandName = fetched.brandName || "Product";
  const brandSlug = slugify(brandName);

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .upsert(
      {
        name: brandName,
        slug: brandSlug,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" },
    )
    .select("id, name, slug")
    .single();

  if (brandError || !brand) {
    throw new Error(`Could not upsert brand: ${brandError?.message ?? "brand not returned"}`);
  }

  let existing = null;
  const parentProductId = fetched.parentProductId ?? fetched.externalProductId ?? null;

  if (sourceUrl) {
    const { data, error } = await supabase
      .from("products")
      .select(productSelectColumns())
      .eq("source_url", sourceUrl)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    existing = data;
  }

  if (!existing && parentProductId) {
    const { data, error } = await supabase
      .from("products")
      .select(productSelectColumns())
      .eq("source_platform", fetched.platform)
      .eq("external_product_id", parentProductId)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    existing = data;
  }

  if (!existing && parentProductId) {
    const { data, error } = await supabase
      .from("products")
      .select(productSelectColumns())
      .contains("source_product_ids", [parentProductId])
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    existing = data;
  }

  if (!existing && canonicalUrl) {
    const { data, error } = await supabase
      .from("products")
      .select(productSelectColumns())
      .eq("canonical_url", canonicalUrl)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    existing = data;
  }

  const existingProduct = existing as unknown as PoolProductRow | null;
  const baseSlug = slugify(`${fetched.title}-${parentProductId ?? ""}`) || slugify(fetched.title);
  const productSlug = existingProduct?.slug ?? baseSlug;
  const price = fetched.currentPrice ?? fetched.mrp ?? null;
  const mrp = fetched.mrp ?? fetched.currentPrice ?? null;
  const productPayload = {
    brand_id: brand.id,
    title: fetched.title,
    slug: productSlug,
    vendor: brand.name,
    primary_image: fetched.imageUrl ?? null,
    image_urls: fetched.imageUrl ? [fetched.imageUrl] : [],
    variants: [],
    tags: [],
    product_types: [],
    price_min: price,
    price_max: price,
    source_product_ids: parentProductId ? [parentProductId] : [],
    source_handles: [],
    source_files: [],
    source_product_name: fetched.title,
    source_product_title: fetched.title,
    source_slug: canonicalUrl ? new URL(canonicalUrl).pathname.replace(/^\//, "") : null,
    source_url: sourceUrl,
    source_platform: fetched.platform,
    canonical_url: canonicalUrl,
    external_product_id: parentProductId,
    mrp,
    sale_price: fetched.currentPrice ?? null,
    source_discount_percent: mrp && fetched.currentPrice && mrp > fetched.currentPrice ? Math.round(((mrp - fetched.currentPrice) / mrp) * 100) : null,
    description: fetched.description ?? null,
    raw_payload: fetched.raw ?? {},
    source_payload: fetched.raw ?? {},
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const query = existingProduct
    ? supabase.from("products").update(productPayload).eq("id", existingProduct.id)
    : supabase.from("products").insert(productPayload);

  const { data: product, error } = await query
    .select(productSelectColumns())
    .single();

  if (error || !product) {
    throw new Error(`Could not upsert product: ${error?.message ?? "product not returned"}`);
  }

  const productRow = product as unknown as PoolProductRow;
  const poolKey = nykaaPoolKey(productRow, parentProductId, fetched.skuId);

  return applySelectedVariant({ ...productRow, pool_key: poolKey }, fetched.skuId);
}

export async function findExistingNykaaProductFromUrl(source: string): Promise<PoolProductRow | null> {
  const supabase = createAdminClient();
  if (!supabase) throw new Error("Supabase admin client is not configured.");

  const sourceUrl = cleanUrl(source);
  const externalProductId = nykaaProductId(sourceUrl ?? source);
  const parentProductId = nykaaParentProductId(sourceUrl ?? source);
  const skuId = nykaaSkuId(sourceUrl ?? source);

  if (externalProductId) {
    const { data: byExternalId, error: externalIdError } = await supabase
      .from("products")
      .select(productSelectColumns())
      .eq("source_platform", "nykaa")
      .eq("external_product_id", externalProductId)
      .limit(1)
      .maybeSingle();

    if (externalIdError) throw externalIdError;
    if (byExternalId) {
      const product = applySelectedVariant(byExternalId as unknown as PoolProductRow, skuId);
      return { ...product, pool_key: nykaaPoolKey(product, parentProductId ?? externalProductId, skuId) };
    }

    const { data: bySourceProductIds, error: sourceProductIdsError } = await supabase
      .from("products")
      .select(productSelectColumns())
      .contains("source_product_ids", [externalProductId])
      .limit(1)
      .maybeSingle();

    if (sourceProductIdsError) throw sourceProductIdsError;
    if (bySourceProductIds) {
      const product = applySelectedVariant(bySourceProductIds as unknown as PoolProductRow, skuId);
      return { ...product, pool_key: nykaaPoolKey(product, parentProductId ?? externalProductId, skuId) };
    }
  }

  if (!sourceUrl) {
    return null;
  }

  const { data: bySourceUrl, error: sourceUrlError } = await supabase
    .from("products")
    .select(productSelectColumns())
    .eq("source_url", sourceUrl)
    .limit(1)
    .maybeSingle();

  if (sourceUrlError) throw sourceUrlError;
  if (bySourceUrl) {
    const product = applySelectedVariant(bySourceUrl as unknown as PoolProductRow, skuId);
    return { ...product, pool_key: nykaaPoolKey(product, parentProductId ?? externalProductId, skuId) };
  }

  const { data: byCanonicalUrl, error: canonicalUrlError } = await supabase
    .from("products")
    .select(productSelectColumns())
    .eq("canonical_url", sourceUrl)
    .limit(1)
    .maybeSingle();

  if (canonicalUrlError) throw canonicalUrlError;
  if (!byCanonicalUrl) return null;
  const product = applySelectedVariant(byCanonicalUrl as unknown as PoolProductRow, skuId);
  return { ...product, pool_key: nykaaPoolKey(product, parentProductId ?? externalProductId, skuId) };
}

export async function getOrCreateOpenProductPool(product: { id: string; pool_key?: string | null; source_snapshot?: Record<string, unknown>; mrp?: number | null; sale_price?: number | null }) {
  const supabase = createAdminClient();
  if (!supabase) throw new Error("Supabase admin client is not configured.");
  const poolKey = product.pool_key ?? `product:${product.id}`;

  const { data: existing, error: existingError } = await supabase
    .from("product_pools")
    .select("*")
    .eq("pool_key", poolKey)
    .in("status", ["pooling", "unlocked"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) {
    if (product.source_snapshot && Object.keys(product.source_snapshot).length) {
      const currentPrice = product.sale_price ?? product.mrp ?? null;
      const existingSnapshot = existing.source_snapshot && typeof existing.source_snapshot === "object" ? existing.source_snapshot as Record<string, unknown> : {};
      const { data: refreshed, error: refreshError } = await supabase
        .from("product_pools")
        .update({
          source_snapshot: {
            ...existingSnapshot,
            ...product.source_snapshot,
          },
          unlock_price: unlockPrice(currentPrice),
          mrp: product.mrp ?? currentPrice,
          current_market_price: currentPrice,
          status: existing.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("*")
        .single();

      if (!refreshError && refreshed) {
        return refreshed;
      }
    }

    return existing;
  }

  const currentPrice = product.sale_price ?? product.mrp ?? null;
  const { data: pool, error } = await supabase
    .from("product_pools")
    .insert({
      product_id: product.id,
      pool_key: poolKey,
      unlock_threshold: DEFAULT_UNLOCK_THRESHOLD,
      checkout_threshold: DEFAULT_CHECKOUT_THRESHOLD,
      source_snapshot: product.source_snapshot && typeof product.source_snapshot === "object" ? product.source_snapshot : {},
      unlock_price: unlockPrice(currentPrice),
      mrp: product.mrp ?? currentPrice,
      current_market_price: currentPrice,
      expires_at: unlockDeadlineFromNow(),
    })
    .select("*")
    .single();

  if (error || !pool) {
    throw new Error(`Could not create product pool: ${error?.message ?? "pool not returned"}`);
  }

  return pool;
}

export async function addProductToPoolCart(profileId: string, pool: Record<string, unknown>, product: Record<string, unknown>) {
  const supabase = createAdminClient();
  if (!supabase) throw new Error("Supabase admin client is not configured.");

  if (["closed", "expired"].includes(String(pool.status))) {
    throw new Error(String(pool.status) === "closed" ? "This product pool is closed." : "This product pool is no longer active.");
  }

  const poolSnapshot = pool.source_snapshot && typeof pool.source_snapshot === "object" ? pool.source_snapshot as Record<string, unknown> : {};
  const snapshot = {
    title: poolSnapshot.title ?? product.title,
    slug: product.slug,
    imageUrl: poolSnapshot.imageUrl ?? product.primary_image,
    mrp: poolSnapshot.mrp ?? product.mrp,
    currentPrice: poolSnapshot.currentPrice ?? product.sale_price ?? product.mrp,
    skuId: poolSnapshot.skuId ?? product.selected_sku_id ?? null,
    sourceUrl: poolSnapshot.sourceUrl ?? product.source_url ?? null,
    variantLabel: product.selected_variant && typeof product.selected_variant === "object" ? variantLabel(product.selected_variant as ProductVariant) : null,
    variantType: product.variant_type ?? null,
    poolKey: pool.pool_key ?? product.pool_key ?? null,
  };

  const { data: cartItem, error: cartError } = await supabase
    .from("product_pool_cart_items")
    .upsert(
      {
        pool_id: pool.id,
        product_id: product.id,
        profile_id: profileId,
        quantity: 1,
        status: "active",
        product_snapshot: snapshot,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "pool_id,profile_id" },
    )
    .select("*")
    .single();

  if (cartError || !cartItem) {
    throw new Error(`Could not add product to cart: ${cartError?.message ?? "cart item not returned"}`);
  }

  const { data: membership, error: memberError } = await supabase
    .from("product_pool_members")
    .upsert(
      {
        pool_id: pool.id,
        profile_id: profileId,
        cart_item_id: cartItem.id,
        status: "joined",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "pool_id,profile_id" },
    )
    .select("*")
    .single();

  if (memberError || !membership) {
    throw new Error(`Could not add product to cart: ${memberError?.message ?? "membership not returned"}`);
  }

  const updatedPool = await recalculatePoolJoinStatus(String(pool.id));
  return { cartItem, membership, pool: updatedPool };
}

export async function recalculatePoolJoinStatus(poolId: string) {
  const supabase = createAdminClient();
  if (!supabase) throw new Error("Supabase admin client is not configured.");

  const { count, error: countError } = await supabase
    .from("product_pool_members")
    .select("id", { count: "exact", head: true })
    .eq("pool_id", poolId)
    .in("status", ["joined", "checked_out"]);

  if (countError) throw countError;

  const { data: current, error: currentError } = await supabase
    .from("product_pools")
    .select("*")
    .eq("id", poolId)
    .single();

  if (currentError || !current) throw currentError ?? new Error("Pool not found.");

  const joinCount = count ?? 0;
  const now = new Date().toISOString();
  const unlockThreshold = Number(current.unlock_threshold ?? DEFAULT_UNLOCK_THRESHOLD);
  const hasUnlocked = joinCount >= unlockThreshold;
  const nextStatus = hasUnlocked && current.status !== "closed" && current.status !== "expired" ? "unlocked" : current.status;
  const { data: updated, error } = await supabase
    .from("product_pools")
    .update({
      current_join_count: joinCount,
      unlock_threshold: unlockThreshold,
      status: nextStatus,
      unlocked_at: hasUnlocked ? current.unlocked_at ?? now : current.unlocked_at,
      updated_at: now,
    })
    .eq("id", poolId)
    .select("*")
    .single();

  if (error || !updated) throw error ?? new Error("Could not update pool.");
  return updated;
}

export async function markProductPoolCheckedOut(profileId: string, poolId: string) {
  const supabase = createAdminClient();
  if (!supabase) throw new Error("Supabase admin client is not configured.");

  const { data: pool, error: poolError } = await supabase
    .from("product_pools")
    .select("*")
    .eq("id", poolId)
    .single();

  if (poolError || !pool) throw poolError ?? new Error("Pool not found.");
  if (pool.status !== "unlocked") {
    throw new Error(pool.status === "pooling" ? "This product pool has not unlocked yet." : "This product pool is closed.");
  }

  const now = new Date().toISOString();
  if (isPast(pool.expires_at)) {
    await supabase
      .from("product_pools")
      .update({ status: "expired", closed_at: now, updated_at: now })
      .eq("id", poolId);
    throw new Error("This product pool checkout window has ended.");
  }

  const { data: membership, error: memberError } = await supabase
    .from("product_pool_members")
    .update({ status: "checked_out", checked_out_at: now, updated_at: now })
    .eq("pool_id", poolId)
    .eq("profile_id", profileId)
    .neq("status", "cancelled")
    .select("*")
    .single();

  if (memberError || !membership) {
    throw memberError ?? new Error("Join this product pool before checkout.");
  }

  await supabase
    .from("product_pool_cart_items")
    .update({ status: "checked_out", updated_at: now })
    .eq("pool_id", poolId)
    .eq("profile_id", profileId);

  const { count, error: countError } = await supabase
    .from("product_pool_members")
    .select("id", { count: "exact", head: true })
    .eq("pool_id", poolId)
    .eq("status", "checked_out");

  if (countError) throw countError;

  const checkoutCount = count ?? 0;
  const shouldClose = checkoutCount >= Number(pool.checkout_threshold ?? DEFAULT_CHECKOUT_THRESHOLD);
  const { data: updatedPool, error: updateError } = await supabase
    .from("product_pools")
    .update({
      successful_checkout_count: checkoutCount,
      status: shouldClose ? "closed" : pool.status,
      closed_at: shouldClose ? now : pool.closed_at,
      updated_at: now,
    })
    .eq("id", poolId)
    .select("*")
    .single();

  if (updateError || !updatedPool) throw updateError ?? new Error("Could not update pool.");
  return { membership, pool: updatedPool };
}
