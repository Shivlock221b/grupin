import { NextRequest, NextResponse } from "next/server";

type RouteProps = {
  params: Promise<{ poolId: string }>;
};

export async function POST(_request: NextRequest, { params }: RouteProps) {
  void params;
  return NextResponse.json({ message: "Checkout is currently unavailable." }, { status: 404 });
}
