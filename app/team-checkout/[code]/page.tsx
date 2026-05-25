import { notFound, redirect } from "next/navigation";
import { AccountMenu } from "@/components/account-menu";
import { ProductTeamCheckoutClient } from "@/components/product-team-checkout-client";
import { getCurrentAccountProfile } from "@/lib/account-auth";
import { getCachedBrandProductById, getProductTeamUnlockByCode, listProductTeamUnlockMembers } from "@/lib/data";
import { phoneLookupVariants } from "@/lib/otp";

export const dynamic = "force-dynamic";

type ProductTeamCheckoutPageProps = {
  params: Promise<{ code: string }>;
};

export default async function ProductTeamCheckoutPage({ params }: ProductTeamCheckoutPageProps) {
  const { code } = await params;
  const unlock = await getProductTeamUnlockByCode(code);

  if (!unlock || unlock.currentCount < unlock.threshold) {
    notFound();
  }

  const [product, members, profile] = await Promise.all([
    getCachedBrandProductById(unlock.productId),
    listProductTeamUnlockMembers(unlock.id),
    getCurrentAccountProfile(),
  ]);

  if (!product) {
    notFound();
  }

  if (!profile) {
    redirect(`/login?next=/team-checkout/${code}`);
  }

  const currentMember = members.find((member) => member.profileId === profile.id || phoneLookupVariants(profile.phone).includes(member.phone));

  if (!currentMember) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f3faf7] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <span className="text-xl font-semibold tracking-tight text-emerald-950">GruPin checkout</span>
          <AccountMenu />
        </div>
      </header>
      <ProductTeamCheckoutClient code={code} product={product} unlock={unlock} profile={profile} />
    </main>
  );
}
