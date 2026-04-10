import { Lock, Printer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Painel de cozinha comercial. Hoje ele funciona como vitrine de upgrade
// e documenta visualmente como seria o fluxo de preparo dedicado.
const kitchenOrders = [
  {
    customer: "Matheus Samuel",
    meta: "Mesa 07 • Comanda 121 • QR Code",
    badge: "10:30",
    items: ["2x Cheeseburger", "1x Refrigerante", "1x New Spring Burger"]
  },
  {
    customer: "Washington Nascimento",
    meta: "Mesa 10 • Comanda 102 • QR Code",
    badge: "11:15",
    items: ["1x Cheeseburger", "1x Refrigerante"]
  }
];

export function KitchenBoard() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_390px]">
      <Card className="admin-kitchen-shell-card border-[#2a2a2a] bg-[#171717]">
        <CardContent className="p-10">
          <p className="text-sm text-[#f8bf5f]">Disponivel a partir do Plano Automatizar</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-white">
            Agilize o processo de preparo e entrega de um pedido na estacao de preparo desejada
          </h1>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div>
              <Printer className="mb-3 h-6 w-6 text-[#4f8fff]" />
              <p className="text-sm leading-6 text-[#aca699]">
                Vincule grupos e produtos do cardapio nas estacoes de preparo.
              </p>
            </div>
            <div>
              <Printer className="mb-3 h-6 w-6 text-[#4f8fff]" />
              <p className="text-sm leading-6 text-[#aca699]">
                Impressao automatica ou exibicao dos pedidos nas estacoes.
              </p>
            </div>
            <div>
              <Printer className="mb-3 h-6 w-6 text-[#4f8fff]" />
              <p className="text-sm leading-6 text-[#aca699]">
                Reduza papel e acompanhe a cozinha em tempo real.
              </p>
            </div>
          </div>
          <Button variant="admin" className="mt-8">
            Fazer upgrade
          </Button>
          <p className="mt-6 flex items-center gap-2 text-sm text-[#9d988b]">
            <Lock className="h-4 w-4 text-[#f4c35a]" />
            A impressao automatica e compativel com Windows 64 bits, Linux e Mac.
          </p>
        </CardContent>
      </Card>

      <Card className="admin-kitchen-shell-card border-[#2a2a2a] bg-[#171717]">
        <CardContent className="space-y-5 p-5">
          <div className="flex gap-2">
            <Badge className="rounded-xl border-[#4c3b99] bg-[#24194c] px-3 py-2 text-[#c4b3ff]">Em preparo</Badge>
            <Badge className="rounded-xl border-[#295e43] bg-[#12251c] px-3 py-2 text-[#9be0b4]">Concluido</Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
            {kitchenOrders.map((order) => (
              <div key={order.customer} className="admin-kitchen-dark-block rounded-[22px] border border-[#2a2a2a] bg-[#111111] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{order.customer}</p>
                    <p className="mt-1 text-xs text-[#938d80]">{order.meta}</p>
                  </div>
                  <span className="rounded-full bg-[#ff624f] px-2 py-1 text-xs font-semibold text-white">
                    {order.badge}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {order.items.map((item) => (
                    <label key={item} className="flex items-start justify-between gap-3 text-sm text-[#ddd6ca]">
                      <span>{item}</span>
                      <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-[#3d3d3d] bg-transparent" />
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
