import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccountProfile } from "@/lib/account-auth";
import {
  getCachedBrandProductBySlugs,
  getProductTeamUnlockByCode,
  listProductTeamCartItems,
  listProductTeamUnlockMembers,
  syncProductTeamUnlockOrderStatus,
} from "@/lib/data";
import { normalizePhone, phoneLookupVariants } from "@/lib/otp";
import { effectiveTeamDiscountPercent, productDisplayPrice, teamPrice } from "@/lib/product-pricing";
import { createAdminClient } from "@/lib/supabase-admin";
import { adminPhoneLabel, escapeTelegramHtml, sendTelegramMessage } from "@/lib/telegram";
import { BrandProduct, ProductTeamUnlock, ProductVariant } from "@/lib/types";

const UNLOCK_COLUMNS = "id, product_id, brand_id, owner_profile_id, share_code, threshold, discount_percent, selected_variant, current_count, member_count, room_scope, status, expires_at, closed_at, created_at";
const MEMBER_COLUMNS = "id, unlock_id, product_id, brand_id, profile_id, selected_variant, phone, role, cart_status, room_scope, cart_checked_out_at, created_at";

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
    roomScope: (row.room_scope as ProductTeamUnlock["roomScope"] | null | undefined) ?? "brand",
    status: row.status as ProductTeamUnlock["status"],
    expiresAt: String(row.expires_at),
    closedAt: (row.closed_at as string | null | undefined) ?? null,
    createdAt: row.created_at ? String(row.created_at) : undefined,
  };
}

function variantKey(variant: ProductVariant | null) {
  return String(variant?.child_id ?? variant?.sku ?? variant?.title ?? "default");
}

function variantLabel(variant: ProductVariant | null) {
  return String(variant?.variant_name ?? variant?.pack_size ?? variant?.title ?? variant?.sku ?? "Default");
}

function currentMemberIdFromMembers(members: Awaited<ReturnType<typeof listProductTeamUnlockMembers>>, profileId: string, phone: string) {
  const phoneVariants = phoneLookupVariants(phone);
  return members.find((member) => member.profileId === profileId || phoneVariants.includes(member.phone))?.id ?? null;
}

function roomDeadlinePassed(unlock: ProductTeamUnlock) {
  return new Date(unlock.expiresAt).getTime() <= Date.now();
}

async function retireStaleBrandMembershipsForPhone(brandId: string, profileId: string, phone: string) {
  const supabase = createAdminClient();

  if (!supabase) {
    return;
  }

  const phoneVariants = phoneLookupVariants(phone);
  const { data, error } = await supabase
    .from("product_team_unlock_members")
    .select(`id, product_team_unlocks!inner(${UNLOCK_COLUMNS})`)
    .eq("brand_id", brandId)
    .eq("room_scope", "brand")
    .in("cart_status", ["empty", "active"])
    .or(`profile_id.eq.${profileId},phone.in.(${phoneVariants.map((item) => `"${item}"`).join(",")})`);

  if (error) {
    throw error;
  }

  const staleMemberIds = ((data ?? []) as unknown as Record<string, unknown>[])
    .filter((row) => {
      const relation = row.product_team_unlocks;
      const room = Array.isArray(relation) ? relation[0] : relation;

      if (!room || typeof room !== "object") {
        return false;
      }

      const unlock = publicUnlock(room as Record<string, unknown>);
      return ["completed", "cancelled", "expired"].includes(unlock.status) || roomDeadlinePassed(unlock);
    })
    .map((row) => String(row.id))
    .filter(Boolean);

  if (!staleMemberIds.length) {
    return;
  }

  const { error: updateError } = await supabase
    .from("product_team_unlock_members")
    .update({ cart_status: "left" })
    .in("id", staleMemberIds);

  if (updateError) {
    throw updateError;
  }
}

function selectedVariant(product: BrandProduct, selectedVariantKey: unknown) {
  if (typeof selectedVariantKey === "string" && selectedVariantKey.trim()) {
    const selected = product.variants.find((variant) => variantKey(variant) === selectedVariantKey.trim());

    if (selected) {
      return selected;
    }
  }

  return product.variants.reduce<ProductVariant | null>((highest, variant) => {
    if (variant.price === null || variant.price === undefined) return highest;
    if (!highest || highest.price === null || highest.price === undefined || variant.price > highest.price) return variant;
    return highest;
  }, null);
}

async function findActiveBrandUnlockForPhone(brandId: string, profileId: string, phone: string) {
  const supabase = createAdminClient();

  if (!supabase) {
    return null;
  }

  const phoneVariants = phoneLookupVariants(phone);
  const { data, error } = await supabase
    .from("product_team_unlock_members")
    .select(`product_team_unlocks!inner(${UNLOCK_COLUMNS})`)
    .eq("brand_id", brandId)
    .eq("room_scope", "brand")
    .or(`profile_id.eq.${profileId},phone.in.(${phoneVariants.map((item) => `"${item}"`).join(",")})`)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const now = Date.now();
  const rooms = ((data ?? []) as unknown as Record<string, unknown>[])
    .map((row) => {
      const room = row.product_team_unlocks;
      return Array.isArray(room) ? room[0] : room;
    })
    .filter((room): room is Record<string, unknown> => Boolean(room))
    .map(publicUnlock);

  for (const room of rooms) {
    const syncedRoom = await syncProductTeamUnlockOrderStatus(room.id);
    const effectiveRoom = syncedRoom ?? room;

    if (["active", "unlocked"].includes(effectiveRoom.status) && new Date(effectiveRoom.expiresAt).getTime() > now) {
      return effectiveRoom;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getCurrentAccountProfile();
    const supabase = createAdminClient();

    if (!profile || !supabase) {
      return NextResponse.json({ message: "Verify your phone first." }, { status: 401 });
    }

    const { brandSlug, productSlug, code, selectedVariantKey, quantity } = await request.json();

    if (typeof productSlug !== "string" && typeof code === "string" && code.trim()) {
      const unlock = await getProductTeamUnlockByCode(code);

      if (!unlock || unlock.roomScope !== "brand") {
        return NextResponse.json({ message: "Team Room not found." }, { status: 404 });
      }

      const syncedUnlock = await syncProductTeamUnlockOrderStatus(unlock.id);
      const effectiveUnlock = syncedUnlock ?? unlock;

      if (["completed", "cancelled", "expired"].includes(effectiveUnlock.status) || roomDeadlinePassed(effectiveUnlock)) {
        return NextResponse.json({ message: "This Team Room is closed." }, { status: 409 });
      }

      const phoneVariants = phoneLookupVariants(profile.phone);
      const { data: existingMember, error: existingMemberError } = await supabase
        .from("product_team_unlock_members")
        .select(MEMBER_COLUMNS)
        .eq("unlock_id", unlock.id)
        .in("phone", phoneVariants)
        .limit(1)
        .maybeSingle();

      if (existingMemberError) {
        throw existingMemberError;
      }

      if (!existingMember) {
        await retireStaleBrandMembershipsForPhone(effectiveUnlock.brandId, profile.id, profile.phone);

        const { error: memberError } = await supabase
          .from("product_team_unlock_members")
          .insert({
            unlock_id: unlock.id,
            product_id: null,
            brand_id: effectiveUnlock.brandId,
            profile_id: profile.id,
            phone: normalizePhone(profile.phone),
            role: effectiveUnlock.ownerProfileId === profile.id ? "owner" : "member",
            room_scope: "brand",
            cart_status: "empty",
          });

        if (memberError) {
          if (memberError.code === "23505") {
            return NextResponse.json({ message: "You already have an active Team Room for this brand." }, { status: 409 });
          }

          throw memberError;
        }
      }

      const [members, cartItems] = await Promise.all([
        listProductTeamUnlockMembers(effectiveUnlock.id),
        listProductTeamCartItems(effectiveUnlock.id),
      ]);

      void sendTelegramMessage({
        text: [
          "<b>Team Room joined</b>",
          `Team Room: <b>${escapeTelegramHtml(effectiveUnlock.shareCode)}</b>`,
          `Phone: ${escapeTelegramHtml(adminPhoneLabel(profile.phone))}`,
          `Progress: ${effectiveUnlock.currentCount}/${effectiveUnlock.threshold} carts`,
        ].join("\n"),
      });

      return NextResponse.json({
        unlock: effectiveUnlock,
        members,
        cartItems,
        joined: true,
        added: false,
        currentMemberId: currentMemberIdFromMembers(members, profile.id, profile.phone),
      });
    }

    if (typeof brandSlug !== "string" || typeof productSlug !== "string") {
      return NextResponse.json({ message: "Product is required." }, { status: 400 });
    }

    const product = await getCachedBrandProductBySlugs(brandSlug, productSlug);

    if (!product || !product.brand) {
      return NextResponse.json({ message: "Product not found." }, { status: 404 });
    }

    let unlock = typeof code === "string" && code.trim() ? await getProductTeamUnlockByCode(code) : null;

    if (unlock && (unlock.roomScope !== "brand" || unlock.brandId !== product.brandId)) {
      return NextResponse.json({ message: "This Team Room belongs to another brand." }, { status: 409 });
    }

    if (unlock && (["completed", "cancelled", "expired"].includes(unlock.status) || roomDeadlinePassed(unlock))) {
      await syncProductTeamUnlockOrderStatus(unlock.id);
      return NextResponse.json({ message: "This Team Room is closed." }, { status: 409 });
    }

    if (!unlock) {
      unlock = await findActiveBrandUnlockForPhone(product.brandId, profile.id, profile.phone);
    }

    if (!unlock) {
      await retireStaleBrandMembershipsForPhone(product.brandId, profile.id, profile.phone);
    }

    let createdCart = false;
    if (!unlock) {
      const { data, error } = await supabase
        .from("product_team_unlocks")
        .insert({
          product_id: null,
          brand_id: product.brandId,
          owner_profile_id: profile.id,
          share_code: createShareCode(),
          threshold: 3,
          discount_percent: effectiveTeamDiscountPercent(product),
          room_scope: "brand",
          current_count: 0,
          member_count: 0,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .select(UNLOCK_COLUMNS)
        .single();

      if (error) {
        throw error;
      }

      unlock = publicUnlock(data);
      createdCart = true;
    }

    const phoneVariants = phoneLookupVariants(profile.phone);
    const { data: existingMember, error: existingMemberError } = await supabase
      .from("product_team_unlock_members")
      .select(MEMBER_COLUMNS)
      .eq("unlock_id", unlock.id)
      .in("phone", phoneVariants)
      .limit(1)
      .maybeSingle();

    if (existingMemberError) {
      throw existingMemberError;
    }

    let member = existingMember as Record<string, unknown> | null;
    let joinedCart = false;
    if (!member) {
      const { data, error } = await supabase
        .from("product_team_unlock_members")
        .insert({
          unlock_id: unlock.id,
          product_id: null,
          brand_id: product.brandId,
          profile_id: profile.id,
          phone: normalizePhone(profile.phone),
          role: unlock.ownerProfileId === profile.id ? "owner" : "member",
          room_scope: "brand",
          cart_status: "empty",
        })
        .select(MEMBER_COLUMNS)
        .single();

      if (error) {
        if (error.code === "23505") {
          return NextResponse.json({ message: "You already have an active Team Room for this brand. Open that room before adding more products." }, { status: 409 });
        }

        throw error;
      }

      member = data as Record<string, unknown>;
      joinedCart = true;
    }

    const memberId = String(member.id);
    if (member.cart_status === "checked_out") {
      return NextResponse.json({ message: "You have already checked out for this Team Room, so this cart cannot be edited." }, { status: 409 });
    }

    const existingCartItems = await listProductTeamCartItems(unlock.id);
    const memberHasCart = existingCartItems.some((item) => item.memberId === memberId);

    if (!memberHasCart && unlock.currentCount >= unlock.threshold) {
      return NextResponse.json({ message: "This Team Room is already unlocked. Start your own Team Room to add products at the team price." }, { status: 409 });
    }

    const selected = selectedVariant(product, selectedVariantKey);
    const selectedKey = variantKey(selected);
    const mrp = selected?.price ?? productDisplayPrice(product) ?? product.mrp ?? product.priceMax ?? product.priceMin ?? 0;
    const discount = Math.max(unlock.discountPercent, effectiveTeamDiscountPercent(product));
    const discounted = teamPrice(mrp, discount) ?? 0;
    const safeQuantity = Math.max(1, Math.min(4, Number(quantity ?? 1) || 1));

    const { data: existingItem, error: existingItemError } = await supabase
      .from("product_team_cart_items")
      .select("id, quantity")
      .eq("member_id", memberId)
      .eq("product_id", product.id)
      .eq("variant_key", selectedKey)
      .maybeSingle();

    if (existingItemError) {
      throw existingItemError;
    }

    const nextQuantity = Math.min(4, Number(existingItem?.quantity ?? 0) + safeQuantity);
    const itemPayload = {
      unlock_id: unlock.id,
      member_id: memberId,
      product_id: product.id,
      brand_id: product.brandId,
      selected_variant: selected ?? null,
      variant_key: selectedKey,
      quantity: nextQuantity,
      mrp_snapshot: Math.round(mrp),
      team_price_snapshot: Math.round(discounted),
      discount_percent_snapshot: discount,
      product_snapshot: {
        title: product.title,
        slug: product.slug,
        brandSlug: product.brand.slug,
        imageUrl: selected?.image_url ?? product.primaryImage,
        productUrl: product.productUrl ?? product.sourceUrl,
        variantLabel: variantLabel(selected),
      },
      updated_at: new Date().toISOString(),
    };

    const { error: itemError } = existingItem
      ? await supabase.from("product_team_cart_items").update(itemPayload).eq("id", existingItem.id)
      : await supabase.from("product_team_cart_items").insert(itemPayload);

    if (itemError) {
      throw itemError;
    }

    const { error: memberUpdateError } = await supabase
      .from("product_team_unlock_members")
      .update({ cart_status: "active" })
      .eq("id", memberId);

    if (memberUpdateError) {
      throw memberUpdateError;
    }

    const refreshedUnlock = await syncProductTeamUnlockOrderStatus(unlock.id);
    const [members, cartItems] = await Promise.all([
      listProductTeamUnlockMembers(unlock.id),
      listProductTeamCartItems(unlock.id),
    ]);

    const finalUnlock = refreshedUnlock ?? unlock;

    void sendTelegramMessage({
      text: [
        `<b>${createdCart ? "Team Room started" : joinedCart ? "Team Room joined" : "Team Room updated"}</b>`,
        `Team Room: <b>${escapeTelegramHtml(finalUnlock.shareCode)}</b>`,
        `Phone: ${escapeTelegramHtml(adminPhoneLabel(profile.phone))}`,
        `Brand: ${escapeTelegramHtml(product.brand.name)}`,
        `Added: ${escapeTelegramHtml(product.title)}`,
        `Variant: ${escapeTelegramHtml(variantLabel(selected))}`,
        `Quantity: ${nextQuantity}`,
        `Progress: ${finalUnlock.currentCount}/${finalUnlock.threshold} carts`,
        `Status: ${escapeTelegramHtml(finalUnlock.status)}`,
      ].join("\n"),
    });

    return NextResponse.json({ unlock: finalUnlock, members, cartItems, joined: true, added: true, currentMemberId: memberId });
  } catch (error) {
    console.error("Product team cart mutation error:", error);
    return NextResponse.json({ message: "Could not update Team Room." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const profile = await getCurrentAccountProfile();
    const supabase = createAdminClient();
    const brandSlug = request.nextUrl.searchParams.get("brandSlug");

    if (!profile || !supabase || !brandSlug) {
      return NextResponse.json({ unlock: null, members: [], cartItems: [], joined: false });
    }

    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("id")
      .eq("slug", brandSlug)
      .maybeSingle();

    if (brandError) {
      throw brandError;
    }

    if (!brand) {
      return NextResponse.json({ unlock: null, members: [], cartItems: [], joined: false });
    }

    const unlock = await findActiveBrandUnlockForPhone(String(brand.id), profile.id, profile.phone);

    if (!unlock) {
      return NextResponse.json({ unlock: null, members: [], cartItems: [], joined: false });
    }

    const refreshedUnlock = await syncProductTeamUnlockOrderStatus(unlock.id);
    const finalUnlock = refreshedUnlock ?? unlock;

    if (!["active", "unlocked"].includes(finalUnlock.status)) {
      return NextResponse.json({ unlock: null, members: [], cartItems: [], joined: false });
    }

    const [members, cartItems] = await Promise.all([
      listProductTeamUnlockMembers(finalUnlock.id),
      listProductTeamCartItems(finalUnlock.id),
    ]);
    const joined = members.some((member) => member.profileId === profile.id || phoneLookupVariants(profile.phone).includes(member.phone));

    return NextResponse.json({
      unlock: finalUnlock,
      members,
      cartItems,
      joined,
      currentMemberId: currentMemberIdFromMembers(members, profile.id, profile.phone),
    });
  } catch (error) {
    console.error("Active Team Cart lookup error:", error);
    return NextResponse.json({ unlock: null, members: [], cartItems: [], joined: false });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const profile = await getCurrentAccountProfile();
    const supabase = createAdminClient();

    if (!profile || !supabase) {
      return NextResponse.json({ message: "Verify your phone first." }, { status: 401 });
    }

    const { code, itemId } = await request.json();

    if (typeof code !== "string" || !code.trim()) {
      return NextResponse.json({ message: "Team Room code is required." }, { status: 400 });
    }

    const unlock = await getProductTeamUnlockByCode(code);

    if (!unlock) {
      return NextResponse.json({ message: "Team Room not found." }, { status: 404 });
    }

    const syncedUnlock = await syncProductTeamUnlockOrderStatus(unlock.id);
    const effectiveUnlock = syncedUnlock ?? unlock;

    if (["completed", "cancelled", "expired"].includes(effectiveUnlock.status) || roomDeadlinePassed(effectiveUnlock)) {
      return NextResponse.json({ message: "This Team Room is closed." }, { status: 409 });
    }

    const phoneVariants = phoneLookupVariants(profile.phone);
    const { data: member, error } = await supabase
      .from("product_team_unlock_members")
      .select("id, cart_status")
      .eq("unlock_id", unlock.id)
      .in("phone", phoneVariants)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!member) {
      return NextResponse.json({ message: "You are not in this Team Room." }, { status: 404 });
    }

    if (member.cart_status === "checked_out") {
      return NextResponse.json({ message: "You cannot leave after checkout." }, { status: 409 });
    }

    const existingCartItems = await listProductTeamCartItems(effectiveUnlock.id);
    const memberItems = existingCartItems.filter((item) => item.memberId === String(member.id));
    const roomUnlocked = effectiveUnlock.status === "unlocked" || effectiveUnlock.currentCount >= effectiveUnlock.threshold;

    if (typeof itemId === "string" && itemId.trim()) {
      if (roomUnlocked && memberItems.length <= 1 && memberItems.some((item) => item.id === itemId)) {
        return NextResponse.json({ message: "This cart helped unlock the Team Price, so the final item cannot be removed." }, { status: 409 });
      }

      const { error: itemDeleteError } = await supabase
        .from("product_team_cart_items")
        .delete()
        .eq("id", itemId)
        .eq("member_id", member.id);

      if (itemDeleteError) {
        throw itemDeleteError;
      }

      const remainingItems = await listProductTeamCartItems(effectiveUnlock.id);
      const hasRemaining = remainingItems.some((item) => item.memberId === String(member.id));

      if (!hasRemaining) {
        const { error: memberStatusError } = await supabase
          .from("product_team_unlock_members")
          .update({ cart_status: "empty" })
          .eq("id", member.id);

        if (memberStatusError) {
          throw memberStatusError;
        }
      }

      const refreshedUnlock = await syncProductTeamUnlockOrderStatus(effectiveUnlock.id);
      const [members, cartItems] = await Promise.all([
        listProductTeamUnlockMembers(effectiveUnlock.id),
        listProductTeamCartItems(effectiveUnlock.id),
      ]);

      return NextResponse.json({ unlock: refreshedUnlock, members, cartItems, removed: true, currentMemberId: String(member.id) });
    }

    if (roomUnlocked && memberItems.length > 0) {
      return NextResponse.json({ message: "This cart helped unlock the Team Price, so it cannot leave the Team Room now." }, { status: 409 });
    }

    const { error: deleteItemsError } = await supabase
      .from("product_team_cart_items")
      .delete()
      .eq("member_id", member.id);

    if (deleteItemsError) {
      throw deleteItemsError;
    }

    const { error: deleteMemberError } = await supabase
      .from("product_team_unlock_members")
      .delete()
      .eq("id", member.id);

    if (deleteMemberError) {
      throw deleteMemberError;
    }

    const refreshedUnlock = await syncProductTeamUnlockOrderStatus(effectiveUnlock.id);

    void sendTelegramMessage({
      text: [
        "<b>Team Room left</b>",
        `Team Room: <b>${escapeTelegramHtml(effectiveUnlock.shareCode)}</b>`,
        `Phone: ${escapeTelegramHtml(adminPhoneLabel(profile.phone))}`,
        `Progress: ${refreshedUnlock?.currentCount ?? effectiveUnlock.currentCount}/${refreshedUnlock?.threshold ?? effectiveUnlock.threshold} carts`,
      ].join("\n"),
    });

    return NextResponse.json({ unlock: refreshedUnlock, left: true });
  } catch (error) {
    console.error("Product team cart leave error:", error);
    return NextResponse.json({ message: "Could not leave Team Room." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const profile = await getCurrentAccountProfile();
    const supabase = createAdminClient();

    if (!profile || !supabase) {
      return NextResponse.json({ message: "Verify your phone first." }, { status: 401 });
    }

    const { code, itemId, quantity } = await request.json();

    if (typeof code !== "string" || !code.trim() || typeof itemId !== "string" || !itemId.trim()) {
      return NextResponse.json({ message: "Cart item is required." }, { status: 400 });
    }

    const unlock = await getProductTeamUnlockByCode(code);

    if (!unlock || ["completed", "cancelled", "expired"].includes(unlock.status) || roomDeadlinePassed(unlock)) {
      if (unlock) {
        await syncProductTeamUnlockOrderStatus(unlock.id);
      }
      return NextResponse.json({ message: "This Team Room is closed." }, { status: 409 });
    }

    const phoneVariants = phoneLookupVariants(profile.phone);
    const { data: member, error } = await supabase
      .from("product_team_unlock_members")
      .select("id, cart_status")
      .eq("unlock_id", unlock.id)
      .in("phone", phoneVariants)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!member) {
      return NextResponse.json({ message: "You are not in this Team Room." }, { status: 404 });
    }

    if (member.cart_status === "checked_out") {
      return NextResponse.json({ message: "You cannot edit a cart after checkout." }, { status: 409 });
    }

    const nextQuantity = Math.max(1, Math.min(4, Number(quantity ?? 1) || 1));
    const { error: updateError } = await supabase
      .from("product_team_cart_items")
      .update({ quantity: nextQuantity, updated_at: new Date().toISOString() })
      .eq("id", itemId)
      .eq("member_id", member.id);

    if (updateError) {
      throw updateError;
    }

    const refreshedUnlock = await syncProductTeamUnlockOrderStatus(unlock.id);
    const [members, cartItems] = await Promise.all([
      listProductTeamUnlockMembers(unlock.id),
      listProductTeamCartItems(unlock.id),
    ]);

    return NextResponse.json({ unlock: refreshedUnlock, members, cartItems, currentMemberId: String(member.id) });
  } catch (error) {
    console.error("Product team cart update error:", error);
    return NextResponse.json({ message: "Could not update cart item." }, { status: 500 });
  }
}
