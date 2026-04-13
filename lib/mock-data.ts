import { Deal, DealInterest, NotificationEvent, Profile } from "@/lib/types";

export const mockProfiles: Profile[] = [
  {
    id: "profile-1",
    fullName: "Aisha Mehta",
    email: "aisha@example.com",
    phone: "+91 9876543210",
    whatsappOptIn: true,
    area: "Indiranagar",
    city: "Bengaluru",
  },
  {
    id: "profile-2",
    fullName: "Rahul Nair",
    email: "rahul@example.com",
    phone: "+91 9123456780",
    whatsappOptIn: true,
    area: "Koramangala",
    city: "Bengaluru",
  },
];

export const mockDeals: Deal[] = [
  {
    id: "deal-1",
    slug: "strike-zone-bowling-pack",
    title: "Strike Zone Weekend Bowling Credits",
    merchant: "Strike Zone",
    category: "Bowling",
    city: "Bengaluru",
    area: "Indiranagar",
    description:
      "Pool together with other bowlers and unlock prepaid lane credits you can redeem any weekend in the next 90 days.",
    discountPercent: 25,
    creditDescription: "Rs. 2,000 bowling credit pack redeemable anytime within 90 days",
    minimumInterestCount: 10,
    currentInterestCount: 7,
    status: "live",
    closeDate: null,
    heroImage:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
    terms: [
      "Valid on weekdays and weekends.",
      "Credits can be split across visits.",
      "Non-transferable after voucher issuance.",
    ],
    featured: true,
  },
  {
    id: "deal-2",
    slug: "glow-house-salon-wallet",
    title: "Glow House Salon Wallet",
    merchant: "Glow House",
    category: "Salon",
    city: "Bengaluru",
    area: "Koramangala",
    description:
      "Join a neighborhood buy and secure discounted salon wallet credits for cuts, color, and grooming sessions.",
    discountPercent: 15,
    creditDescription: "Rs. 5,000 salon wallet usable across services for 6 months",
    minimumInterestCount: 12,
    currentInterestCount: 12,
    status: "threshold_met",
    closeDate: null,
    heroImage:
      "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=80",
    terms: [
      "Wallet expires in 6 months.",
      "Cannot be combined with in-store festival discounts.",
      "Appointment booking remains subject to availability.",
    ],
    featured: true,
  },
  {
    id: "deal-3",
    slug: "turbo-track-race-credits",
    title: "Turbo Track Go-Kart Credits",
    merchant: "Turbo Track",
    category: "Go-Karting",
    city: "Bengaluru",
    area: "Sarjapur",
    description:
      "Bring together thrill-seekers and lock in off-peak race credits you can redeem later with friends or family.",
    discountPercent: 20,
    creditDescription: "4-race credit bundle valid for 60 days",
    minimumInterestCount: 8,
    currentInterestCount: 3,
    status: "live",
    closeDate: null,
    heroImage:
      "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80",
    terms: [
      "Minimum rider height restrictions apply.",
      "Helmet and safety gear included.",
      "Weekend surcharges are payable at venue if applicable.",
    ],
  },
];

export const mockInterests: DealInterest[] = [
  {
    id: "interest-1",
    dealId: "deal-1",
    userId: "profile-1",
    status: "confirmed",
    createdAt: "2026-03-20T10:00:00.000Z",
    profile: mockProfiles[0],
  },
  {
    id: "interest-2",
    dealId: "deal-2",
    userId: "profile-2",
    status: "confirmed",
    createdAt: "2026-03-18T10:00:00.000Z",
    profile: mockProfiles[1],
  },
];

export const mockNotificationEvents: NotificationEvent[] = [
  {
    id: "notification-1",
    type: "interest_confirmed",
    dealId: "deal-1",
    userId: "profile-1",
    channel: "email",
    status: "sent",
    createdAt: "2026-03-20T10:05:00.000Z",
  },
  {
    id: "notification-2",
    type: "threshold_reached",
    dealId: "deal-2",
    channel: "whatsapp",
    status: "queued",
    createdAt: "2026-03-21T07:30:00.000Z",
  },
];
