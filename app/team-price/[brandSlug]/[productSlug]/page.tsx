import { notFound } from "next/navigation";
import { ProductTeamExperience } from "@/components/product-team-experience";
import { getCachedBrandProductBySlugs, listProductRouteParams } from "@/lib/data";

export const revalidate = 300;

type ProductTeamPricePageProps = {
  params: Promise<{ brandSlug: string; productSlug: string }>;
};

export async function generateStaticParams() {
  try {
    return await listProductRouteParams();
  } catch {
    console.warn("Could not prebuild product detail routes.");
    return [];
  }
}

export default async function ProductTeamPricePage({ params }: ProductTeamPricePageProps) {
  const { brandSlug, productSlug } = await params;
  const product = await getCachedBrandProductBySlugs(brandSlug, productSlug);

  if (!product) {
    notFound();
  }

  return <ProductTeamExperience product={product} />;
}
