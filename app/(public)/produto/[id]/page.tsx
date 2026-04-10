import { redirect } from "next/navigation";

import { getProductById } from "@/lib/data";
import { ProductDetailShell } from "@/features/menu/components/product-detail-shell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProductPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: { mesa?: string };
}) {
  const product = await getProductById(params.id);

  if (!product) {
    redirect(searchParams.mesa ? `/menu?mesa=${searchParams.mesa}` : "/menu");
  }

  return <ProductDetailShell product={product} mesa={searchParams.mesa} />;
}
