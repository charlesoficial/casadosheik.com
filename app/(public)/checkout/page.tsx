import { CheckoutShell } from "@/features/menu/components/checkout-shell";
import { getRestaurantConfig } from "@/lib/data";

export default async function CheckoutPage({
  searchParams
}: {
  searchParams: Promise<{ mesa?: string; fromProduct?: string }>;
}) {
  const [restaurant, query] = await Promise.all([getRestaurantConfig(), searchParams]);

  return (
    <CheckoutShell
      mesa={query.mesa}
      fromProduct={query.fromProduct}
      deliveryFee={restaurant.deliveryFee ?? 0}
    />
  );
}
