import { notFound } from "next/navigation";
import { ProductCatalog } from "@/components/product-catalog";
import { listCachedBrandCatalogProductsByBrandSlug, listCatalogBrandSlugs } from "@/lib/data";

export const revalidate = 300;

type CatalogBrandPageProps = {
  params: Promise<{ brandSlug: string }>;
};

export async function generateStaticParams() {
  try {
    const brandSlugs = await listCatalogBrandSlugs();
    return brandSlugs.map((brandSlug) => ({ brandSlug }));
  } catch {
    console.warn("Could not prebuild catalog brand routes.");
    return [];
  }
}

export default async function CatalogBrandPage({ params }: CatalogBrandPageProps) {
  const { brandSlug } = await params;
  const products = await listCachedBrandCatalogProductsByBrandSlug(brandSlug);

  if (!products.length) {
    notFound();
  }

  return <ProductCatalog products={products} brandSlug={brandSlug} />;
}
