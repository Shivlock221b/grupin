import { DealCard } from "@/components/deal-card";
import { FilterBar } from "@/components/filter-bar";
import { SectionHeading } from "@/components/section-heading";
import { getAvailableAreas, getAvailableCategories, listDeals } from "@/lib/data";

type DealsPageContentProps = {
  searchParams: Promise<{
    category?: string;
    area?: string;
    discountBand?: string;
  }>;
  eyebrow?: string;
  title?: string;
  description?: string;
};

export async function DealsPageContent({
  searchParams,
  eyebrow = "Explore Deals",
  title = "Browse active deal pages",
  description = "Filter by category, area, or discount band, then open any page to join the deal with your details.",
}: DealsPageContentProps) {
  const params = await searchParams;
  const allDeals = await listDeals();
  const deals = await listDeals(params);
  const categories = getAvailableCategories(allDeals);
  const areas = getAvailableAreas(allDeals);

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-16">
      <SectionHeading eyebrow={eyebrow} title={title} description={description} />
      <FilterBar categories={categories} areas={areas} selected={params} />
      <div className="grid gap-8 lg:grid-cols-2">
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
      </div>
      {deals.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-[rgba(22,38,32,0.18)] px-8 py-14 text-center text-[rgba(22,38,32,0.72)]">
          No deals matched these filters yet.
        </div>
      ) : null}
    </div>
  );
}
