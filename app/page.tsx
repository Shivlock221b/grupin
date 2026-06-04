import { ProductMarketplaceHome } from "@/components/product-marketplace-home";
import { getCachedMarketplaceHomeData } from "@/lib/data";

export const revalidate = 300;

export default async function HomePage() {
  const { brands, products } = await getCachedMarketplaceHomeData();

  return <ProductMarketplaceHome brands={brands} products={products} />;
}
