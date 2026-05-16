import { PrivateUnlockMarketplace } from "@/components/private-unlock-marketplace";
import { listPrivateUnlockDealConfigs } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function UnlockDealsPage() {
  const configs = await listPrivateUnlockDealConfigs();

  return <PrivateUnlockMarketplace configs={configs} />;
}
