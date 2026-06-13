import { FetchedProduct } from "@/lib/product-fetchers/types";
import { absoluteUrl, fetchHtml, firstProductJsonLd, linkHref, metaContent, normalizeFetchedProduct, numberFrom } from "@/lib/product-fetchers/shared";

export function nykaaProductId(url: string) {
  return nykaaParentProductId(url);
}

export function nykaaParentProductId(url: string) {
  return url.match(/[?&]productId=(\d+)/)?.[1] ?? url.match(/\/p\/(\d+)/)?.[1];
}

export function nykaaSkuId(url: string) {
  return url.match(/[?&]skuId=(\d+)/)?.[1];
}

export async function fetchNykaaProduct(sourceUrl: string): Promise<FetchedProduct> {
  const html = await fetchHtml(sourceUrl);
  const jsonLd: Record<string, unknown> = firstProductJsonLd(html) ?? {};
  const canonicalUrl = absoluteUrl(linkHref(html, "canonical"), sourceUrl) ?? sourceUrl;
  const title = String(jsonLd?.name ?? metaContent(html, "og:title") ?? "");
  const brand = jsonLd?.brand && typeof jsonLd.brand === "object" ? (jsonLd.brand as Record<string, unknown>).name : jsonLd?.brand;
  const offers = jsonLd?.offers && typeof jsonLd.offers === "object" ? jsonLd.offers as Record<string, unknown> : null;
  const image = Array.isArray(jsonLd?.image) ? jsonLd.image[0] : jsonLd?.image;

  return normalizeFetchedProduct({
    platform: "nykaa",
    sourceUrl,
    canonicalUrl,
    externalProductId: nykaaProductId(canonicalUrl) ?? nykaaProductId(sourceUrl),
    parentProductId: nykaaParentProductId(sourceUrl) ?? nykaaParentProductId(canonicalUrl),
    skuId: nykaaSkuId(sourceUrl) ?? nykaaSkuId(canonicalUrl),
    title: title || metaContent(html, "twitter:title") || "Nykaa product",
    brandName: String(brand ?? metaContent(html, "product:brand") ?? ""),
    description: String(jsonLd?.description ?? metaContent(html, "og:description") ?? ""),
    imageUrl: absoluteUrl(String(image ?? metaContent(html, "og:image") ?? ""), sourceUrl),
    mrp: numberFrom(offers?.highPrice ?? offers?.price),
    currentPrice: numberFrom(offers?.lowPrice ?? offers?.price ?? metaContent(html, "product:price:amount")),
    currency: String(offers?.priceCurrency ?? "INR"),
    raw: { jsonLd },
  });
}
