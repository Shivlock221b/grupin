import { DealsPageContent } from "@/components/deals-page-content";

type HomePageProps = {
  searchParams: Promise<{
    category?: string;
    area?: string;
    discountBand?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  return <DealsPageContent searchParams={searchParams} eyebrow="Live Deals" title="Browse live deal pages on GruPin" />;
}
