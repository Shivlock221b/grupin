import { detectPlatformFromUrl, normalizeProductUrlInput } from "@/lib/product-fetchers/shared";
import { fetchNykaaProduct } from "@/lib/product-fetchers/nykaa";

export { detectPlatformFromUrl, normalizeProductUrlInput } from "@/lib/product-fetchers/shared";
export type { FetchedProduct, SupportedPlatform } from "@/lib/product-fetchers/types";

export async function fetchProductFromUrl(url: string) {
  const productUrl = normalizeProductUrlInput(url);
  const platform = detectPlatformFromUrl(productUrl);
  if (!platform) {
    throw new Error("Paste a Nykaa product link.");
  }

  return fetchNykaaProduct(productUrl);
}
