export type SupportedPlatform = "nykaa";

export type FetchedProduct = {
  platform: SupportedPlatform;
  sourceUrl: string;
  canonicalUrl?: string;
  externalProductId?: string;
  parentProductId?: string;
  skuId?: string;
  variantType?: string;
  title: string;
  brandName?: string;
  description?: string;
  imageUrl?: string;
  mrp?: number;
  currentPrice?: number;
  currency?: string;
  raw?: unknown;
};
