import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccountProfile } from "@/lib/account-auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { addProductToPoolCart } from "@/lib/product-pools";
import { adminPhoneLabel, escapeTelegramHtml, sendTelegramMessage } from "@/lib/telegram";

type RouteProps = {
  params: Promise<{ poolId: string }>;
};

export async function POST(_request: NextRequest, { params }: RouteProps) {
  try {
    const profile = await getCurrentAccountProfile();
    const supabase = createAdminClient();

    if (!profile || !supabase) {
      return NextResponse.json({ message: "Login to join this pool and get notified when the target price unlocks." }, { status: 401 });
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
    const currentPrice = productRelation?.sale_price ?? productRelation?.mrp ?? pool.current_market_price ?? pool.mrp ?? null;
    const targetPrice = result.pool?.unlock_price ?? (currentPrice ? Math.round(Number(currentPrice) * 0.8) : null);

    void sendTelegramMessage({
      text: [
        "<b>Product pool joined</b>",
        `Phone: ${escapeTelegramHtml(adminPhoneLabel(profile.phone))}`,
        `Product: ${escapeTelegramHtml(productRelation?.title ?? "Product")}`,
        `Pool: <b>${escapeTelegramHtml(result.pool.id)}</b>`,
        `Members: ${escapeTelegramHtml(`${result.pool.current_join_count}/${result.pool.unlock_threshold}`)}`,
        `Target price: ${escapeTelegramHtml(targetPrice ? `INR ${targetPrice}` : "Not available")}`,
        `Source: existing pool`,
      ].join("\n"),
    }).catch((telegramError) => console.error("Telegram product pool notification failed:", telegramError));

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Could not join product pool." }, { status: 400 });
  }
}
