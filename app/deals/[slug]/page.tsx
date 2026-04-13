import Image from "next/image";
import { notFound } from "next/navigation";
import { JoinDealForm } from "@/components/join-deal-form";
import { ProgressBar } from "@/components/progress-bar";
import { getDealBySlug } from "@/lib/data";
import { formatDate } from "@/lib/utils";

type DealDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function DealDetailPage({ params }: DealDetailPageProps) {
  const { slug } = await params;
  const deal = await getDealBySlug(slug);

  if (!deal) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-16">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8">
          <div className="relative h-[360px] overflow-hidden rounded-[2rem]">
            <Image src={deal.heroImage} alt={deal.title} fill className="object-cover" />
          </div>
          <div className="space-y-5 rounded-[2rem] bg-white p-8 shadow-[0_24px_80px_rgba(58,80,64,0.10)]">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--clay)]">
              <span>{deal.category}</span>
              <span>{deal.city}</span>
              <span>{deal.area}</span>
            </div>
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-[var(--forest)]">{deal.title}</h1>
              <p className="mt-3 text-lg text-[rgba(22,38,32,0.76)]">{deal.description}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] bg-[var(--mist)] p-5">
                <p className="text-sm font-medium text-[rgba(22,38,32,0.68)]">Discount</p>
                <p className="mt-2 text-3xl font-semibold text-[var(--forest)]">{deal.discountPercent}% off</p>
              </div>
              <div className="rounded-[1.5rem] bg-[var(--mist)] p-5">
                <p className="text-sm font-medium text-[rgba(22,38,32,0.68)]">Credit pack</p>
                <p className="mt-2 text-lg font-semibold text-[var(--forest)]">{deal.creditDescription}</p>
              </div>
              <div className="rounded-[1.5rem] bg-[var(--mist)] p-5">
                <p className="text-sm font-medium text-[rgba(22,38,32,0.68)]">Merchant</p>
                <p className="mt-2 text-lg font-semibold text-[var(--forest)]">{deal.merchant}</p>
              </div>
              <div className="rounded-[1.5rem] bg-[var(--mist)] p-5">
                <p className="text-sm font-medium text-[rgba(22,38,32,0.68)]">Closing date</p>
                <p className="mt-2 text-lg font-semibold text-[var(--forest)]">{formatDate(deal.closeDate)}</p>
              </div>
            </div>
            <ProgressBar current={deal.currentInterestCount} minimum={deal.minimumInterestCount} />
            <div className="rounded-[1.5rem] border border-[rgba(22,38,32,0.1)] p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--clay)]">Terms</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[rgba(22,38,32,0.72)]">
                {deal.terms.map((term) => (
                  <li key={term}>• {term}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-[2rem] bg-[var(--forest)] p-8 text-white shadow-[0_24px_80px_rgba(22,49,38,0.20)]">
            <p className="text-sm uppercase tracking-[0.2em] text-[rgba(255,255,255,0.68)]">Join this deal</p>
            <h2 className="mt-3 text-3xl font-semibold">Enter your details to help unlock this offer.</h2>
            <p className="mt-4 text-sm leading-6 text-[rgba(255,255,255,0.74)]">
              Your join counts toward the unlock target right away. Once enough people sign up, you can receive the
              final discount details over email or WhatsApp. No payment happens on this page.
            </p>
          </div>
          <JoinDealForm dealId={deal.id} city={deal.city} />
        </div>
      </div>
    </div>
  );
}
