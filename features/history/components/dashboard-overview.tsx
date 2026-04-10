import Link from "next/link";
import { ArrowUpRight, CalendarDays, CircleDollarSign, ReceiptText, ShoppingBag, Store } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardOverviewData } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

function formatChange(current: number, previous: number, positiveSuffix: string, neutralSuffix = "estavel") {
  if (previous <= 0 && current <= 0) {
    return neutralSuffix;
  }

  if (previous <= 0 && current > 0) {
    return positiveSuffix;
  }

  const delta = ((current - previous) / previous) * 100;
  if (Math.abs(delta) < 0.5) {
    return neutralSuffix;
  }

  const signal = delta > 0 ? "+" : "";
  return `${signal}${delta.toFixed(0)}% vs periodo anterior`;
}

function buildLinePath(values: number[]) {
  const width = 320;
  const height = 220;
  const max = Math.max(...values, 1);
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * (width - 20) + 10;
      const y = height - (value / max) * 170 - 20;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

export function DashboardOverview({ data }: { data: DashboardOverviewData }) {
  const referenceDate = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(data.generatedAt));

  const metrics = [
    {
      label: "Faturamento",
      value: formatCurrency(data.currentRevenue),
      note: formatChange(data.currentRevenue, data.previousRevenue, "Primeiro periodo com vendas", "Sem variacao relevante"),
      icon: CircleDollarSign
    },
    {
      label: "Pedidos",
      value: String(data.currentOrdersCount),
      note: formatChange(data.currentOrdersCount, data.previousOrdersCount, "Novos pedidos entrando", "Fluxo estavel"),
      icon: ShoppingBag
    },
    {
      label: "Ticket Medio",
      value: formatCurrency(data.currentAverageTicket),
      note: formatChange(data.currentAverageTicket, data.previousAverageTicket, "Ticket em alta", "Ticket estavel"),
      icon: Store
    }
  ];

  const maxBarValue = Math.max(...data.dailyRevenue.map((point) => point.total), 1);
  const topChannel = [...data.channels].sort((left, right) => right.share - left.share)[0];
  const totalShare = data.channels.reduce((sum, channel) => sum + channel.share, 0);
  const channelSegments = (() => {
    const palette = {
      mesa: "#f4c35a",
      delivery: "#2f89ff",
      retirada: "#8ce3b0"
    } as const;

    let offset = 0;
    const segments = data.channels.map((channel) => {
      const start = offset;
      const size = (channel.share / Math.max(totalShare, 1)) * 100;
      offset += size;
      return `${palette[channel.key]} ${start}% ${offset}%`;
    });

    return segments.length ? segments.join(", ") : "#2a2a2a 0 100%";
  })();

  const linePath = buildLinePath(data.dailyRevenue.map((point) => point.total));

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_380px]">
      <div className="flex h-full flex-col gap-5">
        <Card className="overflow-hidden border-[#2a2a2a] bg-[#171717] admin-dashboard-shell-card">
          <div className="grid gap-5 p-5 xl:grid-cols-[320px_minmax(0,1fr)]">
            <div className="rounded-[28px] border border-[#262626] bg-[#121212] p-5 admin-dashboard-dark-block">
              <p className="text-sm text-[#9f998e]">{referenceDate}</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">Boas vindas, {data.storeName}</h1>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2a1d08] font-black text-[#f4c35a]">
                  CS
                </div>
                <div>
                  <p className="font-medium text-white">Loja principal</p>
                  <p className="text-sm text-[#989284]">Painel em tempo real</p>
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <Link href="/menu" className="rounded-xl border border-[#313131] px-4 py-2 text-sm text-[#e2dccf]">
                  Link da loja
                </Link>
                <Link href="/menu?mesa=7" className="rounded-xl border border-[#313131] px-4 py-2 text-sm text-[#e2dccf]">
                  Acessar loja
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] bg-[linear-gradient(135deg,#1c2533_0%,#27415e_35%,#4d89cf_100%)] p-6 text-white admin-dashboard-hero">
              <p className="text-sm uppercase tracking-[0.28em] text-white/70">{data.storeName}</p>
              <h2 className="mt-3 max-w-xl text-4xl font-semibold leading-tight">
                Operacao viva, com leitura real de pedidos, faturamento e fechamento do restaurante.
              </h2>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Badge className="border-white/10 bg-white/10 px-3 py-1 text-white">
                  {data.pendingOrdersCount} em andamento
                </Badge>
                <Badge className="border-white/10 bg-white/10 px-3 py-1 text-white">
                  {data.todayClosedTables} mesas fechadas hoje
                </Badge>
                <Badge className="border-white/10 bg-white/10 px-3 py-1 text-white">
                  {formatCurrency(data.todayRevenue)} hoje
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-[#2a2a2a] bg-[#171717] admin-dashboard-shell-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white">Visao geral</CardTitle>
              <p className="mt-1 text-sm text-[#969183]">Resumo operacional real dos ultimos 30 dias</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-[#313131] px-4 py-2 text-sm text-[#ddd6ca]">
              <CalendarDays className="h-4 w-4" />
              Ultimos 30 dias
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              {metrics.map((metric) => {
                const Icon = metric.icon;

                return (
                  <div key={metric.label} className="rounded-[24px] border border-[#2b2b2b] bg-[#121212] p-5 admin-dashboard-dark-block">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-[#969183]">{metric.label}</p>
                      <Icon className="h-4 w-4 text-[#f4c35a]" />
                    </div>
                    <p className="mt-3 text-3xl font-semibold text-white">{metric.value}</p>
                    <p className="mt-2 text-sm text-[#8fd7a6]">{metric.note}</p>
                  </div>
                );
              })}
            </div>

            <div className="admin-dashboard-chart rounded-[26px] border border-[#2a2a2a] bg-[#111111] p-5 admin-dashboard-dark-block">
              <div className="flex h-[280px] items-end gap-3">
                {data.dailyRevenue.map((point) => (
                  <div key={point.label} className="flex flex-1 flex-col items-center gap-3">
                    <div
                      className="w-full rounded-t-2xl bg-[linear-gradient(180deg,#7b5cff_0%,#3b82f6_100%)]"
                      style={{ height: `${Math.max(12, (point.total / maxBarValue) * 168)}px` }}
                    />
                    <span className="text-xs text-[#777265]">{point.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#2a2a2a] bg-[#171717] admin-dashboard-shell-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Desempenho de itens</CardTitle>
            <div className="inline-flex items-center gap-2 rounded-xl border border-[#313131] px-4 py-2 text-sm text-[#ddd6ca]">
              Ultimos 30 dias
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-[24px] border border-[#2a2a2a] bg-[#111111] admin-dashboard-dark-block">
              <div className="grid grid-cols-[minmax(0,1fr)_140px_100px] border-b border-[#2a2a2a] px-5 py-4 text-sm text-[#918b80]">
                <span>Produtos</span>
                <span>Valor</span>
                <span>Quant.</span>
              </div>
              {data.topItems.length ? (
                data.topItems.map((item) => (
                  <div
                    key={item.name}
                    className="grid grid-cols-[minmax(0,1fr)_140px_100px] px-5 py-4 text-sm text-[#e9e3d8] not-last:border-b not-last:border-[#1e1e1e]"
                  >
                    <span>{item.name}</span>
                    <span>{formatCurrency(item.revenue)}</span>
                    <span>{item.quantity}</span>
                  </div>
                ))
              ) : (
                <div className="px-5 py-6 text-sm text-[#9d978b]">Ainda nao ha itens vendidos suficientes para analise.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex h-full flex-col gap-5">
        <Card className="border-[#2a2a2a] bg-[#171717] admin-dashboard-shell-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Canais de venda</CardTitle>
            <div className="rounded-xl border border-[#313131] px-3 py-2 text-sm text-[#d8d2c6]">
              Ultimos 30 dias
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div
              className="mx-auto flex h-48 w-48 items-center justify-center rounded-full border-[18px] border-[#2a2a2a]"
              style={{ background: `conic-gradient(${channelSegments})` }}
            >
              <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-[#171717] text-center">
                <p className="text-3xl font-semibold text-white">{Math.round((topChannel?.share ?? 0) * 100)}%</p>
                <p className="text-sm text-[#8f8a7d]">{topChannel?.label ?? "Sem dados"}</p>
              </div>
            </div>
            <div className="space-y-3 text-sm text-[#c8c1b6]">
              {data.channels.map((channel) => (
                <div key={channel.key} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          channel.key === "mesa"
                            ? "#f4c35a"
                            : channel.key === "delivery"
                              ? "#2f89ff"
                              : "#8ce3b0"
                      }}
                    />
                    {channel.label}
                  </span>
                  <span>{Math.round(channel.share * 100)}%</span>
                </div>
              ))}
              <div className="rounded-2xl border border-[#1e526f] bg-[#0b2634] p-4 text-[#89d3f8] admin-dashboard-dark-block">
                Canal lider: {topChannel?.label ?? "Sem dados"} com {topChannel?.count ?? 0} pedidos no periodo.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#2a2a2a] bg-[#171717] admin-dashboard-shell-card">
          <CardHeader>
            <CardTitle className="text-white">Faturamento acumulado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="admin-dashboard-chart relative h-[260px] rounded-[24px] border border-[#2a2a2a] bg-[#111111] p-4 admin-dashboard-dark-block">
              <svg viewBox="0 0 320 220" className="h-full w-full">
                <path d={linePath} fill="none" stroke="#ff7d6d" strokeWidth="4" strokeLinecap="round" />
              </svg>
              <div className="absolute bottom-4 left-4 text-xs text-[#7d776b]">{data.dailyRevenue[0]?.label ?? "--"}</div>
              <div className="absolute bottom-4 right-4 text-xs text-[#7d776b]">
                {data.dailyRevenue[data.dailyRevenue.length - 1]?.label ?? "--"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 border-[#2a2a2a] bg-[#171717] admin-dashboard-shell-card">
          <CardContent className="flex h-full flex-col justify-between space-y-5 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-[#9a9488]">Relatorios</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Fechamento operacional vivo</h3>
                <p className="mt-2 text-sm leading-6 text-[#aaa396]">
                  Hoje o restaurante fechou {data.todayClosedTables} mesas e segue com {data.pendingOrdersCount} pedidos em andamento.
                </p>
              </div>
              <ArrowUpRight className="h-5 w-5 text-[#f4c35a]" />
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] px-4 py-3 admin-dashboard-dark-block">
                <p className="text-xs uppercase tracking-[0.18em] text-[#7d776b]">Caixa de hoje</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-sm text-[#cfc7bb]">Faturamento consolidado</span>
                  <span className="font-semibold text-[#f4c35a]">{formatCurrency(data.todayRevenue)}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] px-4 py-3 admin-dashboard-dark-block">
                <p className="text-xs uppercase tracking-[0.18em] text-[#7d776b]">Fluxo atual</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-sm text-[#cfc7bb]">Pedidos aguardando conclusao</span>
                  <span className="font-semibold text-white">{data.pendingOrdersCount}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/admin/caixa"
                className="flex items-center justify-between rounded-2xl border border-[#2d3f30] bg-[#112016] px-4 py-3 text-[#cfe8d6] transition-colors hover:bg-[#16301f] admin-dashboard-dark-block"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#86c49a]">Caixa</p>
                  <p className="mt-1 font-medium text-white">Ir para fechamento</p>
                </div>
                <CircleDollarSign className="h-5 w-5 text-[#8ce3b0]" />
              </Link>
              <Link
                href="/admin/pedidos"
                className="flex items-center justify-between rounded-2xl border border-[#3f3522] bg-[#1d170d] px-4 py-3 text-[#eadfc9] transition-colors hover:bg-[#2b2110] admin-dashboard-dark-block"
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#d5b56a]">Operacao</p>
                  <p className="mt-1 font-medium text-white">Abrir pedidos</p>
                </div>
                <ReceiptText className="h-5 w-5 text-[#f4c35a]" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
