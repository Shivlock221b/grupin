import { cache } from "react";
import { createClient } from "@/supabase/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { mockDeals, mockInterests, mockNotificationEvents, mockProfiles } from "@/lib/mock-data";
import {
  Deal,
  DealFilters,
  DealInterest,
  DealStatus,
  NotificationEvent,
  Profile,
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
