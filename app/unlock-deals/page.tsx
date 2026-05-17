import { PrivateUnlockMarketplace } from "@/components/private-unlock-marketplace";
import { listCachedPrivateUnlockDealConfigs } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function UnlockDealsPage() {
  const configs = await listCachedPrivateUnlockDealConfigs();

  return <PrivateUnlockMarketplace configs={configs} />;
}
