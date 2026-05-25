type TelegramMessageInput = {
  text: string;
  chatId?: string;
};

export async function sendTelegramMessage({ text, chatId }: TelegramMessageInput) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const targetChatId = chatId ?? process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!token || !targetChatId) {
    return { delivered: false, reason: "Telegram env vars are not configured." };
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: targetChatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    return {
      delivered: false,
      reason: payload?.description ?? "Telegram send failed.",
    };
  }

  return { delivered: true };
}

export function escapeTelegramHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function phoneLast4(phone: unknown) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  return digits ? digits.slice(-4) : "";
}

export function adminPhoneLabel(phone: unknown, fallback = "Unknown phone") {
  const text = String(phone ?? "").trim();
  const last4 = phoneLast4(text);

  if (!text) {
    return fallback;
  }

  return `${text}${last4 ? ` (last 4: ${last4})` : ""}`;
}
