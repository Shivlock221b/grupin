import { notFound } from "next/navigation";
import { JoinDealForm } from "@/components/join-deal-form";
import { getDealById } from "@/lib/data";

type JoinDealPageProps = {
  params: Promise<{ dealId: string }>;
};

export default async function JoinDealPage({ params }: JoinDealPageProps) {
  const { dealId } = await params;
  const deal = await getDealById(dealId);

  if (!deal) {
    notFound();
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-[2rem] bg-[var(--forest)] p-8 text-white">
        <p className="text-sm uppercase tracking-[0.22em] text-[rgba(255,255,255,0.68)]">Join {deal.title}</p>
        <h1 className="mt-3 text-4xl font-semibold">Add your details and help unlock this deal.</h1>
        <p className="mt-4 text-sm leading-7 text-[rgba(255,255,255,0.74)]">
          This standalone page is meant for direct sharing. Every signup counts immediately toward the unlock target,
          and once the threshold is met you can follow up with the group by email or WhatsApp.
        </p>
      </div>
      <JoinDealForm dealId={deal.id} city={deal.city} />
    </div>
  );
}
