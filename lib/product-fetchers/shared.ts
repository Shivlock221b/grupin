import { FetchedProduct, SupportedPlatform } from "@/lib/product-fetchers/types";

const headers = {
  "User-Agent": "Mozilla/5.0 product trend fetcher",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-IN,en;q=0.9",
};

export async function fetchHtml(url: string) {
  const response = await fetch(url, { headers, redirect: "follow", cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Fetch failed with ${response.status}`);
  }
  return response.text();
}

export function absoluteUrl(value: string | undefined, base: string) {
  if (!value) return undefined;
  try {
    return new URL(value.replace(/&amp;/g, "&"), base).href;
  } catch {
    return undefined;
  }
}

export function textFromHtml(value?: string) {
  return value
    ?.replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function metaContent(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.match(new RegExp(`<meta\\b[^>]*(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`, "i"))?.[1]
    ?? html.match(new RegExp(`<meta\\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${escaped}["'][^>]*>`, "i"))?.[1];
}

export function linkHref(html: string, rel: string) {
  const escaped = rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.match(new RegExp(`<link\\b[^>]*rel=["'][^"']*${escaped}[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>`, "i"))?.[1]
    ?? html.match(new RegExp(`<link\\b[^>]*href=["']([^"']+)["'][^>]*rel=["'][^"']*${escaped}[^"']*["'][^>]*>`, "i"))?.[1];
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function jsonLdObjects(html: string) {
  const objects: unknown[] = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const parsed = safeJsonParse(match[1].trim());
    if (Array.isArray(parsed)) objects.push(...parsed);
    else if (parsed) objects.push(parsed);
  }
  return objects;
}

function walk(value: unknown, visitor: (value: unknown) => void, seen = new Set<unknown>()) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  visitor(value);
  if (Array.isArray(value)) value.forEach((item) => walk(item, visitor, seen));
  else Object.values(value as Record<string, unknown>).forEach((item) => walk(item, visitor, seen));
}

export function firstProductJsonLd(html: string): Record<string, unknown> | null {
  let product: Record<string, unknown> | null = null;
  for (const object of jsonLdObjects(html)) {
    walk(object, (value) => {
      if (product || !value || typeof value !== "object" || Array.isArray(value)) return;
      const item = value as Record<string, unknown>;
      const type = item["@type"];
      const types = Array.isArray(type) ? type : [type];
      if (types.map(String).some((entry) => entry.toLowerCase() === "product")) {
        product = item;
      }
    });
  }
  return product;
}

export function numberFrom(value: unknown) {
  if (value === null || value === undefined) return undefined;
  const number = Number(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(number) ? number : undefined;
}

export function normalizeFetchedProduct(input: FetchedProduct): FetchedProduct {
  return {
    ...input,
    title: textFromHtml(input.title) || "Product",
    brandName: textFromHtml(input.brandName) || undefined,
    description: textFromHtml(input.description) || undefined,
  };
}

export function detectPlatformFromUrl(url: string): SupportedPlatform | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.endsWith("nykaa.com")) return "nykaa";
    return null;
  } catch {
    return null;
  }
}

export function extractFirstUrl(value: string) {
  return value.match(/https?:\/\/[^\s<>"']+/i)?.[0]?.replace(/[),.;!?]+$/g, "") ?? null;
}

export function normalizeProductUrlInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return extractFirstUrl(trimmed) ?? trimmed;
}
