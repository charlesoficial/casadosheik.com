import { redirect } from "next/navigation";

import { getProductById } from "@/lib/data";
import { ProductDetailShell } from "@/features/menu/components/product-detail-shell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProductPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mesa?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const product = await getProductById(id);

  if (!product) {
    redirect(query.mesa ? `/menu?mesa=${query.mesa}` : "/menu");
  }

  return <ProductDetailShell product={product} mesa={query.mesa} />;
}
