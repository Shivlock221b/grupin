import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccountProfile } from "@/lib/account-auth";
import { consumeCouponInventory, getPrivateUnlockDealConfigByDealId } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase-admin";
import { escapeTelegramHtml, sendTelegramMessage } from "@/lib/telegram";

export async function POST(request: NextRequest) {
  try {
    const profile = await getCurrentAccountProfile();
    const supabase = createAdminClient();

    if (!profile || !supabase) {
      return NextResponse.json({ message: "Login required." }, { status: 401 });
    }

    const { unlockedCouponId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = await request.json();

    if (typeof unlockedCouponId !== "string" || typeof razorpayPaymentId !== "string") {
      return NextResponse.json({ message: "Coupon and payment id are required." }, { status: 400 });
    }

    const { data: coupon, error: couponError } = await supabase
      .from("unlocked_coupons")
      .select("id, profile_id, deal_id, remaining_amount, status")
      .eq("id", unlockedCouponId)
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (couponError) {
      throw couponError;
    }

    if (!coupon) {
      return NextResponse.json({ message: "Unlocked coupon not found." }, { status: 404 });
    }

    if (coupon.status !== "payment_pending") {
      return NextResponse.json({ message: "This coupon is already paid." }, { status: 409 });
    }

    const { data: claim, error: claimError } = await supabase
      .from("coupon_claims")
      .insert({
        unlocked_coupon_id: coupon.id,
        profile_id: profile.id,
        deal_id: coupon.deal_id,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_order_id: typeof razorpayOrderId === "string" ? razorpayOrderId : null,
        razorpay_signature: typeof razorpaySignature === "string" ? razorpaySignature : null,
        amount_paid: Number(coupon.remaining_amount),
        status: "paid",
        email_delivery_status: "pending",
      })
      .select("id, email_delivery_status")
      .single();

    if (claimError) {
      throw claimError;
    }

    await consumeCouponInventory(String(coupon.deal_id));

    const { error: updateError } = await supabase
      .from("unlocked_coupons")
      .update({
        status: "claimed",
        email_delivery_status: "pending",
      })
      .eq("id", coupon.id);

    if (updateError) {
      throw updateError;
    }

    const config = await getPrivateUnlockDealConfigByDealId(String(coupon.deal_id));
    void sendTelegramMessage({
      text: [
        "<b>Full voucher payment received</b>",
        "",
        `Brand: ${escapeTelegramHtml(config?.brandName ?? "Brand")}`,
        `Deal ID: ${escapeTelegramHtml(coupon.deal_id)}`,
        "",
        `Name: ${escapeTelegramHtml(profile.fullName)}`,
        `Phone: ${escapeTelegramHtml(profile.phone)}`,
        `Email: ${escapeTelegramHtml(profile.email)}`,
        `Amount paid: ₹${Math.round(Number(coupon.remaining_amount) / 100).toLocaleString("en-IN")}`,
        `Delivery: pending`,
        `Payment ID: ${escapeTelegramHtml(razorpayPaymentId)}`,
      ].join("\n"),
    }).catch((telegramError) => console.error("Telegram coupon claim notification failed:", telegramError));

    return NextResponse.json({ claim });
  } catch (error) {
    console.error("Coupon claim error:", error);
    return NextResponse.json({ message: "Could not confirm coupon payment." }, { status: 500 });
  }
}
