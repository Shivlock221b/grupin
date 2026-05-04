import { NextRequest, NextResponse } from "next/server";
import { getUnlockedCouponForPhone } from "@/lib/data";
import { normalizePhone, verifyOtp } from "@/lib/otp";

export async function POST(request: NextRequest) {
  try {
    const { dealId, phone, code } = await request.json();

    if (typeof dealId !== "string" || typeof phone !== "string" || typeof code !== "string") {
      return NextResponse.json({ message: "Deal, phone and OTP are required." }, { status: 400 });
    }

    const verified = await verifyOtp({
      dealId,
      phone,
      purpose: "coupon_unlock",
      code,
    });

    if (!verified) {
      return NextResponse.json({ message: "Invalid or expired OTP." }, { status: 400 });
    }

    const result = await getUnlockedCouponForPhone(dealId, normalizePhone(phone));

    if (!result.reservation) {
      return NextResponse.json({ message: "No reservation found for this phone number." }, { status: 404 });
    }

    if (!result.coupon) {
      return NextResponse.json({ message: "Coupon is not unlocked yet. Please check back after the next tier unlocks." }, { status: 409 });
    }

    return NextResponse.json({
      deal: result.deal,
      reservation: result.reservation,
      coupon: result.coupon,
    });
  } catch (error) {
    console.error("Coupon unlock error:", error);
    return NextResponse.json({ message: "Could not unlock coupon." }, { status: 500 });
  }
}
