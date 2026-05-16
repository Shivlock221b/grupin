import { notFound } from "next/navigation";
import { PrivateUnlockExperience } from "@/components/private-unlock-experience";
import { getCurrentAccountProfile } from "@/lib/account-auth";
import { getGroupDealById, getPrivateUnlockDealConfigByDealId, listPrivateUnlockMembers } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase-admin";
import { phoneLookupVariants } from "@/lib/otp";
import { PrivateUnlock, PrivateUnlockMember } from "@/lib/types";

type PrivateUnlockStartPageProps = {
  params: Promise<{ dealId: string }>;
};

export default async function PrivateUnlockStartPage({ params }: PrivateUnlockStartPageProps) {
  const { dealId } = await params;
  const [deal, config] = await Promise.all([
    getGroupDealById(dealId),
    getPrivateUnlockDealConfigByDealId(dealId),
  ]);

  if (!deal || !config) {
    notFound();
  }

  const profile = await getCurrentAccountProfile();
  const supabase = createAdminClient();
  let existingUnlock: PrivateUnlock | null = null;
  let existingMembers: PrivateUnlockMember[] = [];

  if (profile && supabase) {
    const { data: member } = await supabase
      .from("private_unlock_members")
      .select("unlock_id")
      .eq("deal_id", deal.id)
      .in("phone", phoneLookupVariants(profile.phone))
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (member?.unlock_id) {
      const { data: unlockRow } = await supabase
        .from("private_unlocks")
        .select("id, deal_id, share_code, threshold, discount_percent, coupon_code, current_count, expires_at, created_at")
        .eq("id", String(member.unlock_id))
        .maybeSingle();

      if (unlockRow) {
        existingUnlock = {
          id: String(unlockRow.id),
          dealId: String(unlockRow.deal_id),
          shareCode: String(unlockRow.share_code),
          threshold: Number(unlockRow.threshold),
          discountPercent: Number(unlockRow.discount_percent),
          couponCode: String(unlockRow.coupon_code),
          currentCount: Number(unlockRow.current_count ?? 0),
          expiresAt: String(unlockRow.expires_at),
          createdAt: unlockRow.created_at ? String(unlockRow.created_at) : undefined,
        };
        existingMembers = await listPrivateUnlockMembers(existingUnlock.id);
      }
    }
  }

  return (
    <PrivateUnlockExperience
      deal={deal}
      config={config}
      initialUnlock={existingUnlock}
      initialMembers={existingMembers}
      initiallyJoined={Boolean(existingUnlock)}
    />
  );
}
