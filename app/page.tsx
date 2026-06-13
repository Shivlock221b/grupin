import { ProductMarketplaceHome } from "@/components/product-marketplace-home";
import { getCurrentAccountProfile } from "@/lib/account-auth";
import { listTrendingProductPools, ProductPoolTimeFilter } from "@/lib/data";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const timeFilters = new Set<ProductPoolTimeFilter>(["all", "today", "week", "new"]);
const categoryFilters = new Set(["Skincare", "Haircare", "Makeup", "Accessories", "Fragrance", "Bodycare", "Facial care"]);
const PAGE_SIZE = 12;

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const profile = await getCurrentAccountProfile();
  const params = await searchParams;
  const categoryParam = singleValue(params?.category);
  const timeParam = singleValue(params?.time);
  const pageParam = Number(singleValue(params?.page) ?? 1);
  const category = categoryParam && categoryFilters.has(categoryParam) ? categoryParam : null;
  const time = timeParam && timeFilters.has(timeParam as ProductPoolTimeFilter) ? timeParam as ProductPoolTimeFilter : "all";
  const page = Number.isFinite(pageParam) && pageParam > 1 ? Math.floor(pageParam) : 1;
  const visibleLimit = page * PAGE_SIZE;
  const poolsWithExtra = await listTrendingProductPools(profile?.id, visibleLimit + 1, { category, time });
  const hasMore = poolsWithExtra.length > visibleLimit;
  const pools = poolsWithExtra.slice(0, visibleLimit);

  return <ProductMarketplaceHome pools={pools} selectedCategory={category} selectedTime={time} nextPage={page + 1} hasMore={hasMore} />;
}
