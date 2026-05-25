import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccountProfile } from "@/lib/account-auth";
import { getCachedBrandProductById, getProductTeamUnlockByCode, listProductTeamUnlockMembers, syncProductTeamUnlockOrderStatus } from "@/lib/data";
import { phoneLookupVariants } from "@/lib/otp";
import { effectiveTeamDiscountPercent, teamPrice } from "@/lib/product-pricing";
import { createAdminClient } from "@/lib/supabase-admin";
import { adminPhoneLabel, escapeTelegramHtml, sendTelegramMessage } from "@/lib/telegram";
import { ProductVariant } from "@/lib/types";

function variantKey(variant: ProductVariant) {
  return String(variant.child_id ?? variant.sku ?? variant.title);
}

function selectedCheckoutVariant(product: NonNullable<Awaited<ReturnType<typeof getCachedBrandProductById>>>, selectedVariantKey: unknown) {
  if (typeof selectedVariantKey === "string" && selectedVariantKey.trim()) {
    const selected = product.variants.find((variant) => variantKey(variant) === selectedVariantKey);

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

function formatAddressForTelegram(address: unknown) {
  if (!address || typeof address !== "object") {
    return "Not provided";
  }

  return Object.entries(address as Record<string, unknown>)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim())
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ") || "Not provided";
}

function variantLabel(variant: ProductVariant | null) {
  if (!variant) {
    return "Default product";
  }

  return String(variant.variant_name ?? variant.pack_size ?? variant.title ?? variant.sku ?? variant.child_id ?? "Selected variant");
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getCurrentAccountProfile();
    const supabase = createAdminClient();

    if (!profile || !supabase) {
      return NextResponse.json({ message: "Login required." }, { status: 401 });
    }

    const {
      code,
      selectedVariantKey,
      buyerName,
      buyerEmail,
      buyerPhone,
      deliveryAddress,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
    } = await request.json();

    if (typeof code !== "string" || !code.trim() || typeof razorpayPaymentId !== "string" || !razorpayPaymentId.trim()) {
      return NextResponse.json({ message: "Room code and payment id are required." }, { status: 400 });
    }

    if (typeof buyerName !== "string" || !buyerName.trim()) {
      return NextResponse.json({ message: "Full name is required." }, { status: 400 });
    }

    if (typeof buyerPhone !== "string" || !buyerPhone.trim()) {
      return NextResponse.json({ message: "Phone number is required." }, { status: 400 });
    }

    if (!deliveryAddress || typeof deliveryAddress !== "object") {
      return NextResponse.json({ message: "Delivery address is required." }, { status: 400 });
    }

    const unlock = await getProductTeamUnlockByCode(code);

    if (!unlock || unlock.currentCount < unlock.threshold) {
      return NextResponse.json({ message: "This room is not unlocked yet." }, { status: 409 });
    }

    const [product, members] = await Promise.all([
      getCachedBrandProductById(unlock.productId),
      listProductTeamUnlockMembers(unlock.id),
    ]);

    if (!product) {
      return NextResponse.json({ message: "Product not found." }, { status: 404 });
    }

    const isMember = members.some((member) => member.profileId === profile.id || phoneLookupVariants(profile.phone).includes(member.phone));

    if (!isMember) {
      return NextResponse.json({ message: "Join this room before checkout." }, { status: 403 });
    }

    const { data: existingOrder, error: existingOrderError } = await supabase
      .from("product_team_orders")
      .select("id")
      .eq("unlock_id", unlock.id)
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (existingOrderError) {
      throw existingOrderError;
    }

    if (existingOrder) {
      return NextResponse.json({ message: "You have already checked out for this room." }, { status: 409 });
    }

    const { count: checkoutCount, error: checkoutCountError } = await supabase
      .from("product_team_orders")
      .select("id", { count: "exact", head: true })
      .eq("unlock_id", unlock.id)
      .in("status", ["hold", "confirmed"]);

    if (checkoutCountError) {
      throw checkoutCountError;
    }

    if (checkoutCount !== null && checkoutCount >= unlock.currentCount) {
      return NextResponse.json({ message: "This room is closed. All joined users have checked out." }, { status: 409 });
    }

    const selectedVariant = selectedCheckoutVariant(product, selectedVariantKey);
    const price = selectedVariant?.price ?? product.priceMax ?? product.priceMin;
    const payable = teamPrice(price, Math.max(unlock.discountPercent, effectiveTeamDiscountPercent(product)));

    if (!payable || payable <= 0) {
      return NextResponse.json({ message: "Product price is not available." }, { status: 409 });
    }

    const { data: order, error } = await supabase
      .from("product_team_orders")
      .upsert(
        {
          unlock_id: unlock.id,
          product_id: product.id,
          brand_id: product.brandId,
          profile_id: profile.id,
          selected_variant: selectedVariant ?? null,
          buyer_name: buyerName.trim(),
          buyer_email: typeof buyerEmail === "string" && buyerEmail.trim() ? buyerEmail.trim() : null,
          buyer_phone: buyerPhone.trim(),
          delivery_address: deliveryAddress,
          amount_paid: payable,
          razorpay_payment_id: razorpayPaymentId,
          razorpay_order_id: typeof razorpayOrderId === "string" ? razorpayOrderId : null,
          razorpay_signature: typeof razorpaySignature === "string" ? razorpaySignature : null,
          status: "hold",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "unlock_id,profile_id" },
      )
      .select("id, status")
      .single();

    if (error) {
      throw error;
    }

    await syncProductTeamUnlockOrderStatus(unlock.id);

    void sendTelegramMessage({
      text: [
        "<b>Product checkout paid</b>",
        `Order: <b>${escapeTelegramHtml(order.id)}</b>`,
        `Room: <b>${escapeTelegramHtml(unlock.shareCode)}</b>`,
        `Buyer: ${escapeTelegramHtml(buyerName.trim())}`,
        `Phone: ${escapeTelegramHtml(adminPhoneLabel(buyerPhone.trim()))}`,
        `Email: ${escapeTelegramHtml(typeof buyerEmail === "string" && buyerEmail.trim() ? buyerEmail.trim() : "Not provided")}`,
        `Brand: ${escapeTelegramHtml(product.brand?.name ?? product.vendor ?? "Unknown brand")}`,
        `Product: ${escapeTelegramHtml(product.title)}`,
        `Variant: ${escapeTelegramHtml(variantLabel(selectedVariant))}`,
        `Amount paid: INR ${escapeTelegramHtml(payable)}`,
        `Payment id: ${escapeTelegramHtml(razorpayPaymentId)}`,
        `Razorpay order: ${escapeTelegramHtml(typeof razorpayOrderId === "string" ? razorpayOrderId : "Not provided")}`,
        `Address: ${escapeTelegramHtml(formatAddressForTelegram(deliveryAddress))}`,
      ].join("\n"),
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Product team order error:", error);
    return NextResponse.json({ message: "Could not place product order." }, { status: 500 });
  }
}
