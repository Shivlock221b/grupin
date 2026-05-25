import { notFound } from "next/navigation";
import { ProductTeamExperience } from "@/components/product-team-experience";
import { getCurrentAccountProfile } from "@/lib/account-auth";
import { getCachedBrandProductById, getProductTeamUnlockByCode, listProductTeamCheckoutProgress, listProductTeamUnlockMembers } from "@/lib/data";
import { phoneLookupVariants } from "@/lib/otp";

export const dynamic = "force-dynamic";

type ProductTeamRoomPageProps = {
  params: Promise<{ code: string }>;
};

export default async function ProductTeamRoomPage({ params }: ProductTeamRoomPageProps) {
  const { code } = await params;
  const unlock = await getProductTeamUnlockByCode(code);

  if (!unlock) {
    notFound();
  }

  const [product, members, checkoutProgress, profile] = await Promise.all([
    getCachedBrandProductById(unlock.productId),
    listProductTeamUnlockMembers(unlock.id),
    listProductTeamCheckoutProgress(unlock.id),
    getCurrentAccountProfile(),
  ]);

  if (!product) {
    notFound();
  }

  const currentMember = profile
    ? members.find((member) => member.profileId === profile.id || phoneLookupVariants(profile.phone).includes(member.phone))
    : null;

  return (
    <ProductTeamExperience
      product={product}
      initialUnlock={unlock}
      initialMembers={members}
      initialCheckoutProgress={checkoutProgress}
      initiallyJoined={Boolean(currentMember)}
    />
  );
}
