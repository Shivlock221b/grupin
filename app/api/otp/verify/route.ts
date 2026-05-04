import { NextRequest, NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp";

export async function POST(request: NextRequest) {
  try {
    const { dealId, phone, purpose, code } = await request.json();

    if (
      typeof phone !== "string" ||
      typeof code !== "string" ||
      (purpose !== "reservation" && purpose !== "coupon_unlock")
    ) {
      return NextResponse.json({ message: "Phone, OTP and purpose are required." }, { status: 400 });
    }

    const verified = await verifyOtp({
      dealId: typeof dealId === "string" ? dealId : null,
      phone,
      purpose,
      code,
    });

    if (!verified) {
      return NextResponse.json({ message: "Invalid or expired OTP." }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("OTP verify error:", error);
    return NextResponse.json({ message: "Could not verify OTP." }, { status: 500 });
  }
}
