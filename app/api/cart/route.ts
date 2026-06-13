import { NextResponse } from "next/server";
import { getCurrentAccountProfile } from "@/lib/account-auth";
import { listProductPoolCartItems } from "@/lib/data";

export async function GET() {
  const profile = await getCurrentAccountProfile();

  if (!profile) {
    return NextResponse.json({ message: "Login required.", cartItems: [] }, { status: 401 });
  }

  const cartItems = await listProductPoolCartItems(profile.id);
  return NextResponse.json({ cartItems });
}
