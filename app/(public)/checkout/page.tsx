import { CheckoutShell } from "@/features/menu/components/checkout-shell";

export default async function CheckoutPage({
  searchParams
}: {
  searchParams: { mesa?: string; fromProduct?: string };
}) {
  return <CheckoutShell mesa={searchParams.mesa} fromProduct={searchParams.fromProduct} />;
}
