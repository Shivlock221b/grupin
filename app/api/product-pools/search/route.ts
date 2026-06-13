import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

export async function GET(request: NextRequest) {
  const supabase = createAdminClient();

  if (!supabase) {
    return NextResponse.json({ results: [] });
  }

  const query = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const excludePoolId = request.nextUrl.searchParams.get("excludePoolId")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const { data, error } = await supabase
    .from("product_pools")
    .select("id, current_join_count, source_snapshot, products(id, title, vendor, primary_image, mrp, sale_price, brands(name))")
    .in("status", ["pooling", "unlocked"])
    .order("current_join_count", { ascending: false })
    .limit(80);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  const results = ((data ?? []) as unknown as Record<string, unknown>[])
    .flatMap((row) => {
      if (String(row.id) === excludePoolId) return [];
      const productRelation = row.products;
      const product = Array.isArray(productRelation) ? productRelation[0] : productRelation;
      if (!product || typeof product !== "object") return [];
      const productRow = product as Record<string, unknown>;
      const brandRelation = productRow.brands;
      const brand = Array.isArray(brandRelation) ? brandRelation[0] : brandRelation;
      const brandName = brand && typeof brand === "object" ? text((brand as Record<string, unknown>).name) : "";
      const snapshot = row.source_snapshot && typeof row.source_snapshot === "object" ? row.source_snapshot as Record<string, unknown> : {};
      const title = text(snapshot.title) || text(productRow.title);
      const haystack = `${title} ${brandName} ${text(productRow.vendor)}`.toLowerCase();
      if (!haystack.includes(query)) return [];

      return [{
        id: String(row.id),
        title,
        brandName: brandName || text(productRow.vendor) || "Product",
        imageUrl: text(snapshot.imageUrl) || text(productRow.primary_image),
        currentJoinCount: Number(row.current_join_count ?? 0),
      }];
    })
    .slice(0, 8);

  return NextResponse.json({ results });
}
