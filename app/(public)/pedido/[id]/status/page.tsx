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
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mesa?: string; fromProduct?: string; token?: string }>;
}) {
  try {
    const [{ id }, query] = await Promise.all([params, searchParams]);
    const [order, restaurant] = await Promise.all([
      getOrderDetail(id, { publicToken: query.token ?? null, requirePublicToken: true }),
      getRestaurantConfig()
    ]);

    return (
      <OrderStatusShell
        initialOrder={order}
        whatsapp={restaurant.whatsapp}
        mesa={query.mesa}
        token={query.token}
      />
    );
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "Pedido nao encontrado") {
      throw error;
    }

    return (
      <main className="menu-theme flex min-h-screen w-full items-center [background:var(--menu-bg-gradient-soft)] px-4 py-8 text-menu-text lg:px-8">
        <Card className="mx-auto w-full max-w-[520px] border-menu-border bg-menu-surface-raised text-menu-text shadow-card lg:max-w-[760px]">
          <CardHeader className="space-y-2 lg:p-8">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-menu-accent-strong">
              Acompanhamento do pedido
            </p>
            <CardTitle className="text-2xl text-menu-text lg:text-4xl">Pedido não encontrado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 lg:p-8 lg:pt-0">
            <p className="text-sm leading-6 text-menu-text-muted lg:max-w-2xl lg:text-base lg:leading-7">
              Esse link não está mais disponível ou o pedido ainda não foi sincronizado. Você pode voltar ao cardápio e
              fazer um novo pedido normalmente.
            </p>
            <Button asChild className="w-full rounded-ds-lg bg-menu-cta text-menu-cta-fg hover:bg-menu-cta-hover lg:w-auto lg:px-8">
              <Link href="/menu">Voltar ao cardápio</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
}
