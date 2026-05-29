import { notFound } from "next/navigation";
import { ProductTeamExperience } from "@/components/product-team-experience";
import { getCurrentAccountProfile } from "@/lib/account-auth";
import { getCachedBrandProductById, getProductTeamUnlockByCode, listCachedBrandCatalogProductsByBrandSlug, listProductTeamCartItems, listProductTeamCheckoutProgress, listProductTeamUnlockMembers, syncProductTeamUnlockOrderStatus } from "@/lib/data";
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

  const syncedUnlock = await syncProductTeamUnlockOrderStatus(unlock.id);
  const effectiveUnlock = syncedUnlock ?? unlock;

  const [cartItems, members, checkoutProgress, profile] = await Promise.all([
    listProductTeamCartItems(effectiveUnlock.id),
    listProductTeamUnlockMembers(effectiveUnlock.id),
    listProductTeamCheckoutProgress(effectiveUnlock.id),
    getCurrentAccountProfile(),
  ]);
  const displayProductId = effectiveUnlock.productId ?? cartItems[0]?.productId ?? null;
  const product = displayProductId ? await getCachedBrandProductById(displayProductId) : null;

  if (!product) {
    notFound();
  }

  const bestSellerProducts = product.brand?.slug
    ? (await listCachedBrandCatalogProductsByBrandSlug(product.brand.slug))
        .filter((item) => item.id !== product.id)
        .sort((first, second) => Number(second.ratingCount ?? 0) - Number(first.ratingCount ?? 0))
        .slice(0, 6)
    : [];

  const currentMember = profile
    ? members.find((member) => member.profileId === profile.id || phoneLookupVariants(profile.phone).includes(member.phone))
    : null;

  return (
    <ProductTeamExperience
      product={product}
      initialUnlock={effectiveUnlock}
      initialMembers={members}
      initialCartItems={cartItems}
      initialCheckoutProgress={checkoutProgress}
      initiallyJoined={Boolean(currentMember)}
      initialCurrentMemberId={currentMember?.id ?? null}
      bestSellerProducts={bestSellerProducts}
    />
  );
}
