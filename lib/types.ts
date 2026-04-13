export type DealStatus = "draft" | "live" | "threshold_met" | "closed" | "archived";

export type Deal = {
  id: string;
  slug: string;
  title: string;
  merchant: string;
  category: string;
  city: string;
  area: string;
  description: string;
  discountPercent: number;
  creditDescription: string;
  minimumInterestCount: number;
  currentInterestCount: number;
  status: DealStatus;
  closeDate?: string | null;
  heroImage: string;
  terms: string[];
  featured?: boolean;
};

export type Profile = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  whatsappOptIn: boolean;
  area?: string | null;
  city?: string | null;
};

export type DealInterest = {
  id: string;
  dealId: string;
  userId: string;
  status: "pending_verification" | "confirmed";
  createdAt: string;
  profile: Profile;
};

export type NotificationEvent = {
  id: string;
  type: "interest_confirmed" | "threshold_reached" | "admin_export_generated" | "user_notification_queued";
  dealId: string;
  userId?: string | null;
  channel: "email" | "whatsapp" | "system";
  status: "queued" | "sent";
  createdAt: string;
};

export type DealFilters = {
  category?: string;
  area?: string;
  discountBand?: string;
};

export type UserDealInterest = {
  id: string;
  status: "pending_verification" | "confirmed";
  createdAt: string;
  deal: Deal;
};
