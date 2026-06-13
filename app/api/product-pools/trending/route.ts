import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccountProfile } from "@/lib/account-auth";
import { listTrendingProductPools } from "@/lib/data";

export async function GET(request: NextRequest) {
  const profile = await getCurrentAccountProfile();
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 12);
  const pools = await listTrendingProductPools(profile?.id, Number.isFinite(limit) ? limit : 12);
  return NextResponse.json({ pools });
}
