import { notFound } from "next/navigation";
import { CompletePurchaseFlow } from "@/components/complete-purchase-flow";
import { getGroupDealById } from "@/lib/data";

type CompletePurchasePageProps = {
  params: Promise<{ dealId: string }>;
};

export default async function CompletePurchasePage({ params }: CompletePurchasePageProps) {
  const { dealId } = await params;
  const deal = await getGroupDealById(dealId);

  if (!deal) {
    notFound();
  }

  return <CompletePurchaseFlow dealId={deal.id} initialDeal={deal} />;
}
