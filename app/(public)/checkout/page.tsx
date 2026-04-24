import { CheckoutShell } from "@/features/menu/components/checkout-shell";
import { getRestaurantConfig } from "@/lib/data";

export default async function CheckoutPage({
  searchParams
}: {
  searchParams: { mesa?: string; fromProduct?: string };
}) {
  const restaurant = await getRestaurantConfig();

  return (
    <CheckoutShell
      mesa={searchParams.mesa}
      fromProduct={searchParams.fromProduct}
      deliveryFee={restaurant.deliveryFee ?? 0}
    />
  );
}
