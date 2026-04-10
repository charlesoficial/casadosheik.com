"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, ChefHat, MessageCircle, Receipt, Store, Truck } from "lucide-react";
import { useRouter } from "next/navigation";

import { CustomerFlowHeader } from "@/components/customer/customer-flow-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildMenuHref } from "@/lib/utils/customer-navigation";
import { formatCurrency } from "@/lib/utils";
import type { OrderDetail } from "@/lib/types";

// Tela publica de acompanhamento do pedido.
// Ela combina polling leve com realtime para manter o status visivel ao cliente.
const steps = [
  { key: "novo", label: "Recebido", icon: Receipt },
  { key: "preparo", label: "Em preparo", icon: ChefHat },
  { key: "pronto", label: "Pronto", icon: CheckCircle2 }
] as const;

const statusOrder = ["novo", "aceito", "preparo", "pronto", "concluido"] as const;

function getStepState(orderStatus: OrderDetail["status"], stepKey: (typeof steps)[number]["key"]) {
  const statusIdx = statusOrder.indexOf(orderStatus as (typeof statusOrder)[number]);
  const stepIdx = statusOrder.indexOf(stepKey as (typeof statusOrder)[number]);
  if (statusIdx === stepIdx) return "current";
  if (statusIdx > stepIdx) return "done";
  return "idle";
}

export function OrderStatusShell({
  initialOrder,
  whatsapp,
  mesa,
  token
}: {
  initialOrder: OrderDetail;
  whatsapp?: string | null;
  mesa?: string;
  token?: string;
}) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const resolvedMesa = mesa ?? order.table ?? undefined;
  const menuHref = buildMenuHref(resolvedMesa);

  const waNumber = whatsapp?.replace(/\D/g, "");
  const waHref = waNumber ? `https://wa.me/55${waNumber}` : null;

  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  useEffect(() => {
    async function refreshOrder() {
      try {
        const query = token ? `?token=${encodeURIComponent(token)}` : "";
        const response = await fetch(`/api/orders/${order.id}${query}`, { cache: "no-store" });
        if (!response.ok) return;
        const next = (await response.json()) as OrderDetail;
        setOrder((current) => {
          const currentSerialized = JSON.stringify(current);
          const nextSerialized = JSON.stringify(next);
          return currentSerialized === nextSerialized ? current : next;
        });
      } catch {
        // Mantem a tela operacional se houver oscilacao temporaria no backend.
      }
    }

    // O status publico fica restrito ao polling da API protegida por token.
    const interval = window.setInterval(refreshOrder, 12000);
    return () => window.clearInterval(interval);
  }, [order.id, token]);

  return (
    <main className="mx-auto min-h-screen max-w-[480px] bg-[#f7f3ec] pb-8">
      <CustomerFlowHeader
        eyebrow="Acompanhamento em tempo real"
        title={`Pedido #${String(order.number).padStart(4, "0")}`}
        description="Acompanhe a atualizacao do seu pedido sem precisar perguntar no caixa."
        leading={
          <button
            type="button"
            onClick={() => router.push(menuHref)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#eadfca] bg-white/90 text-[#6c5840] shadow-sm transition-colors hover:bg-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[24px] border border-[#ecdcc0] bg-white/80 p-4">
            <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#f7eed8] text-[#8f6d1e]">
              {order.kind === "mesa" ? <Store className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9c8b72]">Origem</p>
            <p className="mt-1 text-lg font-semibold text-[#24190d]">
              {order.kind === "mesa" ? `Mesa ${order.table ?? "-"}` : "Delivery"}
            </p>
          </div>

          <div className="rounded-[24px] border border-[#ecdcc0] bg-white/80 p-4">
            <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#f7eed8] text-[#8f6d1e]">
              <Receipt className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9c8b72]">Valor do pedido</p>
            <p className="mt-1 text-lg font-semibold text-[#24190d]">{formatCurrency(order.total)}</p>
          </div>
        </div>
      </CustomerFlowHeader>

      <div className="space-y-4 px-4 pt-5">
        <Card className="border-[#eadfca] bg-white shadow-[0_18px_45px_rgba(84,60,14,0.08)]">
          <CardHeader className="pb-3">
            <CardTitle>Status atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {steps.map((step) => {
                const Icon = step.icon;
                const state = getStepState(order.status, step.key);

                const stateClass =
                  state === "current"
                    ? "border-[#c9a644] bg-[#fdf3d4] text-[#8f6d1e] shadow-sm"
                    : state === "done"
                      ? "border-[#e0d0a8] bg-[#faf5e6] text-[#8f6d1e]"
                      : "border-[#ece4d6] bg-[#faf7f2] text-[#c0b49e]";

                return (
                  <div
                    key={step.key}
                    className={`rounded-[22px] border p-4 text-center transition-colors ${stateClass}`}
                  >
                    <Icon className="mx-auto mb-2 h-5 w-5" />
                    <p className={`text-sm ${state === "current" ? "font-semibold" : "font-medium"}`}>
                      {step.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#eadfca] bg-white shadow-[0_18px_45px_rgba(84,60,14,0.08)]">
          <CardHeader className="pb-3">
            <CardTitle>Itens do pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-[22px] border border-[#efe5d3] bg-[#fffdfa] px-4 py-3"
              >
                <div>
                  <p className="font-medium text-[#21180f]">
                    {item.qty}x {item.name}
                  </p>
                  {item.note ? (
                    <Badge className="mt-1 w-fit border-[#ddd0bf] bg-[#f5ede0] text-[#7a6040]">{item.note}</Badge>
                  ) : null}
                </div>
                <p className="font-semibold text-[#8f6d1e]">{formatCurrency(item.qty * item.price)}</p>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-[#eee2cf] pt-4 text-lg font-semibold">
              <span className="text-[#21180f]">Total</span>
              <span className="text-[#8f6d1e]">{formatCurrency(order.total)}</span>
            </div>
          </CardContent>
        </Card>

        {whatsapp ? (
          <Card className="border-[#eadfca] bg-white shadow-[0_18px_45px_rgba(84,60,14,0.08)]">
            <CardContent className="p-0">
              {waHref ? (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 rounded-[24px] p-5 transition-colors hover:bg-[#f9f5ee]"
                >
                  <div className="shrink-0 rounded-full bg-[#edf7f1] p-3 text-[#2d7a50]">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[#21180f]">Fale com o restaurante</p>
                    <p className="text-sm text-[#8b7d69]">WhatsApp: {whatsapp}</p>
                  </div>
                </a>
              ) : (
                <div className="flex items-center gap-4 p-5">
                  <div className="shrink-0 rounded-full bg-[#edf7f1] p-3 text-[#2d7a50]">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[#21180f]">Fale com o restaurante</p>
                    <p className="text-sm text-[#8b7d69]">{whatsapp}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
