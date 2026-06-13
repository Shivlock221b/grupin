import { NextRequest, NextResponse } from "next/server";
import { absoluteUrl, fetchHtml, numberFrom, textFromHtml } from "@/lib/product-fetchers/shared";

type NykaaSearchResult = {
  id: string;
  title: string;
  url: string;
  imageUrl: string | null;
  mrp: number | null;
  salePrice: number | null;
  rating: number | null;
  ratingCount: number | null;
};

const NYKAA_ORIGIN = "https://www.nykaa.com";

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeImageUrl(value?: string | null) {
  if (!value) return null;
  const absolute = absoluteUrl(decodeHtml(value), NYKAA_ORIGIN);
  if (!absolute) return null;
  return absolute.replace(/\/tr:[^/]+\//, "/tr:h-800,w-800,cm-pad_resize/");
}

function productIdFromUrl(value: string) {
  return value.match(/\/p\/(\d+)/i)?.[1] ?? value;
}

function cleanUrl(value: string) {
  const absolute = absoluteUrl(decodeHtml(value), NYKAA_ORIGIN);
  if (!absolute) return null;
  try {
    const url = new URL(absolute);
    return `${url.origin}${url.pathname}${url.search}`;
  } catch {
    return absolute;
  }
}

function extractSearchResults(html: string, limit: number): NykaaSearchResult[] {
  const results: NykaaSearchResult[] = [];
  const cardRegex = /<a\b[^>]*href=["']([^"']*\/p\/\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = cardRegex.exec(html)) && results.length < limit * 3) {
    const url = cleanUrl(match[1]);
    const body = match[2];
    if (!url || !/Regular price|Discounted price|star rating|<h2\b/i.test(body)) continue;

    const imageMatch = body.match(/<img\b[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["']/i)
      ?? body.match(/<img\b[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']+)["']/i);
    const imageUrlValue = imageMatch
      ? (imageMatch[1]?.startsWith("http") ? imageMatch[1] : imageMatch[2])
      : null;
    const imageAlt = imageMatch
      ? (imageMatch[2]?.startsWith("http") ? imageMatch[1] : imageMatch[2])
      : null;
    const h2 = body.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1];
    const title = textFromHtml(decodeHtml(imageAlt || h2 || ""));
    if (!title) continue;

    const text = textFromHtml(decodeHtml(body)) ?? "";
    const mrp = numberFrom(text.match(/Regular price\s*₹?([\d,]+)/i)?.[1]) ?? null;
    const salePrice = numberFrom(text.match(/Discounted price\s*₹?([\d,]+)/i)?.[1]) ?? null;
    const rating = numberFrom(body.match(/aria-label=["']([\d.]+)\s+out of 5 star rating["']/i)?.[1]) ?? null;
    const ratingCount = numberFrom(body.match(/aria-label=["']([\d,]+)\s+reviews["']/i)?.[1]) ?? null;

    results.push({
      id: `${productIdFromUrl(url)}:${results.length}`,
      title,
      url,
      imageUrl: normalizeImageUrl(imageUrlValue),
      mrp,
      salePrice,
      rating,
      ratingCount,
    });
  }

  const unique = new Map<string, NykaaSearchResult>();
  for (const result of results) {
    const key = result.url;
    if (!unique.has(key)) unique.set(key, result);
  }
  return [...unique.values()].slice(0, limit);
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(12, Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? 8)));

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const url = new URL("/search/result/", NYKAA_ORIGIN);
    url.searchParams.set("q", query);
    const html = await fetchHtml(url.href);
    const results = extractSearchResults(html, limit);
    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not search Nykaa.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
