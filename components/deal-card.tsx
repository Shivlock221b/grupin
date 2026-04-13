import Image from "next/image";
import Link from "next/link";
import { Deal } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { ProgressBar } from "@/components/progress-bar";

type DealCardProps = {
  deal: Deal;
};

export function DealCard({ deal }: DealCardProps) {
  return (
    <article className="overflow-hidden rounded-[2rem] border border-[rgba(22,38,32,0.12)] bg-white shadow-[0_24px_80px_rgba(58,80,64,0.10)]">
      <div className="relative h-64">
        <Image src={deal.heroImage} alt={deal.title} fill className="object-cover" />
        <div className="absolute left-5 top-5 rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[var(--forest)]">
          {deal.discountPercent}% off
        </div>
      </div>
      <div className="space-y-5 p-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--clay)]">
            <span>{deal.category}</span>
            <span>{deal.area}</span>
          </div>
          <h3 className="text-2xl font-semibold text-[var(--forest)]">{deal.title}</h3>
          <p className="text-sm leading-6 text-[rgba(22,38,32,0.72)]">{deal.description}</p>
        </div>
        <div className="rounded-[1.25rem] bg-[var(--mist)] p-4">
          <p className="text-sm font-medium text-[rgba(22,38,32,0.7)]">Credit pack</p>
          <p className="mt-1 text-base font-semibold text-[var(--forest)]">{deal.creditDescription}</p>
          <p className="mt-2 text-sm text-[rgba(22,38,32,0.72)]">Closing: {formatDate(deal.closeDate)}</p>
        </div>
        <ProgressBar current={deal.currentInterestCount} minimum={deal.minimumInterestCount} />
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-[rgba(22,38,32,0.68)]">Merchant: {deal.merchant}</p>
          <Link
            href={`/deals/${deal.slug}`}
            className="rounded-full bg-[var(--forest)] px-5 py-3 text-sm font-semibold !text-white transition hover:bg-[var(--forest-strong)]"
          >
            View Deal
          </Link>
        </div>
      </div>
    </article>
  );
}
