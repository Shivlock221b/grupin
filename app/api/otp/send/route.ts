import { NextRequest, NextResponse } from "next/server";
import { createOtp, OtpPurpose } from "@/lib/otp";
import { createAdminClient } from "@/lib/supabase-admin";
import { normalizePhone, phoneLookupVariants } from "@/lib/otp";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: NextRequest) {
  try {
    const { dealId, phone, purpose } = await request.json();

    if (typeof phone !== "string" || (purpose !== "reservation" && purpose !== "coupon_unlock")) {
      return NextResponse.json({ message: "Phone and purpose are required." }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone || normalizedPhone.length < 8) {
      return NextResponse.json({ message: "Enter a valid phone number." }, { status: 400 });
    }

    if (purpose === "reservation" && typeof dealId === "string" && isUuid(dealId)) {
      const supabase = createAdminClient();

      if (supabase) {
        const { data: existingReservation, error } = await supabase
          .from("reservations")
          .select("id")
          .eq("deal_id", dealId)
          .in("phone", phoneLookupVariants(phone))
          .limit(1)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (existingReservation) {
          return NextResponse.json(
            { message: "You have already joined this unlock. You can claim the reward when it unlocks.", alreadyJoined: true },
            { status: 409 }
          );
        }
      }
    }

    const otp = await createOtp({
      dealId: typeof dealId === "string" ? dealId : null,
      phone,
      purpose: purpose as OtpPurpose,
    });

    return NextResponse.json({
      success: true,
      expiresAt: otp.expiresAt,
      demoOtp: otp.demoMode ? otp.code : undefined,
    });
  } catch (error) {
    console.error("OTP send error:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not send OTP." },
      { status: 500 }
    );
  }
}
