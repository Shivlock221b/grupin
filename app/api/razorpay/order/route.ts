import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccountProfile } from "@/lib/account-auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { getGroupDealById, getPlatformCouponInventory, getPrivateUnlockDealConfigByDealId, getProductTeamUnlockByCode, hasRecentPrivateUnlockJoin, listProductTeamCartItems, listProductTeamUnlockMembers, syncProductTeamUnlockOrderStatus } from "@/lib/data";
import { phoneLookupVariants } from "@/lib/otp";

export async function POST(request: NextRequest) {
  try {
    const { dealId, privateUnlock, purpose, unlockedCouponId, phone, code } = await request.json();

    if (purpose === "coupon_claim") {
      if (typeof unlockedCouponId !== "string") {
        return NextResponse.json({ message: "Unlocked coupon id is required." }, { status: 400 });
      }

      const profile = await getCurrentAccountProfile();
      const supabase = createAdminClient();

      if (!profile || !supabase) {
        return NextResponse.json({ message: "Login required." }, { status: 401 });
      }

      const { data: coupon, error } = await supabase
        .from("unlocked_coupons")
        .select("id, deal_id, remaining_amount, status, deals(title)")
        .eq("id", unlockedCouponId)
        .eq("profile_id", profile.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!coupon) {
        return NextResponse.json({ message: "Unlocked coupon not found." }, { status: 404 });
      }

      if (coupon.status !== "payment_pending") {
        return NextResponse.json({ message: "This coupon is already paid." }, { status: 409 });
      }

      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      const amount = Number(coupon.remaining_amount);

      if (!keyId || !keySecret) {
        return NextResponse.json({
          keyId: "rzp_test_demo",
          orderId: `order_coupon_demo_${Date.now()}`,
          amount,
          currency: "INR",
          demoMode: true,
        });
      }

      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          currency: "INR",
          receipt: `coupon_${unlockedCouponId}_${Date.now()}`.slice(0, 40),
          notes: {
            profileId: profile.id,
            unlockedCouponId,
          },
        }),
      });
      const order = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { message: order.error?.description ?? "Could not create Razorpay order." },
          { status: response.status }
        );
      }

      return NextResponse.json({
        keyId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      });
    }

    if (purpose === "product_team_order") {
      if (typeof code !== "string" || !code.trim()) {
        return NextResponse.json({ message: "Room code is required." }, { status: 400 });
      }

      const profile = await getCurrentAccountProfile();

      if (!profile) {
        return NextResponse.json({ message: "Login required." }, { status: 401 });
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

      const supabase = createAdminClient();

      if (!supabase) {
        return NextResponse.json({ message: "Supabase admin client is not configured." }, { status: 500 });
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

      if (!payable || payable <= 0) {
        return NextResponse.json({ message: "Cart price is not available." }, { status: 409 });
      }

      const amount = payable * 100;
      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!keyId || !keySecret) {
        return NextResponse.json({
          keyId: "rzp_test_demo",
          orderId: `order_product_demo_${Date.now()}`,
          amount,
          currency: "INR",
          demoMode: true,
        });
      }

      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          currency: "INR",
          receipt: `product_${effectiveUnlock.shareCode}_${Date.now()}`.slice(0, 40),
          notes: {
            profileId: profile.id,
            unlockId: effectiveUnlock.id,
            cartMemberId: member?.id,
          },
        }),
      });
      const order = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { message: order.error?.description ?? "Could not create Razorpay order." },
          { status: response.status }
        );
      }

      return NextResponse.json({
        keyId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      });
    }

    if (!dealId || typeof dealId !== "string") {
      return NextResponse.json({ message: "Deal id is required." }, { status: 400 });
    }

    const deal = await getGroupDealById(dealId);

    if (!deal) {
      return NextResponse.json({ message: "Deal not found." }, { status: 404 });
    }

    if (!privateUnlock && new Date(deal.expiresAt).getTime() <= Date.now()) {
      return NextResponse.json({ message: "Deal expired." }, { status: 410 });
    }

    if (privateUnlock) {
      const [config, platformInventory] = await Promise.all([
        getPrivateUnlockDealConfigByDealId(deal.id),
        getPlatformCouponInventory(),
      ]);

      if (platformInventory.outOfStock || config?.isOutOfStock) {
        return NextResponse.json({ message: "This voucher is out of stock.", outOfStock: true }, { status: 409 });
      }

      if (typeof phone === "string" && phone.trim()) {
        const supabase = createAdminClient();

        if (supabase) {
          const { data: existingMember, error: existingError } = await supabase
            .from("private_unlock_members")
            .select("id")
            .eq("deal_id", deal.id)
            .in("phone", phoneLookupVariants(phone))
            .limit(1)
            .maybeSingle();

          if (existingError) {
            throw existingError;
          }

          if (existingMember) {
            return NextResponse.json({ message: "You have already joined this coupon unlock.", alreadyJoined: true }, { status: 409 });
          }
        }

        if (await hasRecentPrivateUnlockJoin(phone)) {
          return NextResponse.json({ message: "You can unlock only one coupon in a 24-hour window. Please try again later." }, { status: 429 });
        }
      }
    }

    const tokenAmount = privateUnlock ? (await getPrivateUnlockDealConfigByDealId(deal.id))?.tokenAmount ?? 99 : 99;
    const amount = tokenAmount * 100;

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json({
        keyId: "rzp_test_demo",
        orderId: `order_demo_${Date.now()}`,
        amount,
        currency: "INR",
        demoMode: true,
      });
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        receipt: `grupin_${deal.id}_${Date.now()}`.slice(0, 40),
        notes: {
          dealId: deal.id,
          title: deal.title,
        },
      }),
    });

    const order = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: order.error?.description ?? "Could not create Razorpay order." },
        { status: response.status }
      );
    }

    return NextResponse.json({
      keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("Razorpay order error:", error);
    return NextResponse.json({ message: "Could not create Razorpay order." }, { status: 500 });
  }
}
