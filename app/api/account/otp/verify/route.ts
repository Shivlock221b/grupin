import { NextRequest, NextResponse } from "next/server";
import { createAccountSession } from "@/lib/account-auth";
import { getProfileByPhone, upsertProfileFromBuyer } from "@/lib/data";
import { isTestOtpCredential, verifyOtp } from "@/lib/otp";
import { isWellFormattedEmail } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const { phone, code, name, email } = await request.json();

    if (typeof phone !== "string" || typeof code !== "string") {
      return NextResponse.json({ message: "Phone and OTP are required." }, { status: 400 });
    }

    const verified = await verifyOtp({ phone, code, purpose: "coupon_unlock" });

    if (!verified) {
      return NextResponse.json({ message: "Invalid or expired OTP." }, { status: 400 });
    }

    let profile = await getProfileByPhone(phone);

    const isTestCredential = isTestOtpCredential(phone, code);
    const providedEmail = typeof email === "string" && isWellFormattedEmail(email) ? email : "";

    if (!profile) {
      profile = await upsertProfileFromBuyer({
        name: typeof name === "string" && name.trim() ? name : isTestCredential ? "Test GruPin User" : "GruPin user",
        email: providedEmail,
        phone,
        phoneVerified: true,
      });
    } else {
      profile = await upsertProfileFromBuyer({
        name: typeof name === "string" && name.trim() ? name : profile.fullName,
        email: providedEmail || profile.email,
        phone,
        phoneVerified: true,
      });
    }

    if (!profile) {
      return NextResponse.json({ message: "Could not create profile." }, { status: 500 });
    }

    await createAccountSession(profile.id);

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Account OTP verify error:", error);
    return NextResponse.json({ message: "Could not verify OTP." }, { status: 500 });
  }
}
