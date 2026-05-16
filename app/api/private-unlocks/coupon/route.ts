import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    await request.json();

    return NextResponse.json(
      { message: "Coupon codes are now delivered by email after final payment. Open your account coupons page." },
      { status: 410 }
    );
  } catch (error) {
    console.error("Private coupon unlock error:", error);
    return NextResponse.json({ message: "Could not unlock coupon." }, { status: 500 });
  }
}
