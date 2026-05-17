import { PrivateUnlockMarketplace } from "@/components/private-unlock-marketplace";
import { listCachedPrivateUnlockDealConfigs } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const configs = await listCachedPrivateUnlockDealConfigs();

  return <PrivateUnlockMarketplace configs={configs} />;
}
