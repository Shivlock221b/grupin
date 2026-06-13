import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccountProfile } from "@/lib/account-auth";
import { inferProductCategory, productCategoryOptions } from "@/lib/product-category-inference";
import { detectPlatformFromUrl, fetchProductFromUrl, normalizeProductUrlInput } from "@/lib/product-fetchers";
import { addProductToPoolCart, findExistingNykaaProductFromUrl, getOrCreateOpenProductPool, productWithFetchedDisplay, upsertProductFromFetchedProduct } from "@/lib/product-pools";

const allowedCategories = new Set<string>(productCategoryOptions);

export async function POST(request: NextRequest) {
  try {
    const profile = await getCurrentAccountProfile();

    if (!profile) {
      return NextResponse.json({ message: "Login required. Verify your phone to add this product." }, { status: 401 });
    }

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
    const openPool = await getOrCreateOpenProductPool(product);
    const result = await addProductToPoolCart(profile.id, openPool, product);

    return NextResponse.json({
      product,
      pool: result.pool,
      cartItem: result.cartItem,
      membership: result.membership,
      alreadyJoined: false,
      poolStatus: result.pool.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add this product.";
    return NextResponse.json({ message }, { status: /login|required/i.test(message) ? 401 : 400 });
  }
}
