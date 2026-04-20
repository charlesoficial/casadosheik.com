import { Lock, Printer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Painel de cozinha comercial. Hoje ele funciona como vitrine de upgrade
// e documenta visualmente como seria o fluxo de preparo dedicado.
const kitchenOrders = [
  {
    customer: "Cliente 01",
    meta: "Mesa 07 • Comanda 121 • QR Code",
    badge: "10:30",
    items: ["2x Cheeseburger", "1x Refrigerante", "1x New Spring Burger"]
  },
  {
    customer: "Cliente 02",
    meta: "Mesa 10 • Comanda 102 • QR Code",
    badge: "11:15",
    items: ["1x Cheeseburger", "1x Refrigerante"]
  }
];

export function KitchenBoard() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_390px]">
      <Card className="admin-kitchen-shell-card border-admin-border bg-admin-elevated">
        <CardContent className="p-10">
          <p className="text-sm text-status-warning-fg">Disponível no plano Automatizar</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-admin-fg">
            Agilize o preparo e a entrega dos pedidos por estação de produção
          </h1>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div>
              <Printer className="mb-3 h-6 w-6 text-status-info-fg" />
              <p className="text-sm leading-6 text-admin-fg-secondary">
                Vincule grupos e produtos do cardápio às estações de preparo.
              </p>
            </div>
            <div>
              <Printer className="mb-3 h-6 w-6 text-status-info-fg" />
              <p className="text-sm leading-6 text-admin-fg-secondary">
                Impressão automática ou exibição em tela dos pedidos por estação.
              </p>
            </div>
            <div>
              <Printer className="mb-3 h-6 w-6 text-status-info-fg" />
              <p className="text-sm leading-6 text-admin-fg-secondary">
                Acompanhe a cozinha em tempo real e reduza erros de preparo.
              </p>
            </div>
          </div>
          <Button variant="admin" className="mt-8">
            Ver planos de upgrade
          </Button>
          <p className="mt-6 flex items-center gap-2 text-sm text-admin-fg-muted">
            <Lock className="h-4 w-4 text-brand-gold" />
            Compatível com Windows 64 bits, Linux e Mac.
          </p>
        </CardContent>
      </Card>

      <Card className="admin-kitchen-shell-card border-admin-border bg-admin-elevated">
        <CardContent className="space-y-5 p-5">
          <div className="flex gap-2">
            <Badge className="rounded-xl border-status-new-border bg-status-new-bg px-3 py-2 text-status-new-fg">Em preparo</Badge>
            <Badge className="rounded-xl border-status-success-border bg-status-success-bg px-3 py-2 text-status-success-fg">Concluido</Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
            {kitchenOrders.map((order) => (
              <div key={order.customer} className="admin-kitchen-dark-block rounded-ds-lg border border-admin-border bg-admin-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-admin-fg">{order.customer}</p>
                    <p className="mt-1 text-xs text-admin-fg-muted">{order.meta}</p>
                  </div>
                  <span className="rounded-full bg-status-danger-bg border border-status-danger-border px-2 py-1 text-xs font-semibold text-status-danger-text">
                    {order.badge}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {order.items.map((item) => (
                    <label key={item} className="flex items-start justify-between gap-3 text-sm text-admin-fg-secondary">
                      <span>{item}</span>
                      <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-admin-border-strong bg-transparent" />
                    </label>
                  ))}
                </div>
                <Button variant="admin" className="mt-5 w-full">
                  Liberar
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
