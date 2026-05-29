import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccountProfile } from "@/lib/account-auth";
import { getCachedBrandProductBySlugs, getProductTeamUnlockByCode, listProductTeamCartItems, listProductTeamUnlockMembers } from "@/lib/data";
import { normalizePhone, phoneLookupVariants } from "@/lib/otp";
import { effectiveTeamDiscountPercent } from "@/lib/product-pricing";
import { createAdminClient } from "@/lib/supabase-admin";
import { adminPhoneLabel, escapeTelegramHtml, sendTelegramMessage } from "@/lib/telegram";
import { ProductTeamUnlock, ProductVariant } from "@/lib/types";

function createShareCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function publicUnlock(row: Record<string, unknown>): ProductTeamUnlock {
  return {
    id: String(row.id),
    productId: (row.product_id as string | null | undefined) ?? null,
    brandId: String(row.brand_id),
    ownerProfileId: (row.owner_profile_id as string | null | undefined) ?? null,
    shareCode: String(row.share_code),
    threshold: Number(row.threshold ?? 3),
    discountPercent: Number(row.discount_percent ?? 25),
    selectedVariant: row.selected_variant && typeof row.selected_variant === "object" ? row.selected_variant as ProductVariant : null,
    currentCount: Number(row.current_count ?? 0),
    memberCount: Number(row.member_count ?? row.current_count ?? 0),
    roomScope: (row.room_scope as ProductTeamUnlock["roomScope"] | null | undefined) ?? "product",
    status: row.status as ProductTeamUnlock["status"],
    expiresAt: String(row.expires_at),
    closedAt: (row.closed_at as string | null | undefined) ?? null,
    createdAt: row.created_at ? String(row.created_at) : undefined,
  };
}

async function refreshCount(unlockId: string) {
  const supabase = createAdminClient();

  if (!supabase) {
    return null;
  }

  const { count, error } = await supabase
    .from("product_team_unlock_members")
    .select("id", { count: "exact", head: true })
    .eq("unlock_id", unlockId);

  if (error) {
    throw error;
  }

  const { data: unlock } = await supabase
    .from("product_team_unlocks")
    .select("threshold, expires_at")
    .eq("id", unlockId)
    .maybeSingle();

  const currentCount = count ?? 0;
  const expired = unlock?.expires_at ? new Date(String(unlock.expires_at)).getTime() <= Date.now() : false;
  const status = currentCount >= Number(unlock?.threshold ?? 3) ? "unlocked" : expired ? "expired" : "active";

  const { data, error: updateError } = await supabase
    .from("product_team_unlocks")
    .update({ current_count: currentCount, status, updated_at: new Date().toISOString() })
    .eq("id", unlockId)
    .select("id, product_id, brand_id, owner_profile_id, share_code, threshold, discount_percent, selected_variant, current_count, status, expires_at, created_at")
    .single();

  if (updateError) {
    throw updateError;
  }

  return data ? publicUnlock(data) : null;
}

async function findExistingLiveRoomForProfile(productId: string, profileId: string, phone: string) {
  const supabase = createAdminClient();

  if (!supabase) {
    return null;
  }

  const phoneVariants = phoneLookupVariants(phone);
  const { data: memberships, error } = await supabase
    .from("product_team_unlock_members")
    .select("product_team_unlocks!inner(id, product_id, brand_id, owner_profile_id, share_code, threshold, discount_percent, selected_variant, current_count, status, expires_at, created_at)")
    .eq("product_team_unlocks.product_id", productId)
    .or(`profile_id.eq.${profileId},phone.in.(${phoneVariants.map((item) => `"${item}"`).join(",")})`)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const now = Date.now();
  const rooms = ((memberships ?? []) as unknown as Record<string, unknown>[])
    .map((membership) => {
      const room = membership.product_team_unlocks;
      return Array.isArray(room) ? room[0] : room;
    })
    .filter((room): room is Record<string, unknown> => Boolean(room))
    .map(publicUnlock)
    .filter((room) => room.status === "active" && new Date(room.expiresAt).getTime() > now && room.currentCount < room.threshold);

  return rooms[0] ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");

    if (!code) {
      return NextResponse.json({ message: "Room code is required." }, { status: 400 });
    }

    const unlock = await getProductTeamUnlockByCode(code);

    if (!unlock) {
      return NextResponse.json({ message: "Room not found." }, { status: 404 });
    }

    const [members, profile] = await Promise.all([
      listProductTeamUnlockMembers(unlock.id),
      getCurrentAccountProfile(),
    ]);
    const cartItems = await listProductTeamCartItems(unlock.id);
    const joined = profile
      ? members.some((member) => member.profileId === profile.id || phoneLookupVariants(profile.phone).includes(member.phone))
      : false;

    return NextResponse.json({ unlock, members, cartItems, joined });
  } catch (error) {
    console.error("Product team unlock fetch error:", error);
    return NextResponse.json({ message: "Could not load room." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getCurrentAccountProfile();
    const supabase = createAdminClient();

    if (!profile || !supabase) {
      return NextResponse.json({ message: "Verify your phone first." }, { status: 401 });
    }

    const { brandSlug, productSlug, code } = await request.json();

    if (typeof brandSlug !== "string" || typeof productSlug !== "string") {
      return NextResponse.json({ message: "Product is required." }, { status: 400 });
    }

    const product = await getCachedBrandProductBySlugs(brandSlug, productSlug);

    if (!product || !product.brand) {
      return NextResponse.json({ message: "Product not found." }, { status: 404 });
    }

    let unlock = typeof code === "string" && code.trim() ? await getProductTeamUnlockByCode(code) : null;
    let createdRoom = false;
    let joinedRoom = false;

    if (unlock && unlock.productId !== product.id) {
      return NextResponse.json({ message: "This room belongs to another product." }, { status: 409 });
    }

    if (unlock && new Date(unlock.expiresAt).getTime() <= Date.now() && unlock.status !== "unlocked") {
      return NextResponse.json({ message: "This room has expired." }, { status: 410 });
    }

    if (!unlock) {
      unlock = await findExistingLiveRoomForProfile(product.id, profile.id, profile.phone);
    }

    if (!unlock) {
      const shareCode = createShareCode();
      const { data, error } = await supabase
        .from("product_team_unlocks")
        .insert({
          product_id: product.id,
          brand_id: product.brandId,
          owner_profile_id: profile.id,
          share_code: shareCode,
          threshold: 3,
          discount_percent: effectiveTeamDiscountPercent(product),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .select("id, product_id, brand_id, owner_profile_id, share_code, threshold, discount_percent, selected_variant, current_count, status, expires_at, created_at")
        .single();

      if (error) {
        throw error;
      }

      unlock = publicUnlock(data);
      createdRoom = true;
    }

    const { data: existing, error: existingError } = await supabase
      .from("product_team_unlock_members")
      .select("id")
      .eq("unlock_id", unlock.id)
      .in("phone", phoneLookupVariants(profile.phone))
      .limit(1)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (!existing) {
      const { count, error: countError } = await supabase
        .from("product_team_unlock_members")
        .select("id", { count: "exact", head: true })
        .eq("unlock_id", unlock.id);

      if (countError) {
        throw countError;
      }

      if ((count ?? unlock.currentCount) >= unlock.threshold || unlock.status === "unlocked" || unlock.status === "completed") {
        await refreshCount(unlock.id);
        return NextResponse.json({ message: "This room is already full. Please start a new room for this product." }, { status: 409 });
      }

      const { error: memberError } = await supabase
        .from("product_team_unlock_members")
        .insert({
          unlock_id: unlock.id,
          product_id: product.id,
          brand_id: product.brandId,
          profile_id: profile.id,
          phone: normalizePhone(profile.phone),
          role: unlock.ownerProfileId === profile.id ? "owner" : "member",
        });

      if (memberError) {
        throw memberError;
      }

      joinedRoom = true;
    }

    const refreshedUnlock = await refreshCount(unlock.id);
    const members = await listProductTeamUnlockMembers(unlock.id);
    const finalUnlock = refreshedUnlock ?? unlock;

    if (createdRoom || joinedRoom) {
      void sendTelegramMessage({
        text: [
          `<b>${createdRoom ? "Product team room started" : "Product team room joined"}</b>`,
          `Room: <b>${escapeTelegramHtml(finalUnlock.shareCode)}</b>`,
          `Phone: ${escapeTelegramHtml(adminPhoneLabel(profile.phone))}`,
          `Brand: ${escapeTelegramHtml(product.brand.name)}`,
          `Product: ${escapeTelegramHtml(product.title)}`,
          `Progress: ${finalUnlock.currentCount}/${finalUnlock.threshold}`,
          `Status: ${escapeTelegramHtml(finalUnlock.status)}`,
        ].join("\n"),
      });
    }

    return NextResponse.json({ unlock: finalUnlock, members, joined: true });
  } catch (error) {
    console.error("Product team unlock mutation error:", error);
    return NextResponse.json({ message: "Could not update product room." }, { status: 500 });
  }
}
