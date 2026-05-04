import { cache } from "react";
import { createClient } from "@/supabase/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { phoneLookupVariants } from "@/lib/otp";
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
  NotificationEvent,
  Profile,
  GroupDeal,
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
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
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
    id: "antinorm-combo",
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

  if (!supabase) {
    return id === demo.id || id === "demo" || id === "antinorm-combo" ? demo : null;
  }

  const { data, error } = await supabase
    .from("deals")
    .select("id, title, original_price, tier_1_threshold, tier_1_price, tier_2_threshold, tier_2_price, tier_3_threshold, tier_3_price, current_count, expires_at, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (id === demo.id || id === "demo" || id === "antinorm-combo") {
      return demo;
    }

    throw error;
  }

  return data ? mapGroupDeal(data) : null;
});

export async function listReservationsByDeal(dealId: string, limit = 8): Promise<Reservation[]> {
  const supabase = createAdminClient() ?? await createClient();
  const demoReservations = () => {
    const now = Date.now();
    return [
      ["Rohit", "Delhi", 2],
      ["Ananya", "Mumbai", 4],
      ["Kabir", "Bengaluru", 7],
      ["Meera", "Pune", 9],
      ["Dev", "Delhi", 12],
    ].slice(0, limit).map(([name, city, minutes], index) => ({
      id: `demo-reservation-${index}`,
      dealId,
      name: `${name} from ${city}`,
      phone: "",
      email: "",
      razorpayPaymentId: `demo_${index}`,
      createdAt: new Date(now - Number(minutes) * 60 * 1000).toISOString(),
    }));
  };

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

  return (data ?? []).map((row) => ({
    id: String(row.id),
    dealId: String(row.deal_id),
    name: String(row.name),
    phone: String(row.phone),
    email: String(row.email),
    razorpayPaymentId: String(row.razorpay_payment_id),
    createdAt: String(row.created_at),
  }));
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
