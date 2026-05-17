"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createUnlockedCouponsForPrivateUnlock, getDealById, joinDeal, listInterestsByDeal, updateDeal } from "@/lib/data";
import { queueNotifications } from "@/lib/notifications";
import { slugify } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase-admin";
import { clearAdminKeywordSession, createAdminKeywordSession, getAdminPortalPath } from "@/lib/admin-keyword-auth";
import { escapeTelegramHtml, sendTelegramMessage } from "@/lib/telegram";

const joinSchema = z.object({
  dealId: z.string().min(1),
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  area: z.string().optional(),
  city: z.string().default("Bengaluru"),
  whatsappOptIn: z
    .string()
    .optional()
    .transform((value) => value === "on"),
});

const optionalUrl = z.string().url().optional().or(z.literal(""));

const dealSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(2).optional().or(z.literal("")),
  brandName: z.string().min(2),
  merchant: z.string().min(2).optional().or(z.literal("")),
  category: z.string().min(2),
  headline: z.string().min(3),
  shortDescription: z.string().min(8),
  description: z.string().min(8),
  status: z.enum(["draft", "live", "threshold_met", "closed", "archived"]),
  enabled: z.string().optional().transform((value) => value === "on"),
  featured: z.string().optional().transform((value) => value === "on"),
  threshold: z.coerce.number().int().min(1),
  discountPercent: z.coerce.number().int().min(1).max(100),
  tokenAmount: z.coerce.number().int().min(0),
  voucherValue: z.coerce.number().int().min(1),
  flatDiscountAmount: z.coerce.number().int().min(0),
  finalPayableAfterUnlock: z.coerce.number().min(0).optional(),
  couponStockTotal: z.coerce.number().int().min(0),
  couponStockClaimed: z.coerce.number().int().min(0),
  forceOutOfStock: z.string().optional().transform((value) => value === "on"),
  scrapedDiscountPercent: z.coerce.number().min(0).max(100).optional().or(z.literal("")),
  couponPrefix: z.string().min(2),
  sortOrder: z.coerce.number().int().min(0),
  brandLogo: optionalUrl,
  cardImage: z.string().url(),
  bannerImage: z.string().url(),
  voucherUrl: optionalUrl,
  source: z.string().optional().or(z.literal("")),
  sourceFile: z.string().optional().or(z.literal("")),
});

export type ActionState = {
  success: boolean;
  message: string;
};

const adminLoginSchema = z.object({
  keyword: z.string().min(1),
});

function revalidateUnlockMarketplace() {
  revalidateTag("private-unlock-deal-configs", { expire: 0 });
  revalidatePath("/");
  revalidatePath("/unlock-deals");
}

const brandSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  websiteUrl: z.string().url().optional().or(z.literal("")),
});

const brandUserSchema = z.object({
  brandId: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["owner", "manager", "viewer"]),
});

const reservationUpdateSchema = z.object({
  reservationId: z.string().min(1),
  paymentStatus: z.enum(["created", "paid", "failed", "refunded"]),
  finalPurchaseStatus: z.enum(["pending", "completed", "cancelled"]),
});

const privateUnlockMemberUpdateSchema = z.object({
  memberId: z.string().min(1),
  paymentStatus: z.enum(["created", "paid", "failed", "refunded"]),
});

const couponClaimUpdateSchema = z.object({
  claimId: z.string().min(1),
  emailDeliveryStatus: z.enum(["not_requested", "pending", "delivered"]),
});

const dummyUnlockMemberSchema = z.object({
  unlockId: z.string().min(1),
  dealId: z.string().min(1),
  name: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().email(),
});

const dummyUnlockRoomSchema = z.object({
  dealId: z.string().min(1),
});

const unlockRoomUpdateSchema = z.object({
  unlockId: z.string().min(1),
  status: z.enum(["active", "expired"]),
  expiresAt: z.string().optional(),
});

const platformInventorySchema = z.object({
  total: z.coerce.number().int().min(0),
  claimed: z.coerce.number().int().min(0),
});

function createAdminShareCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

const dealControlSchema = z.object({
  dealId: z.string().min(1),
  status: z.enum(["draft", "live", "threshold_met", "closed", "archived"]),
  currentCount: z.coerce.number().min(0),
  expiresAt: z.string().optional(),
});

export async function requestAdminLoginAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = adminLoginSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      success: false,
      message: "Enter the admin keyword.",
    };
  }

  if (!process.env.ADMIN_PORTAL_KEYWORD) {
    return {
      success: false,
      message: "Admin keyword is not configured.",
    };
  }

  const signedIn = await createAdminKeywordSession(parsed.data.keyword);

  if (!signedIn) {
    return {
      success: false,
      message: "Incorrect admin keyword.",
    };
  }

  redirect(getAdminPortalPath("/dashboard"));
}

export async function submitDealInterest(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = joinSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Please check your details and try again.",
    };
  }

  try {
    const result = await joinDeal(parsed.data);

    await queueNotifications({
      dealId: result.deal.id,
      userId: result.profile.id,
      recipient: result.profile.email,
      message: `You joined ${result.deal.title}. We will message you when the deal unlocks.`,
    });

    if (result.justUnlocked) {
      const interests = await listInterestsByDeal(result.deal.id);

      await Promise.all(
        interests.map((interest) =>
          queueNotifications({
            dealId: result.deal.id,
            userId: interest.userId,
            recipient: interest.profile.email,
            message: `${result.deal.title} is now unlocked. We will share the discount details with you shortly.`,
          }),
        ),
      );
    }

    revalidateUnlockMarketplace();
    revalidatePath("/deals");
    revalidatePath(`/deals/${result.deal.slug}`);
    revalidatePath(`/admin/deals/${result.deal.id}`);

    return {
      success: true,
      message: result.justUnlocked
        ? "You joined successfully. The deal just unlocked, and details can now be shared with the group."
        : "You joined successfully. We will message you when the deal unlocks.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong while joining this deal.",
    };
  }
}

function normalizePrivateUnlockDealPayload(data: z.infer<typeof dealSchema>) {
  const brandName = data.brandName.trim();
  const merchant = data.merchant?.trim() || brandName;
  const slug = data.slug?.trim() || slugify(`${brandName}-${data.category}-voucher`);
  const finalPayable = data.finalPayableAfterUnlock ?? Math.max(0, data.voucherValue * (1 - data.discountPercent / 100));
  const couponStockClaimed = data.forceOutOfStock
    ? data.couponStockTotal
    : Math.min(data.couponStockClaimed, Math.max(0, data.couponStockTotal - 1));

  return {
    brandName,
    merchant,
    slug,
    finalPayable,
    deal: {
      title: data.title.trim(),
      slug,
      merchant,
      category: data.category.trim(),
      city: "Online",
      area: "Online",
      description: data.description.trim(),
      discount_percent: data.discountPercent,
      credit_description: `₹${data.voucherValue} voucher credit`,
      minimum_interest_count: data.threshold,
      status: data.status,
      close_date: null,
      hero_image: data.bannerImage,
      terms: [
        "Token amount is refundable if the private unlock room does not unlock.",
        "Voucher code is delivered to registered email/phone number within 30 minutes after final payment.",
        data.voucherUrl ? `Brand redemption URL: ${data.voucherUrl}` : "Redeem on the brand site or app.",
      ],
      featured: data.featured,
      original_price: data.voucherValue,
      tier_1_threshold: data.threshold,
      tier_1_price: finalPayable,
      tier_2_threshold: data.threshold,
      tier_2_price: finalPayable,
      tier_3_threshold: data.threshold,
      tier_3_price: finalPayable,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    },
    config: {
      enabled: data.enabled,
      headline: data.headline.trim(),
      brand_name: brandName,
      brand_logo: data.brandLogo || null,
      card_image: data.cardImage,
      banner_image: data.bannerImage,
      category: data.category.trim(),
      short_description: data.shortDescription.trim(),
      threshold: data.threshold,
      discount_percent: data.discountPercent,
      token_amount: data.tokenAmount,
      coupon_prefix: data.couponPrefix.trim().toUpperCase(),
      sort_order: data.sortOrder,
      featured: data.featured,
      source: data.source || null,
      source_file: data.sourceFile || null,
      voucher_url: data.voucherUrl || null,
      scraped_discount_percent: data.scrapedDiscountPercent === "" || data.scrapedDiscountPercent === undefined ? null : Number(data.scrapedDiscountPercent),
      voucher_value: data.voucherValue,
      flat_discount_amount: data.flatDiscountAmount,
      final_payable_after_unlock: finalPayable,
      coupon_stock_total: data.couponStockTotal,
      coupon_stock_claimed: couponStockClaimed,
    },
  };
}

async function upsertBrandByName(supabase: NonNullable<ReturnType<typeof createAdminClient>>, name: string, logoUrl?: string | null, websiteUrl?: string | null) {
  const slug = slugify(name);
  const { data: existing, error: lookupError } = await supabase
    .from("brands")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  if (existing?.id) {
    await supabase
      .from("brands")
      .update({
        name,
        ...(logoUrl ? { logo_url: logoUrl } : {}),
        ...(websiteUrl ? { website_url: websiteUrl } : {}),
      })
      .eq("id", existing.id);

    return String(existing.id);
  }

  const { data, error } = await supabase
    .from("brands")
    .insert({ name, slug, logo_url: logoUrl || null, website_url: websiteUrl || null })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return String(data.id);
}

export async function createDealAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = dealSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Please review the deal details.",
    };
  }

  try {
    const supabase = createAdminClient();

    if (!supabase) {
      return { success: false, message: "Supabase admin client is not configured." };
    }

    const payload = normalizePrivateUnlockDealPayload(parsed.data);
    const brandId = await upsertBrandByName(supabase, payload.brandName, payload.config.brand_logo, payload.config.voucher_url);
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .insert({
        ...payload.deal,
        brand_id: brandId,
        current_count: 0,
      })
      .select("id")
      .single();

    if (dealError) {
      throw dealError;
    }

    const { error: configError } = await supabase
      .from("private_unlock_deal_configs")
      .insert({
        deal_id: deal.id,
        ...payload.config,
      });

    if (configError) {
      throw configError;
    }

    revalidateUnlockMarketplace();
    revalidatePath("/private-unlock");
    revalidatePath("/admin/deals");
    redirect(`/admin/deals/${deal.id}?created=1`);
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not create the deal.",
    };
  }
}

export async function updateDealAction(
  dealId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const parsed = dealSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Please review the deal details.",
    };
  }

  try {
    const supabase = createAdminClient();

    if (!supabase) {
      return { success: false, message: "Supabase admin client is not configured." };
    }

    const payload = normalizePrivateUnlockDealPayload(parsed.data);
    const brandId = await upsertBrandByName(supabase, payload.brandName, payload.config.brand_logo, payload.config.voucher_url);
    const { error: dealError } = await supabase
      .from("deals")
      .update({
        ...payload.deal,
        brand_id: brandId,
      })
      .eq("id", dealId);

    if (dealError) {
      throw dealError;
    }

    const { error: configError } = await supabase
      .from("private_unlock_deal_configs")
      .upsert({
        deal_id: dealId,
        ...payload.config,
      }, { onConflict: "deal_id" });

    if (configError) {
      throw configError;
    }

    revalidateUnlockMarketplace();
    revalidatePath("/private-unlock");
    revalidatePath(`/private-unlock/${dealId}`);
    revalidatePath(`/admin/deals/${dealId}`);
    revalidatePath("/admin/deals");

    return {
      success: true,
      message: "Deal updated successfully.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not update the deal.",
    };
  }
}

export async function markDealThresholdMet(dealId: string) {
  await requireAdmin();
  const deal = await getDealById(dealId);

  if (!deal) {
    throw new Error("Deal not found");
  }

  await updateDeal(dealId, { status: "threshold_met" });
  revalidatePath(`/admin/deals/${dealId}`);
}

export async function signOutAdminAction() {
  await clearAdminKeywordSession();
  redirect(getAdminPortalPath());
}

export async function createBrandAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = brandSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Check brand details." };
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return { success: false, message: "Supabase admin client is not configured." };
  }

  const slug = parsed.data.slug?.trim() || slugify(parsed.data.name);
  const { error } = await supabase.from("brands").insert({
    name: parsed.data.name.trim(),
    slug,
    logo_url: parsed.data.logoUrl || null,
    website_url: parsed.data.websiteUrl || null,
  });

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/admin/brands");
  revalidatePath("/admin/dashboard");
  return { success: true, message: "Brand created." };
}

export async function updateBrandAction(brandId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = brandSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Check brand details." };
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return { success: false, message: "Supabase admin client is not configured." };
  }

  const { error } = await supabase
    .from("brands")
    .update({
      name: parsed.data.name.trim(),
      slug: parsed.data.slug?.trim() || slugify(parsed.data.name),
      logo_url: parsed.data.logoUrl || null,
      website_url: parsed.data.websiteUrl || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", brandId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/admin/brands");
  revalidatePath(`/admin/brands/${brandId}`);
  return { success: true, message: "Brand updated." };
}

export async function addBrandUserAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = brandUserSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Check partner user details." };
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return { success: false, message: "Supabase admin client is not configured." };
  }

  const { error } = await supabase.from("brand_users").upsert({
    brand_id: parsed.data.brandId,
    email: parsed.data.email.toLowerCase(),
    role: parsed.data.role,
  }, { onConflict: "brand_id,email" });

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath(`/admin/brands/${parsed.data.brandId}`);
  return { success: true, message: "Brand partner user saved." };
}

export async function assignDealBrandAction(dealId: string, _state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const brandId = String(formData.get("brandId") ?? "");
  const supabase = createAdminClient();

  if (!supabase) {
    return { success: false, message: "Supabase admin client is not configured." };
  }

  const { error } = await supabase
    .from("deals")
    .update({ brand_id: brandId || null })
    .eq("id", dealId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/admin/deals");
  revalidatePath("/admin/dashboard");
  revalidatePath(`/admin/deals/${dealId}`);
  return { success: true, message: "Deal brand assignment updated." };
}

export async function updateDealControlAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = dealControlSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Check deal controls." };
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return { success: false, message: "Supabase admin client is not configured." };
  }

  const { error } = await supabase
    .from("deals")
    .update({
      status: parsed.data.status,
      current_count: parsed.data.currentCount,
      ...(parsed.data.expiresAt ? { expires_at: parsed.data.expiresAt } : {}),
    })
    .eq("id", parsed.data.dealId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/deals");
  revalidatePath(`/admin/deals/${parsed.data.dealId}`);
  revalidatePath(`/deal/${parsed.data.dealId}`);
  revalidateUnlockMarketplace();
  return { success: true, message: "Deal controls updated." };
}

export async function updateReservationAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = reservationUpdateSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Check reservation status." };
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return { success: false, message: "Supabase admin client is not configured." };
  }

  const { error } = await supabase
    .from("reservations")
    .update({
      payment_status: parsed.data.paymentStatus,
      final_purchase_status: parsed.data.finalPurchaseStatus,
    })
    .eq("id", parsed.data.reservationId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/admin/reservations");
  revalidatePath("/admin/dashboard");
  return { success: true, message: "Reservation updated." };
}

export async function deleteReservationAction(formData: FormData) {
  await requireAdmin();
  const reservationId = String(formData.get("reservationId") ?? "");
  const supabase = createAdminClient();

  if (!supabase || !reservationId) {
    return;
  }

  await supabase.from("reservations").delete().eq("id", reservationId);
  revalidatePath("/admin/reservations");
  revalidatePath("/admin/dashboard");
}

export async function updatePrivateUnlockMemberAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = privateUnlockMemberUpdateSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Check member status." };
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return { success: false, message: "Supabase admin client is not configured." };
  }

  const { error } = await supabase
    .from("private_unlock_members")
    .update({ payment_status: parsed.data.paymentStatus })
    .eq("id", parsed.data.memberId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/admin/reservations");
  revalidatePath("/admin/dashboard");
  return { success: true, message: "Join record updated." };
}

export async function deletePrivateUnlockMemberAction(formData: FormData) {
  await requireAdmin();
  const memberId = String(formData.get("memberId") ?? "");
  const unlockId = String(formData.get("unlockId") ?? "");
  const supabase = createAdminClient();

  if (!supabase || !memberId) {
    return;
  }

  await supabase.from("private_unlock_members").delete().eq("id", memberId);

  if (unlockId) {
    const { count } = await supabase
      .from("private_unlock_members")
      .select("id", { count: "exact", head: true })
      .eq("unlock_id", unlockId);

    await supabase
      .from("private_unlocks")
      .update({ current_count: count ?? 0 })
      .eq("id", unlockId);
  }

  revalidatePath("/admin/reservations");
  revalidatePath("/admin/dashboard");
}

export async function deletePrivateUnlockDealAction(formData: FormData) {
  await requireAdmin();
  const dealId = String(formData.get("dealId") ?? "");
  const supabase = createAdminClient();

  if (!supabase || !dealId) {
    return;
  }

  await supabase.from("private_unlock_deal_configs").delete().eq("deal_id", dealId);
  await supabase.from("deals").delete().eq("id", dealId);

  revalidateUnlockMarketplace();
  revalidatePath("/private-unlock");
  revalidatePath("/admin/deals");
  revalidatePath("/admin/dashboard");
  redirect("/admin/deals");
}

export async function updateCouponClaimAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = couponClaimUpdateSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Check coupon claim status." };
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return { success: false, message: "Supabase admin client is not configured." };
  }

  const { data: claim, error: lookupError } = await supabase
    .from("coupon_claims")
    .select("unlocked_coupon_id")
    .eq("id", parsed.data.claimId)
    .maybeSingle();

  if (lookupError) {
    return { success: false, message: lookupError.message };
  }

  const { error } = await supabase
    .from("coupon_claims")
    .update({ email_delivery_status: parsed.data.emailDeliveryStatus })
    .eq("id", parsed.data.claimId);

  if (error) {
    return { success: false, message: error.message };
  }

  if (claim?.unlocked_coupon_id) {
    await supabase
      .from("unlocked_coupons")
      .update({ email_delivery_status: parsed.data.emailDeliveryStatus })
      .eq("id", claim.unlocked_coupon_id);
  }

  revalidatePath("/admin/reservations");
  revalidatePath("/admin/dashboard");
  return { success: true, message: "Coupon delivery status updated." };
}

export async function deleteCouponClaimAction(formData: FormData) {
  await requireAdmin();
  const claimId = String(formData.get("claimId") ?? "");
  const supabase = createAdminClient();

  if (!supabase || !claimId) {
    return;
  }

  await supabase.from("coupon_claims").delete().eq("id", claimId);
  revalidatePath("/admin/reservations");
  revalidatePath("/admin/dashboard");
}

export async function addDummyUnlockMemberAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = dummyUnlockMemberSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Check dummy user details." };
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return { success: false, message: "Supabase admin client is not configured." };
  }

  const { data: member, error } = await supabase
    .from("private_unlock_members")
    .insert({
      unlock_id: parsed.data.unlockId,
      deal_id: parsed.data.dealId,
      name: parsed.data.name.trim(),
      phone: parsed.data.phone.trim(),
      email: parsed.data.email.trim(),
      razorpay_payment_id: `pay_dummy_${Date.now()}`,
      amount_paid: 0,
      payment_status: "paid",
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, message: error.message };
  }

  const { count } = await supabase
    .from("private_unlock_members")
    .select("id", { count: "exact", head: true })
    .eq("unlock_id", parsed.data.unlockId);

  await supabase
    .from("private_unlocks")
    .update({ current_count: count ?? 0 })
    .eq("id", parsed.data.unlockId);

  await createUnlockedCouponsForPrivateUnlock(parsed.data.unlockId);

  revalidatePath("/admin/reservations");
  revalidatePath("/admin/dashboard");
  revalidatePath(`/unlock/${parsed.data.unlockId}`);
  return { success: true, message: `Dummy user added${member?.id ? "." : "."}` };
}

export async function createDummyUnlockRoomAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = dummyUnlockRoomSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { success: false, message: "Choose a deal for the dummy room." };
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return { success: false, message: "Supabase admin client is not configured." };
  }

  const { data: config, error: configError } = await supabase
    .from("private_unlock_deal_configs")
    .select("threshold, discount_percent, coupon_prefix")
    .eq("deal_id", parsed.data.dealId)
    .maybeSingle();

  if (configError) {
    return { success: false, message: configError.message };
  }

  if (!config) {
    return { success: false, message: "Deal config not found." };
  }

  const shareCode = createAdminShareCode();
  const { error } = await supabase
    .from("private_unlocks")
    .insert({
      deal_id: parsed.data.dealId,
      share_code: shareCode,
      threshold: Number(config.threshold ?? 3),
      discount_percent: Number(config.discount_percent ?? 20),
      coupon_code: `${String(config.coupon_prefix ?? "GRUPIN")}${Number(config.discount_percent ?? 20)}${shareCode}`,
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      current_count: 0,
    });

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/admin/reservations");
  revalidatePath("/admin/dashboard");
  return { success: true, message: `Dummy room ${shareCode} created.` };
}

export async function deletePrivateUnlockRoomAction(formData: FormData) {
  await requireAdmin();
  const unlockId = String(formData.get("unlockId") ?? "");
  const supabase = createAdminClient();

  if (!supabase || !unlockId) {
    return;
  }

  await supabase.from("private_unlocks").delete().eq("id", unlockId);
  revalidatePath("/admin/reservations");
  revalidatePath("/admin/dashboard");
}

export async function updatePrivateUnlockRoomAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = unlockRoomUpdateSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Check room controls." };
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return { success: false, message: "Supabase admin client is not configured." };
  }

  const expiresAt = parsed.data.status === "expired"
    ? new Date(Date.now() - 60 * 1000).toISOString()
    : parsed.data.expiresAt
      ? new Date(parsed.data.expiresAt).toISOString()
      : new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("private_unlocks")
    .update({ expires_at: expiresAt })
    .eq("id", parsed.data.unlockId);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath("/admin/reservations");
  revalidatePath("/admin/dashboard");
  return { success: true, message: "Room expiry updated." };
}

export async function updatePlatformCouponInventoryAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = platformInventorySchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Check platform coupon inventory." };
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return { success: false, message: "Supabase admin client is not configured." };
  }

  const { error } = await supabase
    .from("platform_coupon_inventory")
    .upsert({
      id: true,
      total: parsed.data.total,
      claimed: parsed.data.claimed,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

  if (error) {
    return { success: false, message: error.message };
  }

  revalidateUnlockMarketplace();
  revalidatePath("/admin/dashboard");
  return {
    success: true,
    message: parsed.data.claimed >= parsed.data.total
      ? "Global coupon inventory exhausted. New joins are disabled."
      : "Global coupon inventory updated.",
  };
}

export async function sendTelegramTestAction(_state: ActionState): Promise<ActionState> {
  await requireAdmin();

  const result = await sendTelegramMessage({
    text: [
      "<b>GruPin Telegram test</b>",
      "",
      `Admin portal: ${escapeTelegramHtml(getAdminPortalPath("/dashboard"))}`,
      `Time: ${escapeTelegramHtml(new Date().toLocaleString("en-IN"))}`,
      "",
      "If you received this, Telegram alerts are working.",
    ].join("\n"),
  });

  if (!result.delivered) {
    return { success: false, message: result.reason ?? "Telegram test failed." };
  }

  return { success: true, message: "Telegram test message sent." };
}
