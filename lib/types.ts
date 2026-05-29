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

export type ProductVariant = {
  title: string;
  variant_name?: string | null;
  variant_type?: string | null;
  child_id?: string | null;
  sku: string;
  price: number | null;
  sale_price?: number | null;
  compare_at_price?: number | null;
  available: boolean;
  requires_shipping: boolean;
  grams?: number | null;
  pack_size?: string | null;
  shade_image?: string | null;
  image_url?: string | null;
  nykaa_slug?: string | null;
  quantity?: number | null;
  expiry?: string | null;
  source_variant_ids?: Array<string | number>;
  source_product_ids?: Array<string | number>;
  source_handles?: string[];
};

export type BrandProduct = {
  id: string;
  brandId: string;
  brand?: Brand | null;
  title: string;
  slug: string;
  vendor?: string | null;
  primaryImage?: string | null;
  imageUrls: string[];
  variants: ProductVariant[];
  tags: string[];
  productTypes: string[];
  priceMin?: number | null;
  priceMax?: number | null;
  sourceProductIds: string[];
  sourceHandles: string[];
  sourceFiles: string[];
  productUrl?: string | null;
  sourceProductName?: string | null;
  sourceProductTitle?: string | null;
  sourceSlug?: string | null;
  sourceUrl?: string | null;
  mrp?: number | null;
  salePrice?: number | null;
  sourceDiscountPercent?: number | null;
  rating?: number | null;
  ratingCount?: number | null;
  inStock?: boolean | null;
  variantCount?: number | null;
  variantType?: string | null;
  primaryCategories?: Record<string, unknown> | null;
  description?: string | null;
  howToUse?: string | null;
  ingredients?: string | null;
  reviewCount?: number | null;
  detailImageUrl?: string | null;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ProductTeamUnlock = {
  id: string;
  productId?: string | null;
  brandId: string;
  ownerProfileId?: string | null;
  shareCode: string;
  threshold: number;
  discountPercent: number;
  selectedVariant?: ProductVariant | null;
  currentCount: number;
  memberCount: number;
  roomScope: "product" | "brand";
  status: "active" | "unlocked" | "expired" | "completed" | "cancelled";
  expiresAt: string;
  closedAt?: string | null;
  createdAt?: string;
};

export type ProductTeamUnlockMember = {
  id: string;
  unlockId: string;
  productId?: string | null;
  brandId: string;
  profileId?: string | null;
  selectedVariant?: ProductVariant | null;
  phone: string;
  role: "owner" | "member";
  cartStatus?: "empty" | "active" | "checked_out" | "left";
  roomScope?: "product" | "brand";
  cartCheckedOutAt?: string | null;
  createdAt: string;
};

export type ProductTeamCartItem = {
  id: string;
  unlockId: string;
  memberId: string;
  productId: string;
  brandId: string;
  selectedVariant?: ProductVariant | null;
  variantKey: string;
  quantity: number;
  mrpSnapshot: number;
  teamPriceSnapshot: number;
  discountPercentSnapshot: number;
  productSnapshot: {
    title?: string;
    slug?: string;
    brandSlug?: string;
    imageUrl?: string | null;
    productUrl?: string | null;
    variantLabel?: string;
  };
  createdAt?: string;
  updatedAt?: string;
};

export type ProductTeamOrder = {
  id: string;
  unlockId: string;
  productId?: string | null;
  brandId: string;
  profileId?: string | null;
  cartMemberId?: string | null;
  selectedVariant?: ProductVariant | null;
  items?: ProductTeamCartItem[];
  buyerName: string;
  buyerEmail?: string | null;
  buyerPhone: string;
  deliveryAddress: Record<string, unknown>;
  amountPaid: number;
  razorpayPaymentId?: string | null;
  razorpayOrderId?: string | null;
  razorpaySignature?: string | null;
  status: "hold" | "confirmed" | "refund_pending" | "refunded" | "cancelled";
  createdAt?: string;
  updatedAt?: string;
};

export type ProductTeamOrderUpdate = {
  id: string;
  orderId: string;
  status: "hold" | "confirmed" | "processing" | "packed" | "shipped" | "out_for_delivery" | "delivered" | "refund_pending" | "refunded" | "cancelled";
  remark?: string | null;
  createdBy?: string | null;
  createdAt: string;
};

export type ProductTeamCheckoutProgress = {
  id: string;
  profileId?: string | null;
  buyerName: string;
  buyerPhone: string;
  amountPaid: number;
  status: ProductTeamOrder["status"];
  createdAt?: string;
};

export type AccountProductUnlockRoom = ProductTeamUnlock & {
  productTitle: string;
  productSlug: string;
  brandName: string;
  brandSlug: string;
  memberRole: ProductTeamUnlockMember["role"];
  joinedAt: string;
};

export type AccountProductOrder = ProductTeamOrder & {
  productTitle: string;
  productSlug: string;
  brandName: string;
  brandSlug: string;
  shareCode: string;
  roomStatus?: ProductTeamUnlock["status"] | null;
  roomCurrentCount?: number | null;
  roomThreshold?: number | null;
  trackingUpdates?: ProductTeamOrderUpdate[];
};

export type AdminBrandProduct = BrandProduct & {
  roomsCount: number;
  membersCount: number;
  ordersCount: number;
  ordersRevenue: number;
};

export type AdminProductTeamUnlock = ProductTeamUnlock & {
  productTitle?: string | null;
  productSlug?: string | null;
  brandName?: string | null;
  members: ProductTeamUnlockMember[];
  cartItems: ProductTeamCartItem[];
  ordersCount: number;
  ordersRevenue: number;
};

export type AdminProductTeamOrder = ProductTeamOrder & {
  productTitle?: string | null;
  brandName?: string | null;
  shareCode?: string | null;
  profileName?: string | null;
  profilePhone?: string | null;
  profileEmail?: string | null;
  trackingUpdates?: ProductTeamOrderUpdate[];
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

export type PrivateUnlock = {
  id: string;
  dealId: string;
  shareCode: string;
  threshold: number;
  discountPercent: number;
  couponCode: string;
  currentCount: number;
  expiresAt: string;
  createdAt?: string;
};

export type PrivateUnlockMember = {
  id: string;
  unlockId: string;
  dealId: string;
  name: string;
  phone: string;
  email: string;
  razorpayPaymentId: string;
  createdAt: string;
};

export type PrivateUnlockDealConfig = {
  id: string;
  dealId: string;
  enabled: boolean;
  headline: string;
  brandName: string;
  brandLogo?: string | null;
  cardImage: string;
  bannerImage: string;
  category: string;
  shortDescription: string;
  threshold: number;
  discountPercent: number;
  tokenAmount: number;
  couponPrefix: string;
  sortOrder: number;
  featured: boolean;
  source?: string | null;
  sourceFile?: string | null;
  voucherUrl?: string | null;
  scrapedDiscountPercent?: number | null;
  voucherValue?: number;
  flatDiscountAmount?: number;
  finalPayableAfterUnlock?: number | null;
  howToUse?: string | null;
  termsAndConditions?: string | null;
  couponStockTotal: number;
  couponStockClaimed: number;
  isOutOfStock?: boolean;
  deal: GroupDeal;
  createdAt?: string;
};

export type AdminPrivateUnlockDeal = PrivateUnlockDealConfig & {
  slug: string;
  title: string;
  merchant: string;
  status: DealStatus;
  description?: string | null;
  brand?: Brand | null;
  roomsCount: number;
  membersCount: number;
  tokenRevenue: number;
  couponClaimsCount: number;
  finalRevenue: number;
};

export type AdminPrivateUnlockMember = PrivateUnlockMember & {
  amountPaid: number;
  paymentStatus: "created" | "paid" | "failed" | "refunded";
  razorpayOrderId?: string | null;
  razorpaySignature?: string | null;
  profileId?: string | null;
  dealTitle?: string | null;
  brandName?: string | null;
  shareCode?: string | null;
  unlockCount?: number;
  unlockThreshold?: number;
};

export type AdminCouponClaim = {
  id: string;
  unlockedCouponId: string;
  profileId: string;
  dealId: string;
  razorpayPaymentId: string;
  razorpayOrderId?: string | null;
  amountPaid: number;
  status: "paid" | "failed" | "refunded";
  emailDeliveryStatus: "not_requested" | "pending" | "delivered";
  createdAt: string;
  dealTitle?: string | null;
  brandName?: string | null;
  buyerName?: string | null;
  buyerPhone?: string | null;
  buyerEmail?: string | null;
};

export type AdminPrivateUnlockRoom = {
  id: string;
  dealId: string;
  shareCode: string;
  threshold: number;
  currentCount: number;
  expiresAt: string;
  createdAt: string;
  dealTitle?: string | null;
  brandName?: string | null;
};

export type AccountUnlockRoom = {
  id: string;
  dealId: string;
  shareCode: string;
  threshold: number;
  currentCount: number;
  expiresAt: string;
  createdAt: string;
  dealTitle: string;
  brandName: string;
};

export type AccountProfile = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  phoneVerified: boolean;
  createdAt?: string;
};

export type AccountUnlockedCoupon = {
  id: string;
  profileId: string;
  dealId: string;
  unlockId: string;
  status: "payment_pending" | "claimed" | "expired";
  unlockedPrice: number;
  tokenAmountPaid: number;
  remainingAmount: number;
  discountPercent: number;
  emailDeliveryStatus: "not_requested" | "pending" | "delivered";
  createdAt: string;
  dealTitle: string;
  brandName: string;
};
