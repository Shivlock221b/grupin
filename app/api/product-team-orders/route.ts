import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccountProfile } from "@/lib/account-auth";
import { getProductTeamUnlockByCode, listProductTeamCartItems, listProductTeamUnlockMembers, syncProductTeamUnlockOrderStatus } from "@/lib/data";
import { phoneLookupVariants } from "@/lib/otp";
import { createAdminClient } from "@/lib/supabase-admin";
import { adminPhoneLabel, escapeTelegramHtml, sendTelegramMessage } from "@/lib/telegram";

function formatAddressForTelegram(address: unknown) {
  if (!address || typeof address !== "object") {
    return "Not provided";
  }

  return Object.entries(address as Record<string, unknown>)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim())
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ") || "Not provided";
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getCurrentAccountProfile();
    const supabase = createAdminClient();

    if (!profile || !supabase) {
      return NextResponse.json({ message: "Login required." }, { status: 401 });
    }

    const {
      code,
      buyerName,
      buyerEmail,
      buyerPhone,
      deliveryAddress,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
    } = await request.json();

    if (typeof code !== "string" || !code.trim() || typeof razorpayPaymentId !== "string" || !razorpayPaymentId.trim()) {
      return NextResponse.json({ message: "Room code and payment id are required." }, { status: 400 });
    }

    if (typeof buyerName !== "string" || !buyerName.trim()) {
      return NextResponse.json({ message: "Full name is required." }, { status: 400 });
    }

    if (typeof buyerPhone !== "string" || !buyerPhone.trim()) {
      return NextResponse.json({ message: "Phone number is required." }, { status: 400 });
    }

    if (!deliveryAddress || typeof deliveryAddress !== "object") {
      return NextResponse.json({ message: "Delivery address is required." }, { status: 400 });
    }

    const unlock = await getProductTeamUnlockByCode(code);

    if (!unlock) {
      return NextResponse.json({ message: "This room is not unlocked yet." }, { status: 409 });
    }

    const syncedUnlock = await syncProductTeamUnlockOrderStatus(unlock.id);
    const effectiveUnlock = syncedUnlock ?? unlock;

    if (["completed", "cancelled", "expired"].includes(effectiveUnlock.status) || new Date(effectiveUnlock.expiresAt).getTime() <= Date.now()) {
      return NextResponse.json({ message: "This Team Room checkout deadline has passed." }, { status: 410 });
    }

    if (effectiveUnlock.currentCount < effectiveUnlock.threshold) {
      return NextResponse.json({ message: "This room is not unlocked yet." }, { status: 409 });
    }

    const [members, cartItems] = await Promise.all([
      listProductTeamUnlockMembers(effectiveUnlock.id),
      listProductTeamCartItems(effectiveUnlock.id),
    ]);

    const member = members.find((entry) => entry.profileId === profile.id || phoneLookupVariants(profile.phone).includes(entry.phone));
    const isMember = Boolean(member);

    if (!isMember) {
      return NextResponse.json({ message: "Join this Team Room before checkout." }, { status: 403 });
    }

    const memberCartItems = cartItems.filter((item) => item.memberId === member?.id);

    if (!memberCartItems.length) {
      return NextResponse.json({ message: "Add at least one item to cart before checkout." }, { status: 409 });
    }

    const { data: existingOrder, error: existingOrderError } = await supabase
      .from("product_team_orders")
      .select("id")
      .eq("unlock_id", effectiveUnlock.id)
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (existingOrderError) {
      throw existingOrderError;
    }

    if (existingOrder) {
      return NextResponse.json({ message: "You have already checked out for this Team Room." }, { status: 409 });
    }

    const { count: checkoutCount, error: checkoutCountError } = await supabase
      .from("product_team_orders")
      .select("id", { count: "exact", head: true })
      .eq("unlock_id", effectiveUnlock.id)
      .in("status", ["hold", "confirmed"]);

    if (checkoutCountError) {
      throw checkoutCountError;
    }

    if (checkoutCount !== null && checkoutCount >= effectiveUnlock.currentCount) {
      return NextResponse.json({ message: "This Team Room is closed. All eligible carts have checked out." }, { status: 409 });
    }

    const payable = memberCartItems.reduce((total, item) => total + item.teamPriceSnapshot * item.quantity, 0);
    const firstItem = memberCartItems[0];

    if (!payable || payable <= 0) {
      return NextResponse.json({ message: "Cart price is not available." }, { status: 409 });
    }

    const { data: order, error } = await supabase
      .from("product_team_orders")
      .upsert(
        {
          unlock_id: effectiveUnlock.id,
          product_id: firstItem?.productId ?? null,
          brand_id: effectiveUnlock.brandId,
          profile_id: profile.id,
          cart_member_id: member?.id ?? null,
          selected_variant: null,
          items: memberCartItems,
          buyer_name: buyerName.trim(),
          buyer_email: typeof buyerEmail === "string" && buyerEmail.trim() ? buyerEmail.trim() : null,
          buyer_phone: buyerPhone.trim(),
          delivery_address: deliveryAddress,
          amount_paid: payable,
          razorpay_payment_id: razorpayPaymentId,
          razorpay_order_id: typeof razorpayOrderId === "string" ? razorpayOrderId : null,
          razorpay_signature: typeof razorpaySignature === "string" ? razorpaySignature : null,
          status: "hold",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "unlock_id,profile_id" },
      )
      .select("id, status")
      .single();

    if (error) {
      throw error;
    }

    if (member?.id) {
      await supabase
        .from("product_team_unlock_members")
        .update({ cart_status: "checked_out", cart_checked_out_at: new Date().toISOString() })
        .eq("id", member.id);
    }

    await syncProductTeamUnlockOrderStatus(effectiveUnlock.id);

    void sendTelegramMessage({
      text: [
        "<b>Product checkout paid</b>",
        `Order: <b>${escapeTelegramHtml(order.id)}</b>`,
        `Room: <b>${escapeTelegramHtml(effectiveUnlock.shareCode)}</b>`,
        `Buyer: ${escapeTelegramHtml(buyerName.trim())}`,
        `Phone: ${escapeTelegramHtml(adminPhoneLabel(buyerPhone.trim()))}`,
        `Email: ${escapeTelegramHtml(typeof buyerEmail === "string" && buyerEmail.trim() ? buyerEmail.trim() : "Not provided")}`,
        `Items: ${memberCartItems.length}`,
        `Amount paid: INR ${escapeTelegramHtml(payable)}`,
        `Payment id: ${escapeTelegramHtml(razorpayPaymentId)}`,
        `Razorpay order: ${escapeTelegramHtml(typeof razorpayOrderId === "string" ? razorpayOrderId : "Not provided")}`,
        `Address: ${escapeTelegramHtml(formatAddressForTelegram(deliveryAddress))}`,
      ].join("\n"),
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Product team order error:", error);
    return NextResponse.json({ message: "Could not place product order." }, { status: 500 });
  }
}
