import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccountProfile } from "@/lib/account-auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { addProductToPoolCart } from "@/lib/product-pools";

type RouteProps = {
  params: Promise<{ poolId: string }>;
};

export async function POST(_request: NextRequest, { params }: RouteProps) {
  try {
    const profile = await getCurrentAccountProfile();
    const supabase = createAdminClient();

    if (!profile || !supabase) {
      return NextResponse.json({ message: "Login required. Verify your phone to join this pool." }, { status: 401 });
    }

    const { poolId } = await params;
    const { data: pool, error } = await supabase
      .from("product_pools")
      .select("*, products(id, title, slug, primary_image, mrp, sale_price)")
      .eq("id", poolId)
      .single();

    if (error || !pool) {
      return NextResponse.json({ message: "Product pool not found." }, { status: 404 });
    }

    const productRelation = Array.isArray(pool.products) ? pool.products[0] : pool.products;
    const result = await addProductToPoolCart(profile.id, pool, productRelation);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Could not join product pool." }, { status: 400 });
  }
}
