import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccountProfile } from "@/lib/account-auth";
import { adminPhoneLabel, escapeTelegramHtml, phoneLast4, sendTelegramMessage } from "@/lib/telegram";

type TelegramEventPayload = {
  event?: string;
  source?: string;
  productTitle?: string;
  productSlug?: string;
  brandName?: string;
  brandSlug?: string;
};

function label(value: unknown, fallback = "Unknown") {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json().catch(() => ({}))) as TelegramEventPayload;

    if (payload.event !== "product_team_cta_click") {
      return NextResponse.json({ message: "Unsupported event." }, { status: 400 });
    }

    const profile = await getCurrentAccountProfile();
    const actor = profile
      ? `Logged-in user ${phoneLast4(profile.phone) ? `****${phoneLast4(profile.phone)}` : adminPhoneLabel(profile.phone)}`
      : "Someone not logged in";

    void sendTelegramMessage({
      text: [
        "<b>Buy at Team Price clicked</b>",
        `Actor: ${escapeTelegramHtml(actor)}`,
        `Source: ${escapeTelegramHtml(label(payload.source, "catalog"))}`,
        `Brand: ${escapeTelegramHtml(label(payload.brandName ?? payload.brandSlug))}`,
        `Product: ${escapeTelegramHtml(label(payload.productTitle ?? payload.productSlug))}`,
      ].join("\n"),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram event tracking error:", error);
    return NextResponse.json({ ok: true });
  }
}
