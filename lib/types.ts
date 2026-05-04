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

export type GroupDealTier = {
  threshold: number;
  price: number;
};

export type GroupDeal = {
  id: string;
  title: string;
  originalPrice: number;
  tiers: [GroupDealTier, GroupDealTier, GroupDealTier];
  currentCount: number;
  expiresAt: string;
  createdAt?: string;
};

export type Reservation = {
  id: string;
  dealId: string;
  name: string;
  phone: string;
  email: string;
  razorpayPaymentId: string;
  createdAt: string;
};

export type Brand = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  createdAt?: string;
};

export type BrandUser = {
  id: string;
  brandId: string;
  userId?: string | null;
  email: string;
  role: "owner" | "manager" | "viewer";
  createdAt?: string;
};

export type DashboardDeal = GroupDeal & {
  slug?: string;
  merchant?: string;
  status?: DealStatus;
  brand?: Brand | null;
};

export type DashboardReservation = Reservation & {
  amountPaid: number;
  paymentStatus: "created" | "paid" | "failed" | "refunded";
  razorpayOrderId?: string | null;
  razorpaySignature?: string | null;
  finalPurchaseStatus: "pending" | "completed" | "cancelled";
  dealTitle?: string | null;
  brandName?: string | null;
};

export type DealCoupon = {
  id: string;
  dealId: string;
  tierNumber: 1 | 2 | 3;
  threshold: number;
  couponCode: string;
  createdAt?: string;
};
