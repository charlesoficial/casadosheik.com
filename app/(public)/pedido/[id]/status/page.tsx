import Link from "next/link";

import { getOrderDetail, getRestaurantConfig } from "@/lib/data";
import { OrderStatusShell } from "@/features/orders/components/order-status-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OrderStatusPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: { mesa?: string; fromProduct?: string; token?: string };
}) {
  try {
    const [order, restaurant] = await Promise.all([
      getOrderDetail(params.id, { publicToken: searchParams.token ?? null, requirePublicToken: true }),
      getRestaurantConfig()
    ]);

    return (
      <OrderStatusShell
        initialOrder={order}
        whatsapp={restaurant.whatsapp}
        mesa={searchParams.mesa}
        token={searchParams.token}
      />
    );
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "Pedido nao encontrado") {
      throw error;
    }

    return (
      <main className="mx-auto flex min-h-screen max-w-[480px] items-center px-4 py-8">
        <Card className="w-full border-[#eadfca] bg-white">
          <CardHeader className="space-y-2">
            <p className="text-sm font-medium text-[#8f6d1e]">Acompanhamento do pedido</p>
            <CardTitle className="text-2xl text-[#22180d]">Pedido nao encontrado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-muted-foreground">
              Esse link nao esta mais disponivel ou o pedido ainda nao foi sincronizado. Voce pode voltar ao cardapio e
              fazer um novo pedido normalmente.
            </p>
            <Button asChild className="w-full">
              <Link href="/menu">Voltar ao cardapio</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
}
