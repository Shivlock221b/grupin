import { notFound } from "next/navigation";
import { PrivateUnlockExperience } from "@/components/private-unlock-experience";
import { getGroupDealById, getPrivateUnlockByCode, getPrivateUnlockDealConfigByDealId, listPrivateUnlockMembers } from "@/lib/data";
import { getCurrentAccountProfile } from "@/lib/account-auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { phoneLookupVariants } from "@/lib/otp";

type PrivateUnlockPageProps = {
  params: Promise<{ code: string }>;
};

export default async function PrivateUnlockPage({ params }: PrivateUnlockPageProps) {
  const { code } = await params;
  const unlock = await getPrivateUnlockByCode(code);

  if (!unlock) {
    notFound();
  }

  const [deal, config, members, profile] = await Promise.all([
    getGroupDealById(unlock.dealId),
    getPrivateUnlockDealConfigByDealId(unlock.dealId),
    listPrivateUnlockMembers(unlock.id),
    getCurrentAccountProfile(),
  ]);

  if (!deal) {
    notFound();
  }

  let initiallyJoined = false;

  if (profile) {
    const supabase = createAdminClient();
    const { data } = supabase
      ? await supabase
          .from("private_unlock_members")
          .select("id")
          .eq("unlock_id", unlock.id)
          .in("phone", phoneLookupVariants(profile.phone))
          .limit(1)
          .maybeSingle()
      : { data: null };

    initiallyJoined = Boolean(data);
  }

  return <PrivateUnlockExperience deal={deal} config={config} initialUnlock={unlock} initialMembers={members} initiallyJoined={initiallyJoined} />;
}
