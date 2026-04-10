import { getMenuData, getRestaurantConfig } from "@/lib/data";
import { MenuShell } from "@/features/menu/components/menu-shell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MenuPage({
  searchParams
}: {
  searchParams: { mesa?: string };
}) {
  const [restaurant, menu] = await Promise.all([getRestaurantConfig(), getMenuData()]);

  return (
    <MenuShell
      mesa={searchParams.mesa}
      restaurant={restaurant}
      categories={menu.categories}
      products={menu.products}
    />
  );
}
