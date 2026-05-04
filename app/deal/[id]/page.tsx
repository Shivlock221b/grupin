import { notFound } from "next/navigation";
import { GroupDealExperience } from "@/components/group-deal-experience";
import { getGroupDealById, listReservationsByDeal } from "@/lib/data";

type DealPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DealPage({ params }: DealPageProps) {
  const { id } = await params;
  const deal = await getGroupDealById(id);

  if (!deal) {
    notFound();
  }

  const reservations = await listReservationsByDeal(deal.id);

  return <GroupDealExperience initialDeal={deal} initialReservations={reservations} />;
}
