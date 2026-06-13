import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccountProfile } from "@/lib/account-auth";
import { createAdminClient } from "@/lib/supabase-admin";

type RouteProps = {
  params: Promise<{ poolId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteProps) {
  try {
    const profile = await getCurrentAccountProfile();
    const supabase = createAdminClient();

    if (!profile || !supabase) {
      return NextResponse.json({ message: "Login required. Verify your phone to add alternatives." }, { status: 401 });
    }

    const { poolId } = await params;
    const { alternativePoolId } = await request.json();

    if (typeof alternativePoolId !== "string" || !alternativePoolId.trim()) {
      return NextResponse.json({ message: "Choose a product to add as an alternative." }, { status: 400 });
    }

    if (alternativePoolId === poolId) {
      return NextResponse.json({ message: "This product is already the main product." }, { status: 400 });
    }

    const { error } = await supabase
      .from("product_pool_alternatives")
      .upsert(
        {
          pool_id: poolId,
          alternative_pool_id: alternativePoolId,
          suggested_by_profile_id: profile.id,
        },
        { onConflict: "pool_id,alternative_pool_id" },
      );

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Could not add alternative." }, { status: 400 });
  }
}
