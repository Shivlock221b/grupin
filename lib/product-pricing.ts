import { BrandProduct } from "@/lib/types";

export const TEAM_DISCOUNT_PERCENT = 25;

export function highestPricedVariant(product: BrandProduct) {
  return product.variants.reduce<BrandProduct["variants"][number] | null>((highest, variant) => {
    if (variant.price === null || variant.price === undefined) {
      return highest;
    }

    if (!highest || highest.price === null || highest.price === undefined || variant.price > highest.price) {
      return variant;
    }

    return highest;
  }, null);
}

export function productDisplayPrice(product: BrandProduct) {
  return highestPricedVariant(product)?.price ?? product.mrp ?? product.priceMax ?? product.priceMin ?? null;
}

export function effectiveTeamDiscountPercent(product: BrandProduct) {
  const sourceDiscount = product.sourceDiscountPercent ?? 0;
  const discount = sourceDiscount > TEAM_DISCOUNT_PERCENT ? sourceDiscount + 10 : TEAM_DISCOUNT_PERCENT;
  return Math.max(0, Math.min(95, discount));
}

export function formatCatalogPrice(price?: number | null) {
  if (price === null || price === undefined || Number.isNaN(price)) {
    return "Price on site";
  }

  return `₹${Math.round(price).toLocaleString("en-IN")}`;
}

export function teamPrice(price?: number | null, discountPercent = TEAM_DISCOUNT_PERCENT) {
  return price === null || price === undefined ? null : Math.round(price * (1 - discountPercent / 100));
}

export function teamPriceForProduct(product: BrandProduct) {
  return teamPrice(productDisplayPrice(product), effectiveTeamDiscountPercent(product));
}

export function productSavings(product: BrandProduct) {
  const price = productDisplayPrice(product);
  const discounted = teamPriceForProduct(product);
  return price === null || discounted === null ? null : Math.max(0, Math.round(price - discounted));
}
