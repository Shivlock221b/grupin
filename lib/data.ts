import { cache } from "react";
import { createClient } from "@/supabase/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { isTestPhoneCredential, normalizePhone, phoneLookupVariants } from "@/lib/otp";
import { mockDeals, mockInterests, mockNotificationEvents, mockProfiles } from "@/lib/mock-data";
import {
  Deal,
  DealFilters,
  DealInterest,
  DealStatus,
  Brand,
  BrandUser,
  DashboardDeal,
  DashboardReservation,
  DealCoupon,
  AdminCouponClaim,
  AdminPrivateUnlockDeal,
  AdminPrivateUnlockMember,
  AdminPrivateUnlockRoom,
  AccountProfile,
  AccountUnlockRoom,
  AccountUnlockedCoupon,
  NotificationEvent,
  Profile,
  GroupDeal,
  PrivateUnlockDealConfig,
  PrivateUnlock,
  PrivateUnlockMember,
  Reservation,
  UserDealInterest,
} from "@/lib/types";
import { formatDiscountBand } from "@/lib/utils";

type CreateDealInput = Omit<Deal, "id" | "currentInterestCount">;
type UpdateDealInput = Partial<CreateDealInput> & { status?: DealStatus };
type JoinDealInput = {
  dealId: string;
  fullName: string;
  email: string;
  phone: string;
  area?: string;
  city?: string;
  whatsappOptIn: boolean;
};

function mapDeal(row: Record<string, unknown>): Deal {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    merchant: String(row.merchant),
    category: String(row.category),
    city: String(row.city),
    area: String(row.area),
    description: String(row.description),
    discountPercent: Number(row.discount_percent),
    creditDescription: String(row.credit_description),
    minimumInterestCount: Number(row.minimum_interest_count),
    currentInterestCount: Number(row.current_interest_count ?? 0),
    status: row.status as DealStatus,
    closeDate: (row.close_date as string | null | undefined) ?? null,
    heroImage: String(row.hero_image),
    terms: Array.isArray(row.terms) ? (row.terms as string[]) : [],
    featured: Boolean(row.featured),
  };
}

function getDemoExpiresAt() {
  return new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isDemoGroupDealId(value: string) {
  return value === "00000000-0000-0000-0000-000000000101" || value === "antinorm-combo" || value === "demo";
}

function publicReservation(row: Reservation): Reservation {
  return {
    ...row,
    phone: "",
    email: "",
    razorpayPaymentId: "",
  };
}

function mapGroupDeal(row: Record<string, unknown>): GroupDeal {
  return {
    id: String(row.id),
    title: String(row.title),
    originalPrice: Number(row.original_price),
    tiers: [
      { threshold: Number(row.tier_1_threshold), price: Number(row.tier_1_price) },
      { threshold: Number(row.tier_2_threshold), price: Number(row.tier_2_price) },
      { threshold: Number(row.tier_3_threshold), price: Number(row.tier_3_price) },
    ],
    currentCount: Number(row.current_count ?? 0),
    expiresAt: String(row.expires_at),
    createdAt: row.created_at ? String(row.created_at) : undefined,
  };
}

function mapPrivateUnlock(row: Record<string, unknown>): PrivateUnlock {
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

function mapPrivateUnlockDealConfig(row: Record<string, unknown>, deal: GroupDeal): PrivateUnlockDealConfig {
  return {
    id: String(row.id),
    dealId: String(row.deal_id),
    enabled: Boolean(row.enabled),
    headline: String(row.headline),
    brandName: String(row.brand_name),
    brandLogo: (row.brand_logo as string | null | undefined) ?? null,
    cardImage: String(row.card_image),
    bannerImage: String(row.banner_image),
    category: String(row.category),
    shortDescription: String(row.short_description),
    threshold: Number(row.threshold),
    discountPercent: Number(row.discount_percent),
    tokenAmount: Number(row.token_amount ?? 99),
    couponPrefix: String(row.coupon_prefix ?? "GRUPIN"),
    sortOrder: Number(row.sort_order ?? 100),
    featured: Boolean(row.featured),
    source: (row.source as string | null | undefined) ?? null,
    sourceFile: (row.source_file as string | null | undefined) ?? null,
    voucherUrl: (row.voucher_url as string | null | undefined) ?? null,
    scrapedDiscountPercent: row.scraped_discount_percent === null || row.scraped_discount_percent === undefined ? null : Number(row.scraped_discount_percent),
    voucherValue: row.voucher_value === null || row.voucher_value === undefined ? undefined : Number(row.voucher_value),
    flatDiscountAmount: row.flat_discount_amount === null || row.flat_discount_amount === undefined ? undefined : Number(row.flat_discount_amount),
    finalPayableAfterUnlock: row.final_payable_after_unlock === null || row.final_payable_after_unlock === undefined ? null : Number(row.final_payable_after_unlock),
    couponStockTotal: Number(row.coupon_stock_total ?? 12),
    couponStockClaimed: Number(row.coupon_stock_claimed ?? 0),
    deal,
    createdAt: row.created_at ? String(row.created_at) : undefined,
  };
}

function mapPrivateUnlockMember(row: Record<string, unknown>): PrivateUnlockMember {
  return {
    id: String(row.id),
    unlockId: String(row.unlock_id),
    dealId: String(row.deal_id),
    name: String(row.name),
    phone: String(row.phone),
    email: String(row.email),
    razorpayPaymentId: String(row.razorpay_payment_id),
    createdAt: String(row.created_at),
  };
}

function relationOne(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    return value[0] && typeof value[0] === "object" ? value[0] as Record<string, unknown> : null;
  }

  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

export async function getPlatformCouponInventory(): Promise<{ total: number; claimed: number; remaining: number; outOfStock: boolean }> {
  const supabase = createAdminClient();

  if (!supabase) {
    return { total: 100, claimed: 0, remaining: 100, outOfStock: false };
  }

  const { data, error } = await supabase
    .from("platform_coupon_inventory")
    .select("total, claimed")
    .eq("id", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const total = Number(data?.total ?? 100);
  const claimed = Number(data?.claimed ?? 0);
  const remaining = Math.max(0, total - claimed);

  return { total, claimed, remaining, outOfStock: remaining <= 0 };
}

export async function hasRecentPrivateUnlockJoin(phone: string, excludeUnlockId?: string): Promise<boolean> {
  if (isTestPhoneCredential(phone)) {
    return false;
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return false;
  }

  let query = supabase
    .from("private_unlock_members")
    .select("id")
    .in("phone", phoneLookupVariants(phone))
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(1);

  if (excludeUnlockId) {
    query = query.neq("unlock_id", excludeUnlockId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

function mapAccountProfile(row: Record<string, unknown>): AccountProfile {
  return {
    id: String(row.id),
    fullName: String(row.full_name),
    email: String(row.email),
    phone: String(row.phone),
    phoneVerified: Boolean(row.phone_verified),
    createdAt: row.created_at ? String(row.created_at) : undefined,
  };
}

function publicPrivateUnlockMember(row: PrivateUnlockMember): PrivateUnlockMember {
  return {
    ...row,
    phone: "",
    email: "",
    razorpayPaymentId: "",
  };
}

function mapBrand(row: Record<string, unknown>): Brand {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    logoUrl: (row.logo_url as string | null | undefined) ?? null,
    websiteUrl: (row.website_url as string | null | undefined) ?? null,
    createdAt: row.created_at ? String(row.created_at) : undefined,
  };
}

function mapDashboardDeal(row: Record<string, unknown>): DashboardDeal {
  const brandRow = Array.isArray(row.brands) ? row.brands[0] : row.brands;

  return {
    ...mapGroupDeal(row),
    slug: row.slug ? String(row.slug) : undefined,
    merchant: row.merchant ? String(row.merchant) : undefined,
    status: row.status as DealStatus | undefined,
    brand: brandRow ? mapBrand(brandRow as Record<string, unknown>) : null,
  };
}

function mapDashboardReservation(row: Record<string, unknown>): DashboardReservation {
  const dealRow = Array.isArray(row.deals) ? row.deals[0] : row.deals;
  const brandRow = dealRow && typeof dealRow === "object"
    ? Array.isArray((dealRow as Record<string, unknown>).brands)
      ? ((dealRow as Record<string, unknown>).brands as Record<string, unknown>[])[0]
      : (dealRow as Record<string, unknown>).brands
    : null;

  return {
    id: String(row.id),
    dealId: String(row.deal_id),
    name: String(row.name),
    phone: String(row.phone),
    email: String(row.email),
    razorpayPaymentId: String(row.razorpay_payment_id),
    createdAt: String(row.created_at),
    amountPaid: Number(row.amount_paid ?? 9900),
    paymentStatus: (row.payment_status as DashboardReservation["paymentStatus"]) ?? "paid",
    razorpayOrderId: (row.razorpay_order_id as string | null | undefined) ?? null,
    razorpaySignature: (row.razorpay_signature as string | null | undefined) ?? null,
    finalPurchaseStatus: (row.final_purchase_status as DashboardReservation["finalPurchaseStatus"]) ?? "pending",
    dealTitle: dealRow && typeof dealRow === "object" ? String((dealRow as Record<string, unknown>).title ?? "") : null,
    brandName: brandRow && typeof brandRow === "object" ? String((brandRow as Record<string, unknown>).name ?? "") : null,
  };
}

export function getDemoGroupDeal(): GroupDeal {
  return {
    id: "00000000-0000-0000-0000-000000000101",
    title: "Antinorm Combo",
    originalPrice: 2000,
    tiers: [
      { threshold: 20, price: 1600 },
      { threshold: 25, price: 1500 },
      { threshold: 30, price: 1400 },
    ],
    currentCount: 18,
    expiresAt: getDemoExpiresAt(),
  };
}

export const getGroupDealById = cache(async (id: string): Promise<GroupDeal | null> => {
  const supabase = createAdminClient() ?? await createClient();
  const demo = getDemoGroupDeal();

  if (!isUuid(id)) {
    return isDemoGroupDealId(id) ? demo : null;
  }

  if (!supabase) {
    return isDemoGroupDealId(id) ? demo : null;
  }

  const { data, error } = await supabase
    .from("deals")
    .select("id, title, original_price, tier_1_threshold, tier_1_price, tier_2_threshold, tier_2_price, tier_3_threshold, tier_3_price, current_count, expires_at, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (isDemoGroupDealId(id)) {
      return demo;
    }

    throw error;
  }

  return data ? mapGroupDeal(data) : isDemoGroupDealId(id) ? demo : null;
});

export async function getPrivateUnlockByCode(code: string): Promise<PrivateUnlock | null> {
  const supabase = createAdminClient();

  if (!supabase || !code.trim()) {
    return null;
  }

  const { data, error } = await supabase
    .from("private_unlocks")
    .select("id, deal_id, share_code, threshold, discount_percent, coupon_code, current_count, expires_at, created_at")
    .eq("share_code", code.trim())
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapPrivateUnlock(data) : null;
}

export async function getPrivateUnlockDealConfigByDealId(dealId: string): Promise<PrivateUnlockDealConfig | null> {
  const supabase = createAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("private_unlock_deal_configs")
    .select("id, deal_id, enabled, headline, brand_name, brand_logo, card_image, banner_image, category, short_description, threshold, discount_percent, token_amount, coupon_prefix, sort_order, featured, source, voucher_url, scraped_discount_percent, voucher_value, flat_discount_amount, final_payable_after_unlock, coupon_stock_total, coupon_stock_claimed, created_at, deals!inner(status)")
    .eq("deal_id", dealId)
    .eq("enabled", true)
    .eq("deals.status", "live")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) return null;

  const deal = await getGroupDealById(String(data.deal_id));
  const platformInventory = await getPlatformCouponInventory();

  if (!deal) {
    return null;
  }

  const config = mapPrivateUnlockDealConfig(data, deal);
  return {
    ...config,
    isOutOfStock: platformInventory.outOfStock || config.couponStockClaimed >= config.couponStockTotal,
  };
}

export async function listPrivateUnlockDealConfigs(): Promise<PrivateUnlockDealConfig[]> {
  const supabase = createAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("private_unlock_deal_configs")
    .select("id, deal_id, enabled, headline, brand_name, brand_logo, card_image, banner_image, category, short_description, threshold, discount_percent, token_amount, coupon_prefix, sort_order, featured, source, voucher_url, scraped_discount_percent, voucher_value, flat_discount_amount, final_payable_after_unlock, coupon_stock_total, coupon_stock_claimed, created_at, deals!inner(status)")
    .eq("enabled", true)
    .eq("deals.status", "live")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const platformInventory = await getPlatformCouponInventory();
  const configs = await Promise.all(
    (data ?? []).map(async (row) => {
      const deal = await getGroupDealById(String(row.deal_id));
      if (!deal) {
        return null;
      }

      const config = mapPrivateUnlockDealConfig(row, deal);
      return {
        ...config,
        isOutOfStock: platformInventory.outOfStock || config.couponStockClaimed >= config.couponStockTotal,
      };
    })
  );

  return configs.filter(Boolean) as PrivateUnlockDealConfig[];
}

export async function upsertProfileFromBuyer(input: { name: string; phone: string; email: string; phoneVerified?: boolean }): Promise<AccountProfile | null> {
  const supabase = createAdminClient();

  if (!supabase) {
    return null;
  }

  const normalizedPhone = normalizePhone(input.phone);
  const { data: existingByPhone, error: phoneError } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, phone_verified, created_at")
    .in("phone", phoneLookupVariants(input.phone))
    .limit(1)
    .maybeSingle();

  if (phoneError) {
    throw phoneError;
  }

  if (existingByPhone) {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: input.name.trim() || existingByPhone.full_name,
        email: input.email.trim() || existingByPhone.email,
        phone: normalizedPhone,
        ...(input.phoneVerified ? { phone_verified: true, last_login_at: new Date().toISOString() } : {}),
      })
      .eq("id", existingByPhone.id)
      .select("id, full_name, email, phone, phone_verified, created_at")
      .single();

    if (error) {
      throw error;
    }

    return mapAccountProfile(data);
  }

  const { data: existingByEmail, error: emailLookupError } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, phone_verified, created_at")
    .eq("email", input.email.trim())
    .limit(1)
    .maybeSingle();

  if (emailLookupError) {
    throw emailLookupError;
  }

  if (existingByEmail) {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: input.name.trim() || existingByEmail.full_name,
        phone: normalizedPhone,
        ...(input.phoneVerified ? { phone_verified: true, last_login_at: new Date().toISOString() } : {}),
      })
      .eq("id", existingByEmail.id)
      .select("id, full_name, email, phone, phone_verified, created_at")
      .single();

    if (error) {
      throw error;
    }

    return mapAccountProfile(data);
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      full_name: input.name.trim() || "GruPin user",
      email: input.email.trim(),
      phone: normalizedPhone,
      phone_verified: Boolean(input.phoneVerified),
      ...(input.phoneVerified ? { last_login_at: new Date().toISOString() } : {}),
    })
    .select("id, full_name, email, phone, phone_verified, created_at")
    .single();

  if (error) {
    throw error;
  }

  return mapAccountProfile(data);
}

export async function getProfileByPhone(phone: string): Promise<AccountProfile | null> {
  const supabase = createAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, phone_verified, created_at")
    .in("phone", phoneLookupVariants(phone))
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapAccountProfile(data) : null;
}

export async function updateAccountProfile(profileId: string, input: { name: string; phone: string; email: string; phoneVerified?: boolean }): Promise<AccountProfile> {
  const supabase = createAdminClient();

  if (!supabase) {
    throw new Error("Supabase is required to update profile.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: input.name.trim(),
      email: input.email.trim(),
      phone: normalizePhone(input.phone),
      ...(input.phoneVerified ? { phone_verified: true } : { phone_verified: false }),
    })
    .eq("id", profileId)
    .select("id, full_name, email, phone, phone_verified, created_at")
    .single();

  if (error) {
    throw error;
  }

  return mapAccountProfile(data);
}

export async function getAccountProfileById(profileId: string): Promise<AccountProfile | null> {
  const supabase = createAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, phone_verified, created_at")
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapAccountProfile(data) : null;
}

export async function createUnlockedCouponsForPrivateUnlock(unlockId: string) {
  const supabase = createAdminClient();

  if (!supabase) {
    return;
  }

  const { data: unlockRow, error: unlockError } = await supabase
    .from("private_unlocks")
    .select("id, deal_id, threshold, discount_percent, current_count")
    .eq("id", unlockId)
    .maybeSingle();

  if (unlockError) {
    throw unlockError;
  }

  if (!unlockRow || Number(unlockRow.current_count) < Number(unlockRow.threshold)) {
    return;
  }

  const deal = await getGroupDealById(String(unlockRow.deal_id));
  const config = await getPrivateUnlockDealConfigByDealId(String(unlockRow.deal_id));

  if (!deal) {
    return;
  }

  const tokenAmountPaid = (config?.tokenAmount ?? 99) * 100;
  const unlockedPrice = Math.round(deal.originalPrice * (1 - Number(unlockRow.discount_percent) / 100)) * 100;
  const remainingAmount = Math.max(0, unlockedPrice - tokenAmountPaid);

  const { data: members, error: membersError } = await supabase
    .from("private_unlock_members")
    .select("id, profile_id")
    .eq("unlock_id", unlockId)
    .not("profile_id", "is", null);

  if (membersError) {
    throw membersError;
  }

  const rows = (members ?? []).map((member) => ({
    profile_id: member.profile_id,
    deal_id: unlockRow.deal_id,
    unlock_id: unlockId,
    private_unlock_member_id: member.id,
    status: "payment_pending",
    unlocked_price: unlockedPrice,
    token_amount_paid: tokenAmountPaid,
    remaining_amount: remainingAmount,
    discount_percent: Number(unlockRow.discount_percent),
    email_delivery_status: "not_requested",
  }));

  if (!rows.length) {
    return;
  }

  const { error } = await supabase
    .from("unlocked_coupons")
    .upsert(rows, { onConflict: "unlock_id,profile_id", ignoreDuplicates: true });

  if (error) {
    throw error;
  }
}

export async function listAccountUnlockedCoupons(profileId: string): Promise<AccountUnlockedCoupon[]> {
  const supabase = createAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("unlocked_coupons")
    .select("id, profile_id, deal_id, unlock_id, status, unlocked_price, token_amount_paid, remaining_amount, discount_percent, email_delivery_status, created_at, deals(title, merchant)")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => {
    const dealRow = Array.isArray(row.deals) ? row.deals[0] : row.deals;
    return {
      id: String(row.id),
      profileId: String(row.profile_id),
      dealId: String(row.deal_id),
      unlockId: String(row.unlock_id),
      status: row.status as AccountUnlockedCoupon["status"],
      unlockedPrice: Number(row.unlocked_price),
      tokenAmountPaid: Number(row.token_amount_paid),
      remainingAmount: Number(row.remaining_amount),
      discountPercent: Number(row.discount_percent),
      emailDeliveryStatus: row.email_delivery_status as AccountUnlockedCoupon["emailDeliveryStatus"],
      createdAt: String(row.created_at),
      dealTitle: dealRow && typeof dealRow === "object" ? String((dealRow as Record<string, unknown>).title ?? "") : "",
      brandName: dealRow && typeof dealRow === "object" ? String((dealRow as Record<string, unknown>).merchant ?? "") : "",
    };
  });
}

export async function listPrivateUnlockMembers(unlockId: string, limit = 10): Promise<PrivateUnlockMember[]> {
  const supabase = createAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("private_unlock_members")
    .select("id, unlock_id, deal_id, name, phone, email, razorpay_payment_id, created_at")
    .eq("unlock_id", unlockId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => publicPrivateUnlockMember(mapPrivateUnlockMember(row)));
}

export async function listReservationsByDeal(dealId: string, limit = 8): Promise<Reservation[]> {
  const supabase = createAdminClient() ?? await createClient();
  const demoReservations = () => {
    const now = Date.now();
    return [
      ["Rohit", 2],
      ["Ananya", 4],
      ["Kabir", 7],
      ["Meera", 9],
      ["Dev", 12],
    ].slice(0, limit).map(([name, minutes], index) => ({
      id: `demo-reservation-${index}`,
      dealId,
      name: String(name),
      phone: "",
      email: "",
      razorpayPaymentId: "",
      createdAt: new Date(now - Number(minutes) * 60 * 1000).toISOString(),
    }));
  };

  if (!isUuid(dealId)) {
    return dealId === "antinorm-combo" || dealId === "demo" ? demoReservations() : [];
  }

  if (!supabase) {
    return demoReservations();
  }

  const { data, error } = await supabase
    .from("reservations")
    .select("id, deal_id, name, phone, email, razorpay_payment_id, created_at")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (dealId === "antinorm-combo" || dealId === "demo") {
      return demoReservations();
    }

    throw error;
  }

  return (data ?? []).map((row) =>
    publicReservation({
      id: String(row.id),
      dealId: String(row.deal_id),
      name: String(row.name),
      phone: String(row.phone),
      email: String(row.email),
      razorpayPaymentId: String(row.razorpay_payment_id),
      createdAt: String(row.created_at),
    })
  );
}

export async function getUnlockedCouponForPhone(dealId: string, phone: string): Promise<{
  deal: GroupDeal;
  coupon: DealCoupon | null;
  reservation: Reservation | null;
}> {
  const deal = await getGroupDealById(dealId);

  if (!deal) {
    throw new Error("Deal not found");
  }

  const supabase = createAdminClient();

  if (!supabase) {
    const tier = [...deal.tiers].reverse().find((item) => deal.currentCount >= item.threshold) ?? null;
    const tierNumber = tier ? (deal.tiers.findIndex((item) => item.threshold === tier.threshold) + 1) as 1 | 2 | 3 : null;

    return {
      deal,
      reservation: {
        id: "demo-reservation",
        dealId,
        name: "Demo buyer",
        phone,
        email: "buyer@example.com",
        razorpayPaymentId: "pay_demo",
        createdAt: new Date().toISOString(),
      },
      coupon: tier && tierNumber
        ? {
            id: `demo-coupon-${tierNumber}`,
            dealId,
            tierNumber,
            threshold: tier.threshold,
            couponCode: ["ANTINORM20", "ANTINORM25", "ANTINORM30"][tierNumber - 1],
          }
        : null,
    };
  }

  const phoneVariants = phoneLookupVariants(phone);
  const { data: reservationRow, error: reservationError } = await supabase
    .from("reservations")
    .select("id, deal_id, name, phone, email, razorpay_payment_id, created_at")
    .eq("deal_id", dealId)
    .in("phone", phoneVariants)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (reservationError) {
    throw reservationError;
  }

  if (!reservationRow) {
    return { deal, coupon: null, reservation: null };
  }

  const tier = [...deal.tiers].reverse().find((item) => deal.currentCount >= item.threshold) ?? null;

  if (!tier) {
    return {
      deal,
      coupon: null,
      reservation: {
        id: String(reservationRow.id),
        dealId: String(reservationRow.deal_id),
        name: String(reservationRow.name),
        phone: String(reservationRow.phone),
        email: String(reservationRow.email),
        razorpayPaymentId: String(reservationRow.razorpay_payment_id),
        createdAt: String(reservationRow.created_at),
      },
    };
  }

  const { data: couponRow, error: couponError } = await supabase
    .from("deal_coupons")
    .select("*")
    .eq("deal_id", dealId)
    .lte("threshold", deal.currentCount)
    .order("threshold", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (couponError) {
    throw couponError;
  }

  return {
    deal,
    reservation: {
      id: String(reservationRow.id),
      dealId: String(reservationRow.deal_id),
      name: String(reservationRow.name),
      phone: String(reservationRow.phone),
      email: String(reservationRow.email),
      razorpayPaymentId: String(reservationRow.razorpay_payment_id),
      createdAt: String(reservationRow.created_at),
    },
    coupon: couponRow
      ? {
          id: String(couponRow.id),
          dealId: String(couponRow.deal_id),
          tierNumber: Number(couponRow.tier_number) as 1 | 2 | 3,
          threshold: Number(couponRow.threshold),
          couponCode: String(couponRow.coupon_code),
          createdAt: String(couponRow.created_at),
        }
      : null,
  };
}

export async function listBrandsAdmin(): Promise<Brand[]> {
  const supabase = createAdminClient();

  if (!supabase) {
    return [{ id: "brand-demo-antinorm", name: "Antinorm", slug: "antinorm", websiteUrl: "https://antinorm.com" }];
  }

  const { data, error } = await supabase.from("brands").select("*").order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapBrand);
}

export async function getBrandByIdAdmin(id: string): Promise<Brand | null> {
  const supabase = createAdminClient();

  if (!supabase) {
    return id === "brand-demo-antinorm"
      ? { id, name: "Antinorm", slug: "antinorm", websiteUrl: "https://antinorm.com" }
      : null;
  }

  const { data, error } = await supabase.from("brands").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapBrand(data) : null;
}

export async function listBrandUsersAdmin(brandId: string): Promise<BrandUser[]> {
  const supabase = createAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("brand_users")
    .select("*")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    brandId: String(row.brand_id),
    userId: (row.user_id as string | null | undefined) ?? null,
    email: String(row.email),
    role: row.role as BrandUser["role"],
    createdAt: String(row.created_at),
  }));
}

export async function listDashboardDealsAdmin(): Promise<DashboardDeal[]> {
  const supabase = createAdminClient();

  if (!supabase) {
    return [{ ...getDemoGroupDeal(), slug: "antinorm-combo", merchant: "Antinorm", status: "live", brand: { id: "brand-demo-antinorm", name: "Antinorm", slug: "antinorm" } }];
  }

  const { data, error } = await supabase
    .from("deals")
    .select("id, slug, title, merchant, status, original_price, tier_1_threshold, tier_1_price, tier_2_threshold, tier_2_price, tier_3_threshold, tier_3_price, current_count, expires_at, created_at, brands(id, name, slug, logo_url, website_url, created_at)")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapDashboardDeal);
}

export async function listDashboardReservationsAdmin(): Promise<DashboardReservation[]> {
  const supabase = createAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("reservations")
    .select("id, deal_id, name, phone, email, razorpay_payment_id, razorpay_order_id, razorpay_signature, amount_paid, payment_status, final_purchase_status, created_at, deals(title, brands(name))")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapDashboardReservation);
}

export async function listReservationsForDealAdmin(dealId: string): Promise<DashboardReservation[]> {
  const supabase = createAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("reservations")
    .select("id, deal_id, name, phone, email, razorpay_payment_id, razorpay_order_id, razorpay_signature, amount_paid, payment_status, final_purchase_status, created_at, deals(title, brands(name))")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapDashboardReservation);
}

function mapAdminPrivateUnlockDeal(
  row: Record<string, unknown>,
  counts: Map<string, { roomsCount: number; membersCount: number; tokenRevenue: number; couponClaimsCount: number; finalRevenue: number }>,
): AdminPrivateUnlockDeal | null {
  const dealRow = relationOne(row.deals);

  if (!dealRow) {
    return null;
  }

  const brandRow = relationOne(dealRow.brands);
  const deal = mapGroupDeal(dealRow);
  const config = mapPrivateUnlockDealConfig(row, deal);
  const stats = counts.get(config.dealId) ?? {
    roomsCount: 0,
    membersCount: 0,
    tokenRevenue: 0,
    couponClaimsCount: 0,
    finalRevenue: 0,
  };

  return {
    ...config,
    slug: String(dealRow.slug ?? ""),
    title: String(dealRow.title ?? config.headline),
    merchant: String(dealRow.merchant ?? config.brandName),
    status: (dealRow.status as DealStatus | undefined) ?? "draft",
    description: (dealRow.description as string | null | undefined) ?? null,
    brand: brandRow ? mapBrand(brandRow) : null,
    ...stats,
  };
}

async function getPrivateUnlockAdminStats(dealIds: string[]) {
  const empty = new Map<string, { roomsCount: number; membersCount: number; tokenRevenue: number; couponClaimsCount: number; finalRevenue: number }>();

  if (!dealIds.length) {
    return empty;
  }

  const supabase = createAdminClient();

  if (!supabase) {
    return empty;
  }

  for (const dealId of dealIds) {
    empty.set(dealId, { roomsCount: 0, membersCount: 0, tokenRevenue: 0, couponClaimsCount: 0, finalRevenue: 0 });
  }

  const roomQuery = supabase.from("private_unlocks").select("id, deal_id");
  const memberQuery = supabase.from("private_unlock_members").select("id, deal_id, amount_paid, payment_status");
  const claimQuery = supabase.from("coupon_claims").select("id, deal_id, amount_paid, status");
  const [rooms, members, claims] = dealIds.length === 1
    ? await Promise.all([
        roomQuery.eq("deal_id", dealIds[0]),
        memberQuery.eq("deal_id", dealIds[0]),
        claimQuery.eq("deal_id", dealIds[0]),
      ])
    : await Promise.all([roomQuery, memberQuery, claimQuery]);

  if (rooms.error) {
    throw rooms.error;
  }

  if (members.error) {
    throw members.error;
  }

  if (claims.error) {
    throw claims.error;
  }

  for (const row of rooms.data ?? []) {
    const dealId = String(row.deal_id);
    const stats = empty.get(dealId);
    if (stats) {
      stats.roomsCount += 1;
    }
  }

  for (const row of members.data ?? []) {
    const dealId = String(row.deal_id);
    const stats = empty.get(dealId);
    if (stats) {
      stats.membersCount += 1;
      if (row.payment_status === "paid") {
        stats.tokenRevenue += Number(row.amount_paid ?? 0);
      }
    }
  }

  for (const row of claims.data ?? []) {
    const dealId = String(row.deal_id);
    const stats = empty.get(dealId);
    if (stats) {
      stats.couponClaimsCount += 1;
      if (row.status === "paid") {
        stats.finalRevenue += Number(row.amount_paid ?? 0);
      }
    }
  }

  return empty;
}

export async function listPrivateUnlockDealsAdmin(): Promise<AdminPrivateUnlockDeal[]> {
  const supabase = createAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("private_unlock_deal_configs")
    .select("*, deals(id, slug, title, merchant, status, description, original_price, tier_1_threshold, tier_1_price, tier_2_threshold, tier_2_price, tier_3_threshold, tier_3_price, current_count, expires_at, created_at, brands(id, name, slug, logo_url, website_url, created_at))")
    .order("featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  const dealIds = rows.map((row) => String(row.deal_id));
  const stats = await getPrivateUnlockAdminStats(dealIds);

  return rows
    .map((row) => mapAdminPrivateUnlockDeal(row, stats))
    .filter((deal): deal is AdminPrivateUnlockDeal => Boolean(deal));
}

export async function getPrivateUnlockDealAdmin(dealId: string): Promise<AdminPrivateUnlockDeal | null> {
  const supabase = createAdminClient();

  if (!supabase) {
    return null;
  }

  let { data, error } = await supabase
    .from("private_unlock_deal_configs")
    .select("*, deals(id, slug, title, merchant, status, description, original_price, tier_1_threshold, tier_1_price, tier_2_threshold, tier_2_price, tier_3_threshold, tier_3_price, current_count, expires_at, created_at, brands(id, name, slug, logo_url, website_url, created_at))")
    .eq("deal_id", dealId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    const fallback = await supabase
      .from("private_unlock_deal_configs")
      .select("*, deals(id, slug, title, merchant, status, description, original_price, tier_1_threshold, tier_1_price, tier_2_threshold, tier_2_price, tier_3_threshold, tier_3_price, current_count, expires_at, created_at, brands(id, name, slug, logo_url, website_url, created_at))")
      .eq("id", dealId)
      .maybeSingle();

    if (fallback.error) {
      throw fallback.error;
    }

    data = fallback.data;
  }

  if (!data) {
    return null;
  }

  const stats = await getPrivateUnlockAdminStats([String(data.deal_id)]);
  return mapAdminPrivateUnlockDeal(data as Record<string, unknown>, stats);
}

export async function listPrivateUnlockMembersAdmin(dealId?: string): Promise<AdminPrivateUnlockMember[]> {
  const supabase = createAdminClient();

  if (!supabase) {
    return [];
  }

  let query = supabase
    .from("private_unlock_members")
    .select("id, unlock_id, deal_id, profile_id, name, phone, email, razorpay_payment_id, razorpay_order_id, razorpay_signature, amount_paid, payment_status, created_at, deals(title, merchant), private_unlocks!private_unlock_members_unlock_id_fkey(share_code, current_count, threshold)")
    .order("created_at", { ascending: false });

  if (dealId) {
    query = query.eq("deal_id", dealId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => {
    const dealRow = relationOne(row.deals);
    const unlockRow = relationOne(row.private_unlocks);

    return {
      id: String(row.id),
      unlockId: String(row.unlock_id),
      dealId: String(row.deal_id),
      profileId: (row.profile_id as string | null | undefined) ?? null,
      name: String(row.name),
      phone: String(row.phone),
      email: String(row.email),
      razorpayPaymentId: String(row.razorpay_payment_id ?? ""),
      razorpayOrderId: (row.razorpay_order_id as string | null | undefined) ?? null,
      razorpaySignature: (row.razorpay_signature as string | null | undefined) ?? null,
      amountPaid: Number(row.amount_paid ?? 0),
      paymentStatus: (row.payment_status as AdminPrivateUnlockMember["paymentStatus"] | undefined) ?? "paid",
      createdAt: String(row.created_at),
      dealTitle: dealRow ? String(dealRow.title ?? "") : null,
      brandName: dealRow ? String(dealRow.merchant ?? "") : null,
      shareCode: unlockRow ? String(unlockRow.share_code ?? "") : null,
      unlockCount: unlockRow ? Number(unlockRow.current_count ?? 0) : undefined,
      unlockThreshold: unlockRow ? Number(unlockRow.threshold ?? 0) : undefined,
    };
  });
}

export async function listCouponClaimsAdmin(dealId?: string): Promise<AdminCouponClaim[]> {
  const supabase = createAdminClient();

  if (!supabase) {
    return [];
  }

  let query = supabase
    .from("coupon_claims")
    .select("id, unlocked_coupon_id, profile_id, deal_id, razorpay_payment_id, razorpay_order_id, amount_paid, status, email_delivery_status, created_at, deals(title, merchant), profiles(full_name, phone, email)")
    .order("created_at", { ascending: false });

  if (dealId) {
    query = query.eq("deal_id", dealId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => {
    const dealRow = relationOne(row.deals);
    const profileRow = relationOne(row.profiles);

    return {
      id: String(row.id),
      unlockedCouponId: String(row.unlocked_coupon_id),
      profileId: String(row.profile_id),
      dealId: String(row.deal_id),
      razorpayPaymentId: String(row.razorpay_payment_id ?? ""),
      razorpayOrderId: (row.razorpay_order_id as string | null | undefined) ?? null,
      amountPaid: Number(row.amount_paid ?? 0),
      status: (row.status as AdminCouponClaim["status"] | undefined) ?? "paid",
      emailDeliveryStatus: (row.email_delivery_status as AdminCouponClaim["emailDeliveryStatus"] | undefined) ?? "pending",
      createdAt: String(row.created_at),
      dealTitle: dealRow ? String(dealRow.title ?? "") : null,
      brandName: dealRow ? String(dealRow.merchant ?? "") : null,
      buyerName: profileRow ? String(profileRow.full_name ?? "") : null,
      buyerPhone: profileRow ? String(profileRow.phone ?? "") : null,
      buyerEmail: profileRow ? String(profileRow.email ?? "") : null,
    };
  });
}

export async function listPrivateUnlockRoomsAdmin(): Promise<AdminPrivateUnlockRoom[]> {
  const supabase = createAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("private_unlocks")
    .select("id, deal_id, share_code, threshold, current_count, expires_at, created_at, deals(title, merchant)")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => {
    const dealRow = relationOne(row.deals);

    return {
      id: String(row.id),
      dealId: String(row.deal_id),
      shareCode: String(row.share_code),
      threshold: Number(row.threshold),
      currentCount: Number(row.current_count ?? 0),
      expiresAt: String(row.expires_at),
      createdAt: String(row.created_at),
      dealTitle: dealRow ? String(dealRow.title ?? "") : null,
      brandName: dealRow ? String(dealRow.merchant ?? "") : null,
    };
  });
}

export async function listAccountUnlockRooms(profileId: string): Promise<AccountUnlockRoom[]> {
  const supabase = createAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("private_unlock_members")
    .select("private_unlocks!private_unlock_members_unlock_id_fkey(id, deal_id, share_code, threshold, current_count, expires_at, created_at, deals(title, merchant))")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const rooms = ((data ?? []) as unknown as Record<string, unknown>[])
    .map((row) => relationOne(row.private_unlocks))
    .filter((row): row is Record<string, unknown> => Boolean(row))
    .map((room) => {
      const dealRow = relationOne(room.deals);
      return {
        id: String(room.id),
        dealId: String(room.deal_id),
        shareCode: String(room.share_code),
        threshold: Number(room.threshold),
        currentCount: Number(room.current_count ?? 0),
        expiresAt: String(room.expires_at),
        createdAt: String(room.created_at),
        dealTitle: dealRow ? String(dealRow.title ?? "") : "Voucher unlock",
        brandName: dealRow ? String(dealRow.merchant ?? "") : "Brand",
      };
    });

  return Array.from(new Map(rooms.map((room) => [room.id, room])).values());
}

export async function consumeCouponInventory(dealId: string) {
  const supabase = createAdminClient();

  if (!supabase) {
    return;
  }

  const { data: config, error: configLookupError } = await supabase
    .from("private_unlock_deal_configs")
    .select("coupon_stock_total, coupon_stock_claimed")
    .eq("deal_id", dealId)
    .maybeSingle();

  if (configLookupError) {
    throw configLookupError;
  }

  if (!config) {
    throw new Error("Coupon inventory was not found for this deal.");
  }

  const nextClaimed = Number(config.coupon_stock_claimed ?? 0) + 1;

  if (nextClaimed > Number(config.coupon_stock_total ?? 0)) {
    throw new Error("This deal is out of stock.");
  }

  const { error: configUpdateError } = await supabase
    .from("private_unlock_deal_configs")
    .update({ coupon_stock_claimed: nextClaimed })
    .eq("deal_id", dealId);

  if (configUpdateError) {
    throw configUpdateError;
  }

  const inventory = await getPlatformCouponInventory();
  const { error: platformUpdateError } = await supabase
    .from("platform_coupon_inventory")
    .update({
      claimed: inventory.claimed + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);

  if (platformUpdateError) {
    throw platformUpdateError;
  }
}

function filterDeals(deals: Deal[], filters: DealFilters = {}) {
  return deals.filter((deal) => {
    if (filters.category && deal.category !== filters.category) {
      return false;
    }

    if (filters.area && deal.area !== filters.area) {
      return false;
    }

    if (filters.discountBand && formatDiscountBand(deal.discountPercent) !== filters.discountBand) {
      return false;
    }

    return true;
  });
}

export const listDeals = cache(async (filters: DealFilters = {}): Promise<Deal[]> => {
  const supabase = await createClient();

  if (!supabase) {
    return filterDeals(mockDeals, filters);
  }

  let query = supabase.from("deals_with_counts").select("*").order("featured", { ascending: false }).order("created_at", {
    ascending: false,
  });

  if (filters.category) {
    query = query.eq("category", filters.category);
  }

  if (filters.area) {
    query = query.eq("area", filters.area);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return filterDeals((data ?? []).map(mapDeal), filters);
});

export const getFeaturedDeals = cache(async () => {
  const deals = await listDeals();
  return deals.filter((deal) => deal.featured).slice(0, 3);
});

export const getDealBySlug = cache(async (slug: string) => {
  const deals = await listDeals();
  return deals.find((deal) => deal.slug === slug) ?? null;
});

export const getDealById = cache(async (id: string) => {
  const deals = await listDeals();
  return deals.find((deal) => deal.id === id) ?? null;
});

export async function createDeal(input: CreateDealInput) {
  const supabase = createAdminClient();

  if (!supabase) {
    return {
      ...input,
      id: `mock-${input.slug}`,
      currentInterestCount: 0,
    };
  }

  const { data, error } = await supabase
    .from("deals")
    .insert({
      slug: input.slug,
      title: input.title,
      merchant: input.merchant,
      category: input.category,
      city: input.city,
      area: input.area,
      description: input.description,
      discount_percent: input.discountPercent,
      credit_description: input.creditDescription,
      minimum_interest_count: input.minimumInterestCount,
      status: input.status,
      close_date: input.closeDate ?? null,
      hero_image: input.heroImage,
      terms: input.terms,
      featured: Boolean(input.featured),
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapDeal(data);
}

export async function updateDeal(id: string, input: UpdateDealInput) {
  const supabase = createAdminClient();

  if (!supabase) {
    const deal = mockDeals.find((item) => item.id === id);
    if (!deal) {
      throw new Error("Deal not found");
    }

    return { ...deal, ...input };
  }

  const { data, error } = await supabase
    .from("deals")
    .update({
      ...(input.slug ? { slug: input.slug } : {}),
      ...(input.title ? { title: input.title } : {}),
      ...(input.merchant ? { merchant: input.merchant } : {}),
      ...(input.category ? { category: input.category } : {}),
      ...(input.city ? { city: input.city } : {}),
      ...(input.area ? { area: input.area } : {}),
      ...(input.description ? { description: input.description } : {}),
      ...(typeof input.discountPercent === "number" ? { discount_percent: input.discountPercent } : {}),
      ...(input.creditDescription ? { credit_description: input.creditDescription } : {}),
      ...(typeof input.minimumInterestCount === "number"
        ? { minimum_interest_count: input.minimumInterestCount }
        : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(typeof input.closeDate !== "undefined" ? { close_date: input.closeDate } : {}),
      ...(input.heroImage ? { hero_image: input.heroImage } : {}),
      ...(input.terms ? { terms: input.terms } : {}),
      ...(typeof input.featured !== "undefined" ? { featured: input.featured } : {}),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapDeal(data);
}

export async function listInterestsByDeal(dealId: string): Promise<DealInterest[]> {
  const supabase = createAdminClient();

  if (!supabase) {
    return mockInterests.filter((interest) => interest.dealId === dealId);
  }

  const { data, error } = await supabase
    .from("deal_interests")
    .select("id, deal_id, user_id, status, created_at, profiles!inner(*)")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => {
    const profileRow = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: String(row.id),
      dealId: String(row.deal_id),
      userId: String(row.user_id),
      status: row.status as "pending_verification" | "confirmed",
      createdAt: String(row.created_at),
      profile: {
        id: String(profileRow.id),
        fullName: String(profileRow.full_name),
        email: String(profileRow.email),
        phone: String(profileRow.phone),
        whatsappOptIn: Boolean(profileRow.whatsapp_opt_in),
        area: (profileRow.area as string | null | undefined) ?? null,
        city: (profileRow.city as string | null | undefined) ?? null,
      },
    };
  });
}

export async function listUserInterests(userId: string): Promise<UserDealInterest[]> {
  const supabase = await createClient();

  if (!supabase) {
    return mockInterests
      .filter((interest) => interest.userId === userId)
      .map((interest) => {
        const deal = mockDeals.find((item) => item.id === interest.dealId);

        if (!deal) {
          throw new Error("Deal not found for mock interest");
        }

        return {
          id: interest.id,
          status: interest.status,
          createdAt: interest.createdAt,
          deal,
        };
      });
  }

  const { data, error } = await supabase
    .from("deal_interests")
    .select("id, deal_id, user_id, status, created_at, deals_with_counts(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    status: row.status as "pending_verification" | "confirmed",
    createdAt: String(row.created_at),
    deal: mapDeal(Array.isArray(row.deals_with_counts) ? row.deals_with_counts[0] : row.deals_with_counts),
  }));
}

export async function listNotificationEvents(): Promise<NotificationEvent[]> {
  const supabase = createAdminClient();

  if (!supabase) {
    return mockNotificationEvents;
  }

  const { data, error } = await supabase.from("notification_events").select("*").order("created_at", {
    ascending: false,
  });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    type: row.type as NotificationEvent["type"],
    dealId: String(row.deal_id),
    userId: (row.user_id as string | null | undefined) ?? null,
    channel: row.channel as NotificationEvent["channel"],
    status: row.status as NotificationEvent["status"],
    createdAt: String(row.created_at),
  }));
}

export async function joinDeal(input: JoinDealInput) {
  const supabase = createAdminClient() ?? await createClient();

  if (!supabase) {
    const profile: Profile = {
      id: "mock-profile-new",
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      whatsappOptIn: input.whatsappOptIn,
      area: input.area,
      city: input.city,
    };
    const deal = mockDeals.find((item) => item.id === input.dealId);

    if (!deal) {
      throw new Error("Deal not found");
    }

    if (deal.status !== "live") {
      throw new Error("Only live deals accept new interest");
    }

    return {
      profile,
      deal: {
        ...deal,
        currentInterestCount: deal.currentInterestCount + 1,
        status:
          deal.currentInterestCount + 1 >= deal.minimumInterestCount ? ("threshold_met" as DealStatus) : deal.status,
      },
      interestStatus: "confirmed" as const,
      justUnlocked: deal.currentInterestCount < deal.minimumInterestCount &&
        deal.currentInterestCount + 1 >= deal.minimumInterestCount,
    };
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", input.email)
    .maybeSingle();

  let profileRecord = existingProfile;

  if (!profileRecord) {
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        full_name: input.fullName,
        email: input.email,
        phone: input.phone,
        area: input.area ?? null,
        city: input.city ?? null,
        whatsapp_opt_in: input.whatsappOptIn,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    profileRecord = data;
  }

  if (!profileRecord) {
    throw new Error("Could not create your profile. Please try again.");
  }

  const { data: dealRow, error: dealError } = await supabase
    .from("deals_with_counts")
    .select("*")
    .eq("id", input.dealId)
    .single();

  if (dealError) {
    throw dealError;
  }

  const deal = mapDeal(dealRow);

  if (deal.status !== "live") {
    throw new Error("Only live deals accept new interest");
  }

  const { data: existingInterest } = await supabase
    .from("deal_interests")
    .select("id")
    .eq("deal_id", input.dealId)
    .eq("user_id", profileRecord.id)
    .maybeSingle();

  if (existingInterest) {
    throw new Error("You have already joined this deal");
  }

  const { error: interestError } = await supabase.from("deal_interests").insert({
    deal_id: input.dealId,
    user_id: profileRecord.id,
    status: "confirmed",
  });

  if (interestError) {
    throw interestError;
  }

  const updatedCount = deal.currentInterestCount + 1;
  const nextStatus =
    updatedCount >= deal.minimumInterestCount ? ("threshold_met" as DealStatus) : deal.status;

  const justUnlocked = deal.currentInterestCount < deal.minimumInterestCount && updatedCount >= deal.minimumInterestCount;

  if (justUnlocked) {
    const { error: updateError } = await supabase
      .from("deals")
      .update({ status: "threshold_met" })
      .eq("id", input.dealId)
      .eq("status", "live");

    if (updateError) {
      throw updateError;
    }
  }

  return {
    profile: {
      id: String(profileRecord.id),
      fullName: String(profileRecord.full_name),
      email: String(profileRecord.email),
      phone: String(profileRecord.phone),
      whatsappOptIn: Boolean(profileRecord.whatsapp_opt_in),
      area: (profileRecord.area as string | null | undefined) ?? null,
      city: (profileRecord.city as string | null | undefined) ?? null,
    },
    deal: {
      ...deal,
      currentInterestCount: updatedCount,
      status: nextStatus,
    },
    interestStatus: "confirmed" as const,
    justUnlocked,
  };
}

export function getAvailableCategories(deals: Deal[]) {
  return Array.from(new Set(deals.map((deal) => deal.category))).sort();
}

export function getAvailableAreas(deals: Deal[]) {
  return Array.from(new Set(deals.map((deal) => deal.area))).sort();
}

export async function getProfileById(userId: string): Promise<Profile | null> {
  const supabase = await createClient();

  if (!supabase) {
    return mockProfiles.find((profile) => profile.id === userId) ?? null;
  }

  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: String(data.id),
    fullName: String(data.full_name),
    email: String(data.email),
    phone: String(data.phone),
    whatsappOptIn: Boolean(data.whatsapp_opt_in),
    area: (data.area as string | null | undefined) ?? null,
    city: (data.city as string | null | undefined) ?? null,
  };
}

export async function listDealsAdmin(): Promise<Deal[]> {
  const supabase = createAdminClient();

  if (!supabase) {
    return mockDeals;
  }

  const { data, error } = await supabase
    .from("deals_with_counts")
    .select("*")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapDeal);
}

export async function getDealByIdAdmin(id: string): Promise<Deal | null> {
  const supabase = createAdminClient();

  if (!supabase) {
    return mockDeals.find((deal) => deal.id === id) ?? null;
  }

  const { data, error } = await supabase.from("deals_with_counts").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapDeal(data) : null;
}

export async function getBrandMembershipsForEmail(email: string): Promise<Array<BrandUser & { brand: Brand }>> {
  const supabase = createAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("brand_users")
    .select("*, brands(id, name, slug, logo_url, website_url, created_at)")
    .eq("email", email.toLowerCase())
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => {
    const brandRow = Array.isArray(row.brands) ? row.brands[0] : row.brands;

    return {
      id: String(row.id),
      brandId: String(row.brand_id),
      userId: (row.user_id as string | null | undefined) ?? null,
      email: String(row.email),
      role: row.role as BrandUser["role"],
      createdAt: String(row.created_at),
      brand: mapBrand(brandRow),
    };
  });
}

export async function listPartnerDeals(brandId: string): Promise<DashboardDeal[]> {
  const supabase = createAdminClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("deals")
    .select("id, slug, title, merchant, status, original_price, tier_1_threshold, tier_1_price, tier_2_threshold, tier_2_price, tier_3_threshold, tier_3_price, current_count, expires_at, created_at, brands(id, name, slug, logo_url, website_url, created_at)")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapDashboardDeal);
}

export async function getPartnerDeal(brandId: string, dealId: string): Promise<DashboardDeal | null> {
  const supabase = createAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("deals")
    .select("id, slug, title, merchant, status, original_price, tier_1_threshold, tier_1_price, tier_2_threshold, tier_2_price, tier_3_threshold, tier_3_price, current_count, expires_at, created_at, brands(id, name, slug, logo_url, website_url, created_at)")
    .eq("brand_id", brandId)
    .eq("id", dealId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapDashboardDeal(data) : null;
}

export async function listPartnerReservations(brandId: string, dealId?: string): Promise<DashboardReservation[]> {
  const supabase = createAdminClient();

  if (!supabase) {
    return [];
  }

  let query = supabase
    .from("reservations")
    .select("id, deal_id, name, phone, email, razorpay_payment_id, razorpay_order_id, razorpay_signature, amount_paid, payment_status, final_purchase_status, created_at, deals!inner(title, brand_id, brands(name))")
    .eq("deals.brand_id", brandId)
    .order("created_at", { ascending: false });

  if (dealId) {
    query = query.eq("deal_id", dealId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapDashboardReservation);
}
