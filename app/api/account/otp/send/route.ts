import { NextRequest, NextResponse } from "next/server";
import { createOtp } from "@/lib/otp";

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (typeof phone !== "string") {
      return NextResponse.json({ message: "Phone is required." }, { status: 400 });
    }

    const otp = await createOtp({ phone, purpose: "coupon_unlock" });

    return NextResponse.json({
      success: true,
      expiresAt: otp.expiresAt,
      demoOtp: otp.demoMode ? otp.code : undefined,
    });
  } catch (error) {
    console.error("Account OTP send error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not send OTP." },
      { status: 500 }
    );
  }
}
