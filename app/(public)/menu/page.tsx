import { getMenuData, getRestaurantConfig } from "@/lib/data";
import { MenuShell } from "@/features/menu/components/menu-shell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MenuPage({
  searchParams
}: {
  searchParams: Promise<{ mesa?: string }>;
}) {
  const [restaurant, menu, query] = await Promise.all([
    getRestaurantConfig(),
    getMenuData(),
    searchParams
  ]);

  return (
    <MenuShell
      mesa={query.mesa}
      restaurant={restaurant}
      categories={menu.categories}
      products={menu.products}
    />
  );
}
