"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createUnlockedCouponsForPrivateUnlock, getDealById, joinDeal, listInterestsByDeal, syncProductTeamUnlockOrderStatus, updateDeal } from "@/lib/data";
import { queueNotifications } from "@/lib/notifications";
import { slugify } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase-admin";
import { clearAdminKeywordSession, createAdminKeywordSession, getAdminPortalPath } from "@/lib/admin-keyword-auth";
import { escapeTelegramHtml, sendTelegramMessage } from "@/lib/telegram";
import { effectiveTeamDiscountPercent, highestPricedVariant, productDisplayPrice, teamPrice } from "@/lib/product-pricing";
import { BrandProduct, ProductVariant } from "@/lib/types";

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

const productSchema = z.object({
  productId: z.string().optional(),
  brandId: z.string().min(1),
  title: z.string().min(2),
  slug: z.string().min(2).optional().or(z.literal("")),
  vendor: z.string().optional().or(z.literal("")),
  primaryImage: optionalUrl,
  imageUrls: z.string().optional().or(z.literal("")),
  variants: z.string().optional().or(z.literal("")),
  tags: z.string().optional().or(z.literal("")),
  productTypes: z.string().optional().or(z.literal("")),
  priceMin: z.coerce.number().min(0).optional().or(z.literal("")),
  priceMax: z.coerce.number().min(0).optional().or(z.literal("")),
  sourceUrl: optionalUrl,
  mrp: z.coerce.number().min(0).optional().or(z.literal("")),
  salePrice: z.coerce.number().min(0).optional().or(z.literal("")),
  sourceDiscountPercent: z.coerce.number().min(0).max(100).optional().or(z.literal("")),
  rating: z.coerce.number().min(0).max(5).optional().or(z.literal("")),
  ratingCount: z.coerce.number().int().min(0).optional().or(z.literal("")),
  inStock: z.string().optional().transform((value) => value === "on"),
  variantCount: z.coerce.number().int().min(0).optional().or(z.literal("")),
  variantType: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  howToUse: z.string().optional().or(z.literal("")),
  ingredients: z.string().optional().or(z.literal("")),
});

const productRoomUpdateSchema = z.object({
  unlockId: z.string().min(1),
  status: z.enum(["active", "unlocked", "expired", "completed", "cancelled"]),
  threshold: z.coerce.number().int().min(1),
  currentCount: z.coerce.number().int().min(0),
  expiresAt: z.string().optional(),
});

const dummyProductRoomSchema = z.object({
  productId: z.string().min(1),
});

const dummyProductMemberSchema = z.object({
  unlockId: z.string().min(1),
  productId: z.string().optional().or(z.literal("")),
  brandId: z.string().min(1),
  phone: z.string().min(8),
  roomScope: z.enum(["product", "brand"]).default("brand"),
});

const adminCartItemSchema = z.object({
  unlockId: z.string().min(1),
  memberId: z.string().min(1),
  productVariant: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(4),
});

const productOrderUpdateSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(["hold", "confirmed", "refund_pending", "refunded", "cancelled"]),
  amountPaid: z.coerce.number().int().min(0),
});

const productOrderTrackingUpdateSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(["hold", "confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered", "refund_pending", "refunded", "cancelled"]),
  remark: z.string().max(1000).optional().or(z.literal("")),
});

const dummyProductOrderSchema = z.object({
  unlockId: z.string().min(1),
  productId: z.string().optional().or(z.literal("")),
  brandId: z.string().min(1),
  buyerName: z.string().min(2),
  buyerPhone: z.string().min(8),
  buyerEmail: z.string().email().optional().or(z.literal("")),
  amountPaid: z.coerce.number().int().min(0),
});

function parseCsvList(value?: string) {
  return (value ?? "").split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}

function parseJson(value: string | undefined, fallback: unknown) {
  if (!value?.trim()) return fallback;
  return JSON.parse(value);
}

function revalidateProductAdmin() {
  revalidateTag("brand-products", { expire: 0 });
  revalidatePath("/admin/catalog");
  revalidatePath("/admin/product-rooms");
  revalidatePath("/admin/product-orders");
  revalidatePath("/catalog");
}

function adminVariantKey(variant: ProductVariant | null) {
  return variant?.child_id || variant?.sku || variant?.title || "default";
}

function adminRoomDeadlinePassed(room: { expires_at?: unknown }) {
  return room.expires_at ? new Date(String(room.expires_at)).getTime() <= Date.now() : false;
}

function adminRoomClosed(room: { status?: unknown; expires_at?: unknown }) {
  return ["completed", "cancelled", "expired"].includes(String(room.status ?? "")) || adminRoomDeadlinePassed(room);
}

function adminVariantLabel(variant: ProductVariant | null) {
  return variant?.variant_name || variant?.pack_size || variant?.title || "Default";
}

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

export async function upsertProductAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = productSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Check product details." };
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return { success: false, message: "Supabase admin client is not configured." };
  }

  try {
    const productId = parsed.data.productId?.trim();
    const slug = parsed.data.slug?.trim() || slugify(parsed.data.title);
    const payload = {
      brand_id: parsed.data.brandId,
      title: parsed.data.title.trim(),
      slug,
      vendor: parsed.data.vendor || null,
      primary_image: parsed.data.primaryImage || null,
      image_urls: parseCsvList(parsed.data.imageUrls),
      variants: parseJson(parsed.data.variants, []),
      tags: parseCsvList(parsed.data.tags),
      product_types: parseCsvList(parsed.data.productTypes),
      price_min: parsed.data.priceMin === "" ? null : parsed.data.priceMin,
      price_max: parsed.data.priceMax === "" ? null : parsed.data.priceMax,
      source_url: parsed.data.sourceUrl || null,
      mrp: parsed.data.mrp === "" ? null : parsed.data.mrp,
      sale_price: parsed.data.salePrice === "" ? null : parsed.data.salePrice,
      source_discount_percent: parsed.data.sourceDiscountPercent === "" ? null : parsed.data.sourceDiscountPercent,
      rating: parsed.data.rating === "" ? null : parsed.data.rating,
      rating_count: parsed.data.ratingCount === "" ? null : parsed.data.ratingCount,
      in_stock: parsed.data.inStock,
      variant_count: parsed.data.variantCount === "" ? null : parsed.data.variantCount,
      variant_type: parsed.data.variantType || null,
      description: parsed.data.description || null,
      how_to_use: parsed.data.howToUse || null,
      ingredients: parsed.data.ingredients || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = productId
      ? await supabase.from("products").update(payload).eq("id", productId).select("id").single()
      : await supabase.from("products").insert(payload).select("id").single();

    if (error) {
      return { success: false, message: error.message };
    }

    revalidateProductAdmin();
    revalidatePath(`/admin/catalog/${data.id}`);
    return { success: true, message: productId ? "Product updated." : "Product created." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Could not save product." };
  }
}

export async function deleteProductAction(formData: FormData) {
  await requireAdmin();
  const productId = String(formData.get("productId") ?? "");
  const supabase = createAdminClient();

  if (!supabase || !productId) return;

  await supabase.from("products").delete().eq("id", productId);
  revalidateProductAdmin();
  redirect("/admin/catalog");
}

export async function createDummyProductRoomAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = dummyProductRoomSchema.safeParse(Object.fromEntries(formData));
  const supabase = createAdminClient();

  if (!parsed.success) return { success: false, message: "Choose a product." };
  if (!supabase) return { success: false, message: "Supabase admin client is not configured." };

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("brand_id")
    .eq("id", parsed.data.productId)
    .maybeSingle();

  if (productError) return { success: false, message: productError.message };
  if (!product?.brand_id) return { success: false, message: "Product not found." };

  const shareCode = createAdminShareCode();
  const { error } = await supabase.from("product_team_unlocks").insert({
    product_id: null,
    brand_id: product.brand_id,
    share_code: shareCode,
    threshold: 3,
    discount_percent: 25,
    room_scope: "brand",
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });

  if (error) return { success: false, message: error.message };

  revalidatePath("/admin/product-rooms");
  revalidatePath("/admin/dashboard");
  return { success: true, message: `Brand Team Room ${shareCode} created.` };
}

export async function addDummyProductTeamMemberAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = dummyProductMemberSchema.safeParse(Object.fromEntries(formData));
  const supabase = createAdminClient();

  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Check member details." };
  if (!supabase) return { success: false, message: "Supabase admin client is not configured." };

  const { data: unlock, error: unlockError } = await supabase
    .from("product_team_unlocks")
    .select("id, status, expires_at")
    .eq("id", parsed.data.unlockId)
    .maybeSingle();

  if (unlockError) return { success: false, message: unlockError.message };
  if (!unlock) return { success: false, message: "Team Room not found." };
  if (adminRoomClosed(unlock)) {
    await syncProductTeamUnlockOrderStatus(parsed.data.unlockId);
    return { success: false, message: "This Team Room is closed." };
  }

  const { error } = await supabase.from("product_team_unlock_members").insert({
    unlock_id: parsed.data.unlockId,
    product_id: parsed.data.productId || null,
    brand_id: parsed.data.brandId,
    phone: parsed.data.phone.trim(),
    role: "member",
    room_scope: parsed.data.roomScope,
  });

  if (error) return { success: false, message: error.message };

  await syncProductTeamUnlockOrderStatus(parsed.data.unlockId);

  revalidatePath("/admin/product-rooms");
  return { success: true, message: "Dummy member added. Add cart items through the user flow to increase cart readiness." };
}

export async function addAdminProductTeamCartItemAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = adminCartItemSchema.safeParse(Object.fromEntries(formData));
  const supabase = createAdminClient();

  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Check cart item details." };
  if (!supabase) return { success: false, message: "Supabase admin client is not configured." };

  let productId = "";
  let variantKey = "default";

  try {
    const parsedValue = JSON.parse(parsed.data.productVariant) as { productId?: string; variantKey?: string };
    productId = String(parsedValue.productId ?? "");
    variantKey = String(parsedValue.variantKey ?? "default");
  } catch {
    return { success: false, message: "Choose a product variant." };
  }

  if (!productId) return { success: false, message: "Choose a product." };

  const [{ data: unlock, error: unlockError }, { data: member, error: memberError }, { data: productRow, error: productError }] = await Promise.all([
    supabase
      .from("product_team_unlocks")
      .select("id, brand_id, discount_percent, status, current_count, threshold, expires_at")
      .eq("id", parsed.data.unlockId)
      .maybeSingle(),
    supabase
      .from("product_team_unlock_members")
      .select("id, unlock_id, brand_id, cart_status")
      .eq("id", parsed.data.memberId)
      .eq("unlock_id", parsed.data.unlockId)
      .maybeSingle(),
    supabase
      .from("products")
      .select("id, brand_id, title, slug, vendor, primary_image, image_urls, variants, tags, product_types, price_min, price_max, source_url, mrp, sale_price, source_discount_percent, brands(slug)")
      .eq("id", productId)
      .maybeSingle(),
  ]);

  if (unlockError) return { success: false, message: unlockError.message };
  if (memberError) return { success: false, message: memberError.message };
  if (productError) return { success: false, message: productError.message };
  if (!unlock) return { success: false, message: "Team Room not found." };
  if (!member) return { success: false, message: "Member not found in this Team Room." };
  if (!productRow) return { success: false, message: "Product not found." };
  if (String(unlock.brand_id) !== String(productRow.brand_id) || String(member.brand_id) !== String(unlock.brand_id)) {
    return { success: false, message: "Product and member must belong to this Team Room brand." };
  }
  if (unlock.status === "completed" || unlock.status === "cancelled" || unlock.status === "expired") {
    return { success: false, message: "This Team Room is closed." };
  }
  if (adminRoomDeadlinePassed(unlock)) {
    await syncProductTeamUnlockOrderStatus(parsed.data.unlockId);
    return { success: false, message: "This Team Room is closed." };
  }
  if (member.cart_status === "checked_out") {
    return { success: false, message: "This member has already checked out." };
  }

  const { count: existingMemberCartCount, error: existingMemberCartCountError } = await supabase
    .from("product_team_cart_items")
    .select("id", { count: "exact", head: true })
    .eq("member_id", parsed.data.memberId);

  if (existingMemberCartCountError) return { success: false, message: existingMemberCartCountError.message };
  if (!existingMemberCartCount && Number(unlock.current_count ?? 0) >= Number(unlock.threshold ?? 3)) {
    return { success: false, message: "This Team Room already has enough eligible carts. This member cannot add a new cart." };
  }

  const brandRelation = productRow.brands;
  const brandRow = Array.isArray(brandRelation) ? brandRelation[0] : brandRelation;
  const product = {
    id: String(productRow.id),
    brandId: String(productRow.brand_id),
    brand: brandRow && typeof brandRow === "object" ? { id: String(productRow.brand_id), name: "", slug: String((brandRow as { slug?: unknown }).slug ?? "") } : null,
    title: String(productRow.title ?? ""),
    slug: String(productRow.slug ?? ""),
    vendor: (productRow.vendor as string | null | undefined) ?? null,
    primaryImage: (productRow.primary_image as string | null | undefined) ?? null,
    imageUrls: Array.isArray(productRow.image_urls) ? productRow.image_urls as string[] : [],
    variants: Array.isArray(productRow.variants) ? productRow.variants as ProductVariant[] : [],
    tags: Array.isArray(productRow.tags) ? productRow.tags as string[] : [],
    productTypes: Array.isArray(productRow.product_types) ? productRow.product_types as string[] : [],
    priceMin: productRow.price_min === null || productRow.price_min === undefined ? null : Number(productRow.price_min),
    priceMax: productRow.price_max === null || productRow.price_max === undefined ? null : Number(productRow.price_max),
    sourceProductIds: [],
    sourceHandles: [],
    sourceFiles: [],
    productUrl: (productRow.source_url as string | null | undefined) ?? null,
    mrp: productRow.mrp === null || productRow.mrp === undefined ? null : Number(productRow.mrp),
    salePrice: productRow.sale_price === null || productRow.sale_price === undefined ? null : Number(productRow.sale_price),
    sourceDiscountPercent: productRow.source_discount_percent === null || productRow.source_discount_percent === undefined ? null : Number(productRow.source_discount_percent),
  } satisfies BrandProduct;

  const selectedVariant = product.variants.find((variant) => adminVariantKey(variant) === variantKey) ?? highestPricedVariant(product);
  const finalVariantKey = adminVariantKey(selectedVariant);
  const mrp = selectedVariant?.price ?? productDisplayPrice(product) ?? 0;
  const discount = Math.max(Number(unlock.discount_percent ?? 0), effectiveTeamDiscountPercent(product));
  const team = teamPrice(mrp, discount) ?? mrp;
  const imageUrl = selectedVariant?.image_url ?? product.primaryImage ?? product.imageUrls[0] ?? null;

  const itemPayload = {
    unlock_id: parsed.data.unlockId,
    member_id: parsed.data.memberId,
    product_id: product.id,
    brand_id: product.brandId,
    selected_variant: selectedVariant ?? null,
    variant_key: finalVariantKey,
    quantity: parsed.data.quantity,
    mrp_snapshot: Math.round(mrp),
    team_price_snapshot: Math.round(team),
    discount_percent_snapshot: discount,
    product_snapshot: {
      title: product.title,
      slug: product.slug,
      brandSlug: product.brand?.slug,
      imageUrl,
      productUrl: product.productUrl,
      variantLabel: adminVariantLabel(selectedVariant),
    },
    updated_at: new Date().toISOString(),
  };

  const { data: existingItem } = await supabase
    .from("product_team_cart_items")
    .select("id")
    .eq("member_id", parsed.data.memberId)
    .eq("product_id", product.id)
    .eq("variant_key", finalVariantKey)
    .maybeSingle();

  const { error } = existingItem?.id
    ? await supabase.from("product_team_cart_items").update(itemPayload).eq("id", existingItem.id)
    : await supabase.from("product_team_cart_items").insert(itemPayload);

  if (error) return { success: false, message: error.message };

  const { error: memberUpdateError } = await supabase
    .from("product_team_unlock_members")
    .update({ cart_status: "active" })
    .eq("id", parsed.data.memberId);

  if (memberUpdateError) return { success: false, message: memberUpdateError.message };

  await syncProductTeamUnlockOrderStatus(parsed.data.unlockId);

  revalidatePath("/admin/product-rooms");
  revalidatePath("/admin/dashboard");
  return { success: true, message: "Cart item added." };
}

export async function deleteProductTeamMemberAction(formData: FormData) {
  await requireAdmin();
  const memberId = String(formData.get("memberId") ?? "");
  const unlockId = String(formData.get("unlockId") ?? "");
  const supabase = createAdminClient();

  if (!supabase || !memberId) return;

  if (unlockId) {
    const [{ data: unlock }, { count: memberCartCount }] = await Promise.all([
      supabase
        .from("product_team_unlocks")
        .select("id, status, current_count, threshold, expires_at")
        .eq("id", unlockId)
        .maybeSingle(),
      supabase
        .from("product_team_cart_items")
        .select("id", { count: "exact", head: true })
        .eq("member_id", memberId),
    ]);

    const roomUnlocked = Boolean(unlock && !adminRoomClosed(unlock) && Number(unlock.current_count ?? 0) >= Number(unlock.threshold ?? 3));

    if (roomUnlocked && Number(memberCartCount ?? 0) > 0) {
      return;
    }
  }

  await supabase.from("product_team_unlock_members").delete().eq("id", memberId);

  if (unlockId) {
    await syncProductTeamUnlockOrderStatus(unlockId);
  }

  revalidatePath("/admin/product-rooms");
  revalidatePath("/admin/dashboard");
}

export async function updateProductTeamRoomAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = productRoomUpdateSchema.safeParse(Object.fromEntries(formData));
  const supabase = createAdminClient();

  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Check room controls." };
  if (!supabase) return { success: false, message: "Supabase admin client is not configured." };

  const expiresAt = parsed.data.status === "expired"
    ? new Date().toISOString()
    : parsed.data.expiresAt
      ? new Date(parsed.data.expiresAt).toISOString()
      : undefined;
  const closedAt = ["expired", "completed", "cancelled"].includes(parsed.data.status) ? new Date().toISOString() : null;

  const { error } = await supabase
    .from("product_team_unlocks")
    .update({
      status: parsed.data.status,
      threshold: parsed.data.threshold,
      current_count: parsed.data.currentCount,
      expires_at: expiresAt,
      closed_at: closedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.unlockId);

  if (error) return { success: false, message: error.message };
  if (parsed.data.status === "expired") {
    await syncProductTeamUnlockOrderStatus(parsed.data.unlockId);
  }
  revalidatePath("/admin/product-rooms");
  revalidatePath("/admin/dashboard");
  return { success: true, message: "Team Room updated." };
}

export async function deleteProductTeamRoomAction(formData: FormData) {
  await requireAdmin();
  const unlockId = String(formData.get("unlockId") ?? "");
  const supabase = createAdminClient();
  if (!supabase || !unlockId) return;
  await supabase.from("product_team_unlocks").delete().eq("id", unlockId);
  revalidatePath("/admin/product-rooms");
  revalidatePath("/admin/dashboard");
}

export async function updateProductTeamOrderAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = productOrderUpdateSchema.safeParse(Object.fromEntries(formData));
  const supabase = createAdminClient();

  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Check order controls." };
  if (!supabase) return { success: false, message: "Supabase admin client is not configured." };

  const { data: existingOrder } = await supabase
    .from("product_team_orders")
    .select("unlock_id")
    .eq("id", parsed.data.orderId)
    .maybeSingle();

  const { error } = await supabase
    .from("product_team_orders")
    .update({ status: parsed.data.status, amount_paid: parsed.data.amountPaid, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.orderId);

  if (error) return { success: false, message: error.message };
  if (existingOrder?.unlock_id) {
    await syncProductTeamUnlockOrderStatus(String(existingOrder.unlock_id));
  }
  revalidatePath("/admin/product-orders");
  revalidatePath("/admin/dashboard");
  return { success: true, message: "Product order updated." };
}

export async function addProductTeamOrderTrackingUpdateAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = productOrderTrackingUpdateSchema.safeParse(Object.fromEntries(formData));
  const supabase = createAdminClient();

  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Check tracking update." };
  if (!supabase) return { success: false, message: "Supabase admin client is not configured." };

  const { data: order, error: orderError } = await supabase
    .from("product_team_orders")
    .select("id, unlock_id, status")
    .eq("id", parsed.data.orderId)
    .maybeSingle();

  if (orderError) return { success: false, message: orderError.message };
  if (!order) return { success: false, message: "Order not found." };

  const { error } = await supabase.from("product_team_order_updates").insert({
    order_id: parsed.data.orderId,
    status: parsed.data.status,
    remark: parsed.data.remark?.trim() || null,
    created_by: "admin",
  });

  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") {
      return { success: false, message: "Run the product order tracking migration before adding timeline updates." };
    }

    return { success: false, message: error.message };
  }

  if (["hold", "confirmed", "refund_pending", "refunded", "cancelled"].includes(parsed.data.status)) {
    const { error: updateError } = await supabase
      .from("product_team_orders")
      .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
      .eq("id", parsed.data.orderId);

    if (updateError) return { success: false, message: updateError.message };
    await syncProductTeamUnlockOrderStatus(String(order.unlock_id));
  }

  revalidatePath("/admin/product-orders");
  revalidatePath("/admin/dashboard");
  revalidatePath(`/account/orders/${parsed.data.orderId}`);
  revalidatePath("/account/orders");
  return { success: true, message: "Tracking update added." };
}

export async function createDummyProductOrderAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = dummyProductOrderSchema.safeParse(Object.fromEntries(formData));
  const supabase = createAdminClient();

  if (!parsed.success) return { success: false, message: parsed.error.issues[0]?.message ?? "Check dummy order details." };
  if (!supabase) return { success: false, message: "Supabase admin client is not configured." };

  const { data: unlock, error: unlockError } = await supabase
    .from("product_team_unlocks")
    .select("id, status, current_count, threshold, expires_at")
    .eq("id", parsed.data.unlockId)
    .maybeSingle();

  if (unlockError) return { success: false, message: unlockError.message };
  if (!unlock) return { success: false, message: "Team Room not found." };
  if (adminRoomClosed(unlock) || Number(unlock.current_count ?? 0) < Number(unlock.threshold ?? 3)) {
    await syncProductTeamUnlockOrderStatus(parsed.data.unlockId);
    return { success: false, message: "This Team Room is not open for checkout." };
  }

  const { data: members, error: membersError } = await supabase
    .from("product_team_unlock_members")
    .select("id")
    .eq("unlock_id", parsed.data.unlockId)
    .limit(1);

  if (membersError) return { success: false, message: membersError.message };
  const cartMemberId = members?.[0]?.id ?? null;

  const { error } = await supabase.from("product_team_orders").insert({
    unlock_id: parsed.data.unlockId,
    product_id: parsed.data.productId || null,
    brand_id: parsed.data.brandId,
    cart_member_id: cartMemberId,
    buyer_name: parsed.data.buyerName.trim(),
    buyer_phone: parsed.data.buyerPhone.trim(),
    buyer_email: parsed.data.buyerEmail || null,
    amount_paid: parsed.data.amountPaid,
    status: "hold",
    delivery_address: {},
    razorpay_payment_id: `pay_dummy_product_${Date.now()}`,
  });

  if (error) return { success: false, message: error.message };

  await syncProductTeamUnlockOrderStatus(parsed.data.unlockId);

  revalidatePath("/admin/product-orders");
  revalidatePath("/admin/product-rooms");
  revalidatePath("/admin/dashboard");
  return { success: true, message: "Dummy product order created." };
}

export async function deleteProductTeamOrderAction(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const supabase = createAdminClient();
  if (!supabase || !orderId) return;
  const { data: order } = await supabase.from("product_team_orders").select("unlock_id").eq("id", orderId).maybeSingle();
  await supabase.from("product_team_orders").delete().eq("id", orderId);
  if (order?.unlock_id) {
    await syncProductTeamUnlockOrderStatus(String(order.unlock_id));
  }
  revalidatePath("/admin/product-orders");
  revalidatePath("/admin/dashboard");
}
