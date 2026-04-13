type NotifyPayload = {
  dealId: string;
  userId?: string;
  recipient: string;
  message: string;
};

export type NotificationProvider = {
  channel: "email" | "whatsapp";
  queue(payload: NotifyPayload): Promise<{ status: "queued"; provider: string }>;
};

class EmailNotificationProvider implements NotificationProvider {
  channel: "email" = "email";

  async queue(_payload: NotifyPayload): Promise<{ status: "queued"; provider: string }> {
    return {
      status: "queued" as const,
      provider: `email:${process.env.NOTIFY_EMAIL_FROM ?? "console"}`,
    };
  }
}

class WhatsAppNotificationProvider implements NotificationProvider {
  channel: "whatsapp" = "whatsapp";

  async queue(_payload: NotifyPayload): Promise<{ status: "queued"; provider: string }> {
    return {
      status: "queued" as const,
      provider: `whatsapp:${process.env.WHATSAPP_SENDER_ID ?? "console"}`,
    };
  }
}

export const notificationProviders: NotificationProvider[] = [
  new EmailNotificationProvider(),
  new WhatsAppNotificationProvider(),
];

export async function queueNotifications(payload: NotifyPayload) {
  return Promise.all(notificationProviders.map((provider) => provider.queue(payload)));
}
