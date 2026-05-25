import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { escapeTelegramHtml, sendTelegramMessage } from "@/lib/telegram";
import { syncProductTeamUnlockOrderStatus } from "@/lib/data";

const roomStatuses = ["active", "unlocked", "expired", "completed", "cancelled"] as const;
const orderStatuses = ["hold", "confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered", "refund_pending", "refunded", "cancelled"] as const;
const baseOrderStatuses = ["hold", "confirmed", "refund_pending", "refunded", "cancelled"];

type TelegramUpdate = {
  message?: {
    chat?: { id?: number | string };
    text?: string;
  };
};

function helpText() {
  return [
    "<b>GruPin Telegram admin</b>",
    "",
    "Commands:",
    "/room ROOM_CODE active",
    "/room ROOM_CODE unlocked",
    "/room ROOM_CODE expired",
    "/room ROOM_CODE completed",
    "/room ROOM_CODE cancelled",
    "",
    "/order ORDER_ID confirmed Payment verified",
    "/order ORDER_ID processing Packing started",
    "/order ORDER_ID shipped Tracking shared",
    "/order ORDER_ID delivered Delivered to customer",
    "/order ORDER_ID refund_pending Refund started",
    "/order ORDER_ID cancelled Cancelled by admin",
  ].join("\n");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function reply(chatId: string, text: string) {
  await sendTelegramMessage({ chatId, text });
}

async function updateRoom(chatId: string, roomCodeOrId: string, status: string) {
  const supabase = createAdminClient();

  if (!supabase) {
    await reply(chatId, "Supabase admin client is not configured.");
    return;
  }

  if (!roomStatuses.includes(status as (typeof roomStatuses)[number])) {
    await reply(chatId, `Unknown room status: ${escapeTelegramHtml(status)}`);
    return;
  }

  const normalizedCode = roomCodeOrId.trim().toUpperCase();
  let query = supabase.from("product_team_unlocks").select("id, share_code, status").eq("share_code", normalizedCode).maybeSingle();

  if (isUuid(roomCodeOrId)) {
    query = supabase.from("product_team_unlocks").select("id, share_code, status").eq("id", roomCodeOrId).maybeSingle();
  }

  const { data: room, error: findError } = await query;

  if (findError) {
    await reply(chatId, `Room lookup failed: ${escapeTelegramHtml(findError.message)}`);
    return;
  }

  if (!room) {
    await reply(chatId, `Room not found: ${escapeTelegramHtml(roomCodeOrId)}`);
    return;
  }

  const { error } = await supabase
    .from("product_team_unlocks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", room.id);

  if (error) {
    await reply(chatId, `Room update failed: ${escapeTelegramHtml(error.message)}`);
    return;
  }

  await reply(chatId, `Room <b>${escapeTelegramHtml(room.share_code)}</b> updated to <b>${escapeTelegramHtml(status)}</b>.`);
}

async function updateOrder(chatId: string, orderId: string, status: string, remark: string) {
  const supabase = createAdminClient();

  if (!supabase) {
    await reply(chatId, "Supabase admin client is not configured.");
    return;
  }

  if (!orderStatuses.includes(status as (typeof orderStatuses)[number])) {
    await reply(chatId, `Unknown order status: ${escapeTelegramHtml(status)}`);
    return;
  }

  if (!isUuid(orderId)) {
    await reply(chatId, "Please use the full order UUID from the checkout Telegram alert.");
    return;
  }

  const { data: order, error: orderError } = await supabase
    .from("product_team_orders")
    .select("id, unlock_id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    await reply(chatId, `Order lookup failed: ${escapeTelegramHtml(orderError.message)}`);
    return;
  }

  if (!order) {
    await reply(chatId, `Order not found: ${escapeTelegramHtml(orderId)}`);
    return;
  }

  const { error: timelineError } = await supabase.from("product_team_order_updates").insert({
    order_id: order.id,
    status,
    remark: remark.trim() || null,
    created_by: "telegram",
  });

  if (timelineError && timelineError.code !== "PGRST205" && timelineError.code !== "42P01") {
    await reply(chatId, `Timeline update failed: ${escapeTelegramHtml(timelineError.message)}`);
    return;
  }

  if (baseOrderStatuses.includes(status)) {
    const { error: updateError } = await supabase
      .from("product_team_orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", order.id);

    if (updateError) {
      await reply(chatId, `Order update failed: ${escapeTelegramHtml(updateError.message)}`);
      return;
    }

    await syncProductTeamUnlockOrderStatus(String(order.unlock_id));
  }

  const migrationNote = timelineError ? "\nTimeline table is missing. Run the order tracking migration for customer-visible updates." : "";
  await reply(chatId, `Order <b>${escapeTelegramHtml(order.id)}</b> updated to <b>${escapeTelegramHtml(status)}</b>.${migrationNote}`);
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  const update = (await request.json().catch(() => ({}))) as TelegramUpdate;
  const chatId = update.message?.chat?.id ? String(update.message.chat.id) : "";
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!chatId || !adminChatId || chatId !== adminChatId) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  if (webhookSecret && request.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const text = update.message?.text?.trim() ?? "";
  const [rawCommand = "", first = "", second = "", ...rest] = text.split(/\s+/);
  const command = rawCommand.split("@")[0];

  if (!text || command === "/help" || command === "/start") {
    await reply(chatId, helpText());
    return NextResponse.json({ ok: true });
  }

  if (command === "/room") {
    if (!first || !second) {
      await reply(chatId, "Use /room ROOM_CODE status");
      return NextResponse.json({ ok: true });
    }

    await updateRoom(chatId, first, second);
    return NextResponse.json({ ok: true });
  }

  if (command === "/order") {
    if (!first || !second) {
      await reply(chatId, "Use /order ORDER_ID status optional remark");
      return NextResponse.json({ ok: true });
    }

    await updateOrder(chatId, first, second, rest.join(" "));
    return NextResponse.json({ ok: true });
  }

  await reply(chatId, helpText());
  return NextResponse.json({ ok: true });
}
