import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccountProfile } from "@/lib/account-auth";
import { recalculatePoolJoinStatus } from "@/lib/product-pools";
import { createAdminClient } from "@/lib/supabase-admin";

type RouteProps = {
  params: Promise<{ itemId: string }>;
};

export async function DELETE(_request: NextRequest, { params }: RouteProps) {
  try {
    const profile = await getCurrentAccountProfile();
    const supabase = createAdminClient();

    if (!profile || !supabase) {
      return NextResponse.json({ message: "Login required." }, { status: 401 });
    }

    const { itemId } = await params;
    const now = new Date().toISOString();
    const { data: cartItem, error: cartError } = await supabase
      .from("product_pool_cart_items")
      .update({ status: "removed", updated_at: now })
      .eq("id", itemId)
      .eq("profile_id", profile.id)
      .neq("status", "removed")
      .select("id, pool_id")
      .single();

    if (cartError || !cartItem) {
      return NextResponse.json({ message: "Cart item not found." }, { status: 404 });
    }

    await supabase
      .from("product_pool_members")
      .update({ status: "cancelled", updated_at: now })
      .eq("pool_id", cartItem.pool_id)
      .eq("profile_id", profile.id);

    await recalculatePoolJoinStatus(String(cartItem.pool_id));

    return NextResponse.json({ removed: true });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Could not remove cart item." }, { status: 400 });
  }
}
