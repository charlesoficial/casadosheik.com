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

const steps = [
  { key: "novo", label: "Recebido", icon: Receipt },
  { key: "preparo", label: "Em preparo", icon: ChefHat },
  { key: "pronto", label: "Pronto", icon: CheckCircle2 },
] as const;

const statusOrder = ["novo", "aceito", "preparo", "pronto", "concluido"] as const;
const statusLabels: Record<string, string> = {
  novo: "Recebido",
  aceito: "Aceito",
  preparo: "Em preparo",
  pronto: "Pronto",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

function getStepState(orderStatus: OrderDetail["status"], stepKey: (typeof steps)[number]["key"]) {
  const statusIdx = statusOrder.indexOf(orderStatus as (typeof statusOrder)[number]);
  const stepIdx = statusOrder.indexOf(stepKey as (typeof statusOrder)[number]);
  if (statusIdx === stepIdx) return "current";
  if (statusIdx > stepIdx) return "done";
  return "idle";
}

function OrderMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-menu-border bg-menu-surface p-4">
      <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-menu-accent-bg text-menu-accent-strong">
        {icon}
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-menu-text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-menu-text">{value}</p>
    </div>
  );
}

function StatusSteps({ order }: { order: OrderDetail }) {
  return (
    <div className="grid grid-cols-3 gap-2 lg:gap-3">
      {steps.map((step) => {
        const Icon = step.icon;
        const state = getStepState(order.status, step.key);

        const stateClass =
          state === "current"
            ? "border-menu-accent-border bg-menu-accent-bg text-menu-accent-strong shadow-soft"
            : state === "done"
              ? "border-menu-border bg-menu-surface-soft text-menu-accent-strong"
              : "border-menu-border bg-menu-surface text-menu-text-muted";

        return (
          <div
            key={step.key}
            className={`rounded-2xl border p-4 text-center transition-colors lg:p-5 ${stateClass}`}
          >
            <Icon className="mx-auto mb-2 h-5 w-5" strokeWidth={1.5} />
            <p className={`text-sm ${state === "current" ? "font-semibold" : "font-medium"}`}>
              {step.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function ItemsCard({ order }: { order: OrderDetail }) {
  return (
    <Card className="border-menu-border bg-menu-surface-raised text-menu-text shadow-card">
      <CardHeader className="pb-3">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-menu-accent-strong">
          Conferência
        </p>
        <CardTitle>Itens do pedido</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {order.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-4 rounded-2xl border border-menu-border bg-menu-surface px-4 py-3"
          >
            <div className="min-w-0">
              <p className="font-medium text-menu-text">
                {item.qty}x {item.name}
              </p>
              {item.note ? (
                <Badge className="mt-1 w-fit border-menu-border bg-menu-surface-soft text-menu-text-muted">
                  {item.note}
                </Badge>
              ) : null}
            </div>
            <p className="shrink-0 font-semibold text-menu-accent-strong">
              {formatCurrency(item.qty * item.price)}
            </p>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-menu-border pt-4 text-lg font-semibold">
          <span className="text-menu-text">Total</span>
          <span className="text-menu-accent-strong">{formatCurrency(order.total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ContactCard({ whatsapp, waHref }: { whatsapp?: string | null; waHref: string | null }) {
  if (!whatsapp) return null;

  const content = (
    <>
      <div className="shrink-0 rounded-full bg-status-success-bg p-3 text-status-success-fg">
        <MessageCircle className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-menu-text">Fale com o restaurante</p>
        <p className="text-sm text-menu-text-muted">{waHref ? `WhatsApp: ${whatsapp}` : whatsapp}</p>
      </div>
    </>
  );

  return (
    <Card className="border-menu-border bg-menu-surface-raised text-menu-text shadow-card">
      <CardContent className="p-0">
        {waHref ? (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 rounded-ds-xl p-5 transition-colors hover:bg-menu-surface-soft"
          >
            {content}
          </a>
        ) : (
          <div className="flex items-center gap-4 p-5">{content}</div>
        )}
      </CardContent>
    </Card>
  );
}

export function OrderStatusShell({
  initialOrder,
  whatsapp,
  mesa,
  token,
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

    const interval = window.setInterval(refreshOrder, 12000);
    return () => window.clearInterval(interval);
  }, [order.id, token]);

  return (
    <main className="menu-theme min-h-screen w-full [background:var(--menu-bg-gradient-soft)] pb-8 text-menu-text lg:pb-0">
      <div className="mx-auto max-w-[480px] lg:hidden">
        <CustomerFlowHeader
          eyebrow="Acompanhamento em tempo real"
          title={`Pedido #${String(order.number).padStart(4, "0")}`}
          description="Acompanhe a atualização do seu pedido sem precisar perguntar no caixa."
          leading={
            <button
              type="button"
              aria-label="Voltar ao cardápio"
              onClick={() => router.push(menuHref)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-menu-border bg-menu-surface-raised text-menu-text-muted shadow-soft transition-colors hover:bg-menu-surface-soft"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
            </button>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <OrderMetric
              icon={order.kind === "mesa" ? <Store className="h-4 w-4" strokeWidth={1.5} /> : <Truck className="h-4 w-4" strokeWidth={1.5} />}
              label="Origem"
              value={order.kind === "mesa" ? `Mesa ${order.table ?? "-"}` : "Delivery"}
            />
            <OrderMetric
              icon={<Receipt className="h-4 w-4" strokeWidth={1.5} />}
              label="Valor do pedido"
              value={formatCurrency(order.total)}
            />
          </div>
        </CustomerFlowHeader>

        <div className="space-y-4 px-4 pt-5">
          <Card className="border-menu-border bg-menu-surface-raised text-menu-text shadow-card">
            <CardHeader className="pb-3">
              <CardTitle>Status atual</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusSteps order={order} />
            </CardContent>
          </Card>
          <ItemsCard order={order} />
          <ContactCard whatsapp={whatsapp} waHref={waHref} />
        </div>
      </div>

      <section className="hidden min-h-screen lg:block">
        <header className="sticky top-0 z-30 border-b border-menu-border bg-menu-surface/95 px-8 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-[1640px] items-center justify-between gap-6">
            <button
              type="button"
              onClick={() => router.push(menuHref)}
              className="flex items-center gap-3 rounded-full border border-menu-border bg-menu-surface-raised px-4 py-2 text-sm font-semibold text-menu-text transition-colors hover:bg-menu-surface-soft"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
              Cardápio
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-menu-accent-strong">
                Acompanhamento em tempo real
              </p>
              <h1 className="mt-1 truncate text-2xl font-black text-menu-text">
                Pedido #{String(order.number).padStart(4, "0")}
              </h1>
            </div>
            <Badge className="border-menu-accent-border bg-menu-accent-bg px-4 py-2 text-menu-accent-strong">
              {statusLabels[order.status] ?? order.status}
            </Badge>
          </div>
        </header>

        <div className="mx-auto grid w-full max-w-[1640px] gap-6 px-8 py-8 xl:grid-cols-[380px_minmax(0,1fr)_440px]">
          <aside className="space-y-4">
            <Card className="border-menu-border bg-menu-surface-raised text-menu-text shadow-card">
              <CardContent className="p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-menu-accent-strong">
                  Status atual
                </p>
                <p className="mt-3 text-4xl font-black text-menu-text">
                  {statusLabels[order.status] ?? order.status}
                </p>
                <p className="mt-3 text-sm leading-6 text-menu-text-muted">
                  Esta tela atualiza automaticamente a cada poucos segundos enquanto o pedido anda na cozinha.
                </p>
              </CardContent>
            </Card>

            <OrderMetric
              icon={order.kind === "mesa" ? <Store className="h-4 w-4" strokeWidth={1.5} /> : <Truck className="h-4 w-4" strokeWidth={1.5} />}
              label="Origem"
              value={order.kind === "mesa" ? `Mesa ${order.table ?? "-"}` : "Delivery"}
            />
            <OrderMetric
              icon={<Receipt className="h-4 w-4" strokeWidth={1.5} />}
              label="Valor"
              value={formatCurrency(order.total)}
            />
          </aside>

          <section className="min-w-0 space-y-6">
            <Card className="border-menu-border bg-menu-surface-raised text-menu-text shadow-card">
              <CardHeader>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-menu-accent-strong">
                  Caminho do pedido
                </p>
                <CardTitle>Da confirmação ao prato pronto</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusSteps order={order} />
              </CardContent>
            </Card>

            <Card className="border-menu-border bg-menu-surface-raised text-menu-text shadow-card">
              <CardContent className="grid gap-4 p-6 md:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-menu-text-muted">Cliente</p>
                  <p className="mt-1 font-semibold text-menu-text">{order.customer || "Não informado"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-menu-text-muted">Tipo</p>
                  <p className="mt-1 font-semibold text-menu-text">
                    {order.kind === "mesa" ? `Mesa ${order.table ?? "-"}` : "Delivery"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-menu-text-muted">Atualização</p>
                  <p className="mt-1 font-semibold text-menu-text">Automática</p>
                </div>
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <ItemsCard order={order} />
            <ContactCard whatsapp={whatsapp} waHref={waHref} />
          </aside>
        </div>
      </section>
    </main>
  );
}
