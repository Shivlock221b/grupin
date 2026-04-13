import { DealsPageContent } from "@/components/deals-page-content";

type DealsPageProps = {
  searchParams: Promise<{
    category?: string;
    area?: string;
    discountBand?: string;
  }>;
};

export default async function DealsPage({ searchParams }: DealsPageProps) {
  return <DealsPageContent searchParams={searchParams} />;
}
