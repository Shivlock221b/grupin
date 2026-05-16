import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccountProfile } from "@/lib/account-auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { createUnlockedCouponsForPrivateUnlock, getGroupDealById, getPlatformCouponInventory, getPrivateUnlockByCode, getPrivateUnlockDealConfigByDealId, hasRecentPrivateUnlockJoin, listPrivateUnlockMembers, upsertProfileFromBuyer } from "@/lib/data";
import { normalizePhone, phoneLookupVariants } from "@/lib/otp";
import { escapeTelegramHtml, sendTelegramMessage } from "@/lib/telegram";
import { isWellFormattedEmail } from "@/lib/validation";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function createShareCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function publicMember(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    unlockId: String(row.unlock_id),
    dealId: String(row.deal_id),
    name: String(row.name),
    phone: "",
    email: "",
    razorpayPaymentId: "",
    createdAt: String(row.created_at),
  };
}

function mapUnlock(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    dealId: String(row.deal_id),
    shareCode: String(row.share_code),
    threshold: Number(row.threshold),
    discountPercent: Number(row.discount_percent),
    couponCode: String(row.coupon_code),
    currentCount: Number(row.current_count ?? 0),
    expiresAt: String(row.expires_at),
    createdAt: row.created_at ? String(row.created_at) : undefined,
  };
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const dealId = request.nextUrl.searchParams.get("dealId");
  const phone = request.nextUrl.searchParams.get("phone");

  if (!code && !dealId) {
    return NextResponse.json({ message: "Unlock code or deal id is required." }, { status: 400 });
  }

  let unlock = code ? await getPrivateUnlockByCode(code) : null;
  let joined = false;

  if (!unlock && dealId && phone) {
    const supabase = createAdminClient();

    if (supabase) {
      const { data: member, error } = await supabase
        .from("private_unlock_members")
        .select("unlock_id")
        .eq("deal_id", dealId)
        .in("phone", phoneLookupVariants(phone))
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (member?.unlock_id) {
        const { data: unlockRow, error: unlockError } = await supabase
          .from("private_unlocks")
          .select("id, deal_id, share_code, threshold, discount_percent, coupon_code, current_count, expires_at, created_at")
          .eq("id", String(member.unlock_id))
          .maybeSingle();

        if (unlockError) {
          throw unlockError;
        }

        unlock = unlockRow ? mapUnlock(unlockRow) : null;
        joined = Boolean(unlock);
      }
    }
  }

  if (!unlock) {
    const deal = dealId ? await getGroupDealById(dealId) : null;

    if (!deal) {
      return NextResponse.json({ message: "Unlock not found." }, { status: 404 });
    }

    return NextResponse.json({ deal, members: [], joined: false });
  }

  const [deal, members] = await Promise.all([
    getGroupDealById(unlock.dealId),
    listPrivateUnlockMembers(unlock.id),
  ]);

  if (!deal) {
    return NextResponse.json({ message: "Deal not found." }, { status: 404 });
  }

  if (phone && !joined) {
    const supabase = createAdminClient();

    if (supabase) {
      const { data, error } = await supabase
        .from("private_unlock_members")
        .select("id")
        .eq("unlock_id", unlock.id)
        .in("phone", phoneLookupVariants(phone))
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      joined = Boolean(data);
    }
  }

  return NextResponse.json({ unlock, deal, members, joined });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dealId, code, name, phone, email, razorpayPaymentId, razorpayOrderId, razorpaySignature } = body;

    if (
      typeof name !== "string" ||
      typeof phone !== "string" ||
      typeof email !== "string" ||
      typeof razorpayPaymentId !== "string"
    ) {
      return NextResponse.json({ message: "Buyer details and payment id are required." }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    const currentProfile = await getCurrentAccountProfile();

    if (!name.trim() || normalizedPhone.length < 8 || !isWellFormattedEmail(email)) {
      return NextResponse.json({ message: "Enter valid buyer details." }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (!supabase) {
      return NextResponse.json({ message: "Supabase is required for private unlock links." }, { status: 500 });
    }

    let unlock = typeof code === "string" && code.trim() ? await getPrivateUnlockByCode(code) : null;
    let targetDealId = unlock?.dealId ?? (typeof dealId === "string" ? dealId : "");
    const profile = currentProfile ?? await upsertProfileFromBuyer({ name, phone, email });

    if (!isUuid(targetDealId)) {
      return NextResponse.json({ message: "Valid deal id is required." }, { status: 400 });
    }

    const deal = await getGroupDealById(targetDealId);

    if (!deal) {
      return NextResponse.json({ message: "Deal not found." }, { status: 404 });
    }

    if (unlock && new Date(unlock.expiresAt).getTime() <= Date.now()) {
      return NextResponse.json({ message: "This unlock link has expired." }, { status: 410 });
    }

    const existingDealMember = await supabase
      .from("private_unlock_members")
      .select("id, unlock_id")
      .eq("deal_id", targetDealId)
      .in("phone", phoneLookupVariants(phone))
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingDealMember.error) {
      throw existingDealMember.error;
    }

    if (existingDealMember.data) {
      return NextResponse.json(
        { message: "You have already joined this coupon unlock.", alreadyJoined: true, unlock },
        { status: 409 }
      );
    }

    const recentJoin = await hasRecentPrivateUnlockJoin(phone);

    if (recentJoin) {
      return NextResponse.json(
        { message: "You can unlock only one coupon in a 24-hour window. Please try again later." },
        { status: 429 }
      );
    }

    const [configForStock, platformInventory] = await Promise.all([
      getPrivateUnlockDealConfigByDealId(targetDealId),
      getPlatformCouponInventory(),
    ]);

    if (platformInventory.outOfStock || configForStock?.isOutOfStock) {
      return NextResponse.json(
        { message: "This voucher is out of stock.", outOfStock: true },
        { status: 409 }
      );
    }

    if (!unlock) {
      const config = configForStock;
      const shareCode = createShareCode();
      const { data: unlockRow, error: unlockError } = await supabase
        .from("private_unlocks")
        .insert({
          deal_id: targetDealId,
          share_code: shareCode,
          threshold: config?.threshold ?? 3,
          discount_percent: config?.discountPercent ?? 20,
          coupon_code: `${config?.couponPrefix ?? "GRUPIN"}${config?.discountPercent ?? 20}${shareCode}`,
          expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        })
        .select("id, deal_id, share_code, threshold, discount_percent, coupon_code, current_count, expires_at, created_at")
        .single();

      if (unlockError) {
        throw unlockError;
      }

      unlock = mapUnlock(unlockRow);
      targetDealId = unlock.dealId;
    }

    const { data: existingMember, error: existingError } = await supabase
      .from("private_unlock_members")
      .select("id")
      .eq("unlock_id", unlock.id)
      .in("phone", phoneLookupVariants(phone))
      .limit(1)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existingMember) {
      return NextResponse.json(
        { message: "You have already joined this private unlock.", alreadyJoined: true, unlock },
        { status: 409 }
      );
    }

    const { data: memberRow, error: memberError } = await supabase
      .from("private_unlock_members")
      .insert({
        unlock_id: unlock.id,
        deal_id: targetDealId,
        profile_id: profile?.id ?? null,
        name: name.trim(),
        phone: normalizedPhone,
        email: email.trim(),
        razorpay_payment_id: razorpayPaymentId,
        razorpay_order_id: typeof razorpayOrderId === "string" ? razorpayOrderId : null,
        razorpay_signature: typeof razorpaySignature === "string" ? razorpaySignature : null,
        amount_paid: ((await getPrivateUnlockDealConfigByDealId(targetDealId))?.tokenAmount ?? 99) * 100,
        payment_status: "paid",
      })
      .select("id, unlock_id, deal_id, name, phone, email, razorpay_payment_id, created_at")
      .single();

    if (memberError) {
      throw memberError;
    }

    const nextCount = unlock.currentCount + 1;
    const unlockUpdate: Record<string, unknown> = { current_count: nextCount };

    if (unlock.currentCount === 0) {
      unlockUpdate.owner_member_id = memberRow.id;
    }

    const { data: updatedUnlockRow, error: updateError } = await supabase
      .from("private_unlocks")
      .update(unlockUpdate)
      .eq("id", unlock.id)
      .select("id, deal_id, share_code, threshold, discount_percent, coupon_code, current_count, expires_at, created_at")
      .single();

    if (updateError) {
      throw updateError;
    }

    const updatedUnlock = mapUnlock(updatedUnlockRow);
    const members = await listPrivateUnlockMembers(updatedUnlock.id);
    await createUnlockedCouponsForPrivateUnlock(updatedUnlock.id);

    void sendTelegramMessage({
      text: [
        "<b>New unlock join</b>",
        "",
        `Brand: ${escapeTelegramHtml(configForStock?.brandName ?? deal.title)}`,
        `Deal: ${escapeTelegramHtml(deal.title)}`,
        `Room: ${escapeTelegramHtml(updatedUnlock.shareCode)}`,
        `Progress: ${updatedUnlock.currentCount}/${updatedUnlock.threshold}`,
        "",
        `Name: ${escapeTelegramHtml(name.trim())}`,
        `Phone: ${escapeTelegramHtml(normalizedPhone)}`,
        `Email: ${escapeTelegramHtml(email.trim())}`,
        `Token paid: ₹${configForStock?.tokenAmount ?? 99}`,
        `Payment ID: ${escapeTelegramHtml(razorpayPaymentId)}`,
      ].join("\n"),
    }).catch((telegramError) => console.error("Telegram unlock join notification failed:", telegramError));

    return NextResponse.json({
      unlock: updatedUnlock,
      deal,
      member: publicMember(memberRow),
      members,
      unlocked: updatedUnlock.currentCount >= updatedUnlock.threshold,
    });
  } catch (error) {
    console.error("Private unlock error:", error);
    return NextResponse.json({ message: "Could not update private unlock." }, { status: 500 });
  }
}
