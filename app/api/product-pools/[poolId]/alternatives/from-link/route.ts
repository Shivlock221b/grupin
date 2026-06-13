import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccountProfile } from "@/lib/account-auth";
import { inferProductCategory, productCategoryOptions } from "@/lib/product-category-inference";
import { createAdminClient } from "@/lib/supabase-admin";
import { detectPlatformFromUrl, fetchProductFromUrl, normalizeProductUrlInput } from "@/lib/product-fetchers";
import { findExistingNykaaProductFromUrl, getOrCreateOpenProductPool, productWithFetchedDisplay, upsertProductFromFetchedProduct } from "@/lib/product-pools";

type RouteProps = {
  params: Promise<{ poolId: string }>;
};

const allowedCategories = new Set<string>(productCategoryOptions);

export async function POST(request: NextRequest, { params }: RouteProps) {
  try {
    const profile = await getCurrentAccountProfile();
    const supabase = createAdminClient();

    if (!profile || !supabase) {
      return NextResponse.json({ message: "Login required. Verify your phone to add alternatives." }, { status: 401 });
    }

    const { poolId } = await params;
    const { url, category } = await request.json();

    if (typeof url !== "string" || !url.trim()) {
      return NextResponse.json({ message: "Paste a Nykaa product link." }, { status: 400 });
    }

    const productUrl = normalizeProductUrlInput(url);
    const platform = detectPlatformFromUrl(productUrl);

    if (platform !== "nykaa") {
      return NextResponse.json({ message: "Currently accepts only Nykaa product links." }, { status: 400 });
    }

    const existingProduct = await findExistingNykaaProductFromUrl(productUrl);
    let product = existingProduct;
    let inferredCategory = product
      ? inferProductCategory({
          title: product.title,
          variantType: product.variant_type ?? undefined,
          raw: product.source_snapshot ?? {},
        })
      : null;

    if (!product) {
      const fetched = await fetchProductFromUrl(productUrl);
      const fetchedExistingProduct = await findExistingNykaaProductFromUrl(fetched.canonicalUrl ?? fetched.sourceUrl);
      product = fetchedExistingProduct ? productWithFetchedDisplay(fetchedExistingProduct, fetched) : await upsertProductFromFetchedProduct(fetched);
      inferredCategory = inferProductCategory(fetched);
    }

    const categoryValue = typeof category === "string" && allowedCategories.has(category) ? category : inferredCategory;

    if (categoryValue) {
      product.source_snapshot = {
        ...(product.source_snapshot ?? {}),
        category: categoryValue,
      };
    }

    const alternativePool = await getOrCreateOpenProductPool(product);

    if (String(alternativePool.id) === poolId) {
      return NextResponse.json({ message: "This product is already the main product." }, { status: 400 });
    }

    const { error } = await supabase
      .from("product_pool_alternatives")
      .upsert(
        {
          pool_id: poolId,
          alternative_pool_id: alternativePool.id,
          suggested_by_profile_id: profile.id,
        },
        { onConflict: "pool_id,alternative_pool_id" },
      );

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true, pool: alternativePool });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add alternative.";
    return NextResponse.json({ message }, { status: /login|required/i.test(message) ? 401 : 400 });
  }
}
