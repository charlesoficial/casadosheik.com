import { MenuManager } from "@/features/menu/components/menu-manager";
import { getMenuManagementData } from "@/lib/data";

export default async function AdminMenuPage() {
  const { categories, products } = await getMenuManagementData();

  return <MenuManager initialCategories={categories} initialProducts={products} />;
}
