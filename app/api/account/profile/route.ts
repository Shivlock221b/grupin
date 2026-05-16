import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccountProfile } from "@/lib/account-auth";
import { updateAccountProfile, upsertProfileFromBuyer } from "@/lib/data";
import { normalizePhone } from "@/lib/otp";
import { isWellFormattedEmail } from "@/lib/validation";

export async function GET() {
  const profile = await getCurrentAccountProfile();
  return NextResponse.json({ profile });
}

export async function POST(request: NextRequest) {
  try {
    const currentProfile = await getCurrentAccountProfile();

    if (currentProfile) {
      return NextResponse.json({ profile: currentProfile, reused: true });
    }

    const { name, phone, email } = await request.json();

    if (typeof name !== "string" || typeof phone !== "string" || typeof email !== "string") {
      return NextResponse.json({ message: "Name, phone and email are required." }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);

    if (!name.trim() || normalizedPhone.length < 8 || !isWellFormattedEmail(email)) {
      return NextResponse.json({ message: "Enter valid profile details." }, { status: 400 });
    }

    const profile = await upsertProfileFromBuyer({ name, phone, email });

    return NextResponse.json({ profile, reused: false });
  } catch (error) {
    console.error("Profile capture error:", error);
    return NextResponse.json({ message: "Could not save profile." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentProfile = await getCurrentAccountProfile();

    if (!currentProfile) {
      return NextResponse.json({ message: "Login required." }, { status: 401 });
    }

    const { name, phone, email } = await request.json();

    if (typeof name !== "string" || typeof phone !== "string" || typeof email !== "string") {
      return NextResponse.json({ message: "Name, phone and email are required." }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);

    if (!name.trim() || normalizedPhone.length < 8 || !isWellFormattedEmail(email)) {
      return NextResponse.json({ message: "Enter valid account details." }, { status: 400 });
    }

    const profile = await updateAccountProfile(currentProfile.id, {
      name,
      phone,
      email,
      phoneVerified: normalizedPhone === currentProfile.phone,
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ message: "Could not update profile." }, { status: 500 });
  }
}
