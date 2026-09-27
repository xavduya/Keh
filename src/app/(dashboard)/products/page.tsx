import { getCurrentContext } from "@/lib/auth/context";
import { getProducts } from "@/services/product.service";
import { ProductsView } from "./ProductsView";

export default async function ProductsPage() {
  const { business } = await getCurrentContext();
  const products = await getProducts(business.id);

  return <ProductsView products={products} />;
}
