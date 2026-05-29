import { notFound, redirect } from "next/navigation";
import { AccountMenu } from "@/components/account-menu";
import { ProductTeamCheckoutClient } from "@/components/product-team-checkout-client";
import { getCurrentAccountProfile } from "@/lib/account-auth";
import { getProductTeamUnlockByCode, listProductTeamCartItems, listProductTeamUnlockMembers, syncProductTeamUnlockOrderStatus } from "@/lib/data";
import { phoneLookupVariants } from "@/lib/otp";

export const dynamic = "force-dynamic";

type ProductTeamCheckoutPageProps = {
  params: Promise<{ code: string }>;
};

export default async function ProductTeamCheckoutPage({ params }: ProductTeamCheckoutPageProps) {
  const { code } = await params;
  const unlock = await getProductTeamUnlockByCode(code);

  if (!unlock) {
    notFound();
  }

  const syncedUnlock = await syncProductTeamUnlockOrderStatus(unlock.id);
  const effectiveUnlock = syncedUnlock ?? unlock;

  if (
    effectiveUnlock.currentCount < effectiveUnlock.threshold ||
    ["completed", "cancelled", "expired"].includes(effectiveUnlock.status) ||
    new Date(effectiveUnlock.expiresAt).getTime() <= Date.now()
  ) {
    notFound();
  }

  const [cartItems, members, profile] = await Promise.all([
    listProductTeamCartItems(effectiveUnlock.id),
    listProductTeamUnlockMembers(effectiveUnlock.id),
    getCurrentAccountProfile(),
  ]);

  if (!profile) {
    redirect(`/login?next=/team-checkout/${code}`);
  }

  const currentMember = members.find((member) => member.profileId === profile.id || phoneLookupVariants(profile.phone).includes(member.phone));

  if (!currentMember) {
    notFound();
  }

  const memberCartItems = cartItems.filter((item) => item.memberId === currentMember.id);

  if (!memberCartItems.length) {
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
      <ProductTeamCheckoutClient code={code} cartItems={memberCartItems} unlock={effectiveUnlock} profile={profile} />
    </main>
  );
}
