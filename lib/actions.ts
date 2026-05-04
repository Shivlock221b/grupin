"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { isAllowedAdminEmail, requireAdmin } from "@/lib/auth";
import { createDeal, getBrandMembershipsForEmail, getDealById, getDealByIdAdmin, joinDeal, listInterestsByDeal, updateDeal } from "@/lib/data";
import { createClient as createServerSupabaseClient } from "@/supabase/server";
import { queueNotifications } from "@/lib/notifications";
import { uploadDealHeroImage } from "@/lib/storage";
import { slugify } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase-admin";

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

const dealSchema = z.object({
  title: z.string().min(3),
  merchant: z.string().min(2),
  category: z.string().min(2),
  city: z.string().min(2),
  area: z.string().min(2),
  description: z.string().min(20),
  discountPercent: z.coerce.number().min(1).max(90),
  creditDescription: z.string().min(8),
  minimumInterestCount: z.coerce.number().min(2),
  status: z.enum(["draft", "live", "threshold_met", "closed", "archived"]),
  closeDate: z.string().optional(),
  heroImage: z.string().optional(),
  terms: z.string().min(5),
  featured: z
    .string()
    .optional()
    .transform((value) => value === "on"),
});

export type ActionState = {
  success: boolean;
  message: string;
};

const adminLoginSchema = z.object({
  email: z.string().email(),
});

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
      message: "Enter a valid admin email address.",
    };
  }

  const email = parsed.data.email.toLowerCase();
  const brandMemberships = await getBrandMembershipsForEmail(email);

  if (!isAllowedAdminEmail(email) && brandMemberships.length === 0) {
    return {
      success: false,
      message: "This email is not allowed to access a dashboard.",
    };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!url || !anonKey || !appUrl) {
    return {
      success: false,
      message: "Supabase auth is not configured yet.",
    };
  }

  try {
    const supabase = createSupabaseClient(url, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback?next=${isAllowedAdminEmail(email) ? "/admin/dashboard" : "/partner"}`,
        shouldCreateUser: false,
      },
    });

    if (error) {
      throw error;
    }

    return {
      success: true,
      message: "Magic link sent. Open it on this browser to enter the admin dashboard.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not send the admin login link.",
    };
  }
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

    revalidatePath("/");
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

async function normalizeDealPayload(
  data: z.infer<typeof dealSchema>,
  formData: FormData,
  existingHeroImage?: string,
) {
  const heroImageFile = formData.get("heroImageFile");
  const slug = slugify(data.title);
  let heroImage = data.heroImage?.trim() || existingHeroImage || "";

  if (heroImageFile instanceof File && heroImageFile.size > 0) {
    heroImage = await uploadDealHeroImage(heroImageFile, slug);
  }

  if (!heroImage) {
    throw new Error("Add a hero image URL or upload an image.");
  }

  return {
    title: data.title,
    slug,
    merchant: data.merchant,
    category: data.category,
    city: data.city,
    area: data.area,
    description: data.description,
    discountPercent: data.discountPercent,
    creditDescription: data.creditDescription,
    minimumInterestCount: data.minimumInterestCount,
    status: data.status,
    closeDate: data.closeDate || null,
    heroImage,
    terms: data.terms
      .split("\n")
      .map((term) => term.trim())
      .filter(Boolean),
    featured: data.featured,
  };
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
    const deal = await createDeal(await normalizeDealPayload(parsed.data, formData));
    revalidatePath("/");
    revalidatePath("/deals");
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
    const existingDeal = await getDealByIdAdmin(dealId);
    const updated = await updateDeal(
      dealId,
      await normalizeDealPayload(parsed.data, formData, existingDeal?.heroImage),
    );
    const interests = await listInterestsByDeal(dealId);

    if (
      updated.status === "threshold_met" &&
      interests.length >= updated.minimumInterestCount
    ) {
      await Promise.all(
        interests.map((interest) =>
          queueNotifications({
            dealId: updated.id,
            userId: interest.userId,
            recipient: interest.profile.email,
            message: `${updated.title} has reached its group target. We will share the deal details with you shortly.`,
          }),
        ),
      );
    }

    revalidatePath("/");
    revalidatePath("/deals");
    revalidatePath(`/deals/${updated.slug}`);
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
  const supabase = await createServerSupabaseClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  redirect("/admin/login");
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
