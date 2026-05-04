import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getGroupDealById, listReservationsByDeal } from "@/lib/data";
import { normalizePhone, phoneLookupVariants } from "@/lib/otp";

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getUnlockedTier(count: number, tiers: Array<{ threshold: number; price: number }>) {
  return [...tiers].reverse().find((tier) => count >= tier.threshold) ?? null;
}

export async function GET(request: NextRequest) {
  const dealId = request.nextUrl.searchParams.get("dealId");
  const phone = request.nextUrl.searchParams.get("phone");

  if (!dealId) {
    return NextResponse.json({ message: "Deal id is required." }, { status: 400 });
  }

  const deal = await getGroupDealById(dealId);

  if (!deal) {
    return NextResponse.json({ message: "Deal not found." }, { status: 404 });
  }

  const reservations = await listReservationsByDeal(dealId);

  if (phone) {
    const supabase = createAdminClient();

    if (!supabase) {
      return NextResponse.json({ joined: false, deal, reservations });
    }

    const { data: reservation, error } = await supabase
      .from("reservations")
      .select("id")
      .eq("deal_id", dealId)
      .in("phone", phoneLookupVariants(phone))
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return NextResponse.json({ joined: Boolean(reservation), deal, reservations });
  }

  return NextResponse.json({ reservations, deal });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dealId, name, phone, email, razorpayPaymentId, razorpayOrderId, razorpaySignature } = body;

    if (
      typeof dealId !== "string" ||
      typeof name !== "string" ||
      typeof phone !== "string" ||
      typeof email !== "string" ||
      typeof razorpayPaymentId !== "string"
    ) {
      return NextResponse.json({ message: "All reservation fields are required." }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);

    if (!name.trim() || normalizedPhone.length < 8 || !isEmail(email.trim())) {
      return NextResponse.json({ message: "Enter valid buyer details." }, { status: 400 });
    }

    const deal = await getGroupDealById(dealId);

    if (!deal) {
      return NextResponse.json({ message: "Deal not found." }, { status: 404 });
    }

    if (new Date(deal.expiresAt).getTime() <= Date.now()) {
      return NextResponse.json({ message: "Deal expired." }, { status: 410 });
    }

    const supabase = createAdminClient();
    const nextCount = deal.currentCount + 1;

    if (!supabase) {
      const reservation = {
        id: `demo-reservation-${Date.now()}`,
        dealId,
        name: name.trim(),
        phone: normalizedPhone,
        email: email.trim(),
        razorpayPaymentId,
        amountPaid: 9900,
        paymentStatus: "paid",
        razorpayOrderId: typeof razorpayOrderId === "string" ? razorpayOrderId : null,
        razorpaySignature: typeof razorpaySignature === "string" ? razorpaySignature : null,
        finalPurchaseStatus: "pending",
        createdAt: new Date().toISOString(),
      };

      return NextResponse.json({
        reservation,
        deal: { ...deal, currentCount: nextCount },
        unlockedTier: getUnlockedTier(nextCount, deal.tiers),
      });
    }

    const { data: existingReservation, error: existingReservationError } = await supabase
      .from("reservations")
      .select("id")
      .eq("deal_id", dealId)
      .in("phone", phoneLookupVariants(phone))
      .limit(1)
      .maybeSingle();

    if (existingReservationError) {
      throw existingReservationError;
    }

    if (existingReservation) {
      return NextResponse.json(
        { message: "You have already joined this unlock. You can claim the reward when it unlocks." },
        { status: 409 }
      );
    }

    const { data: reservationRow, error: reservationError } = await supabase
      .from("reservations")
      .insert({
        deal_id: dealId,
        name: name.trim(),
        phone: normalizedPhone,
        email: email.trim(),
        razorpay_payment_id: razorpayPaymentId,
        razorpay_order_id: typeof razorpayOrderId === "string" ? razorpayOrderId : null,
        razorpay_signature: typeof razorpaySignature === "string" ? razorpaySignature : null,
        amount_paid: 9900,
        payment_status: "paid",
        final_purchase_status: "pending",
      })
      .select("id, deal_id, name, phone, email, razorpay_payment_id, created_at")
      .single();

    if (reservationError) {
      if (dealId === "antinorm-combo" || dealId === "demo") {
        const reservation = {
          id: `demo-reservation-${Date.now()}`,
          dealId,
          name: name.trim(),
          phone: normalizedPhone,
          email: email.trim(),
          razorpayPaymentId,
          createdAt: new Date().toISOString(),
        };

        return NextResponse.json({
          reservation,
          deal: { ...deal, currentCount: nextCount },
          unlockedTier: getUnlockedTier(nextCount, deal.tiers),
        });
      }

      throw reservationError;
    }

    const { data: dealRow, error: dealError } = await supabase
      .from("deals")
      .update({ current_count: nextCount })
      .eq("id", dealId)
      .select("id, title, original_price, tier_1_threshold, tier_1_price, tier_2_threshold, tier_2_price, tier_3_threshold, tier_3_price, current_count, expires_at, created_at")
      .single();

    if (dealError) {
      if (dealId === "antinorm-combo" || dealId === "demo") {
        const updatedDeal = { ...deal, currentCount: nextCount };

        return NextResponse.json({
          reservation: {
            id: String(reservationRow.id),
            dealId: String(reservationRow.deal_id),
            name: String(reservationRow.name),
            phone: String(reservationRow.phone),
            email: String(reservationRow.email),
            razorpayPaymentId: String(reservationRow.razorpay_payment_id),
            createdAt: String(reservationRow.created_at),
          },
          deal: updatedDeal,
          unlockedTier: getUnlockedTier(updatedDeal.currentCount, updatedDeal.tiers),
        });
      }

      throw dealError;
    }

    const updatedDeal = {
      id: String(dealRow.id),
      title: String(dealRow.title),
      originalPrice: Number(dealRow.original_price),
      tiers: [
        { threshold: Number(dealRow.tier_1_threshold), price: Number(dealRow.tier_1_price) },
        { threshold: Number(dealRow.tier_2_threshold), price: Number(dealRow.tier_2_price) },
        { threshold: Number(dealRow.tier_3_threshold), price: Number(dealRow.tier_3_price) },
      ],
      currentCount: Number(dealRow.current_count),
      expiresAt: String(dealRow.expires_at),
      createdAt: String(dealRow.created_at),
    };

    return NextResponse.json({
      reservation: {
        id: String(reservationRow.id),
        dealId: String(reservationRow.deal_id),
        name: String(reservationRow.name),
        phone: String(reservationRow.phone),
        email: String(reservationRow.email),
        razorpayPaymentId: String(reservationRow.razorpay_payment_id),
        createdAt: String(reservationRow.created_at),
      },
      deal: updatedDeal,
      unlockedTier: getUnlockedTier(updatedDeal.currentCount, updatedDeal.tiers),
    });
  } catch (error) {
    console.error("Reservation error:", error);
    return NextResponse.json({ message: "Could not save reservation." }, { status: 500 });
  }
}
