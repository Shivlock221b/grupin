import { NextRequest, NextResponse } from "next/server";
import { createOtp, OtpPurpose } from "@/lib/otp";
import { createAdminClient } from "@/lib/supabase-admin";
import { phoneLookupVariants } from "@/lib/otp";

export async function POST(request: NextRequest) {
  try {
    const { dealId, phone, purpose } = await request.json();

    if (typeof phone !== "string" || (purpose !== "reservation" && purpose !== "coupon_unlock")) {
      return NextResponse.json({ message: "Phone and purpose are required." }, { status: 400 });
    }

    if (purpose === "reservation" && typeof dealId === "string") {
      const supabase = createAdminClient();

      if (supabase) {
        const { data: existingReservation, error } = await supabase
          .from("reservations")
          .select("id")
          .eq("deal_id", dealId)
          .in("phone", phoneLookupVariants(phone))
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
