"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CircleDollarSign,
  Receipt,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";

import { DSCard, DSEmpty } from "@/components/system";
import {
  AdminPage,
  AdminHeader,
  AdminHeaderContent,
  AdminHeaderTitle,
  AdminHeaderDescription,
  AdminHeaderActions,
  AdminLivePulse,
} from "@/components/layout";
import type { DashboardOverviewData } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

// ── Helpers (lógica preservada integralmente) ──────────────────────────────────

function formatChange(
  current: number,
  previous: number,
  positiveSuffix: string,
  neutralSuffix = "estavel"
) {
  if (previous <= 0 && current <= 0) return neutralSuffix;
  if (previous <= 0 && current > 0) return positiveSuffix;
  const delta = ((current - previous) / previous) * 100;
  if (Math.abs(delta) < 0.5) return neutralSuffix;
  const signal = delta > 0 ? "+" : "";
  return `${signal}${delta.toFixed(0)}% vs período anterior`;
}

// Smooth cubic-bezier path (midpoint algorithm) for premium line charts
function buildSmoothPath(
  values: number[],
  vw = 320,
  vh = 100,
  padX = 6,
  padY = 10
): { line: string; area: string } {
  if (values.length === 0) return { line: `M ${padX} ${vh / 2}`, area: "" };
  if (values.length === 1) {
    return {
      line: `M ${padX} ${padY + (vh - padY * 2) / 2}`,
      area: "",
    };
  }
  const mx = Math.max(...values, 1);
  const pts = values.map((v, i) => ({
    x: padX + (i / (values.length - 1)) * (vw - padX * 2),
    y: padY + (1 - v / mx) * (vh - padY * 2 - 4),
  }));

  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1];
    const c = pts[i];
    const cpX = ((p.x + c.x) / 2).toFixed(2);
    d += ` C ${cpX} ${p.y.toFixed(2)}, ${cpX} ${c.y.toFixed(2)}, ${c.x.toFixed(2)} ${c.y.toFixed(2)}`;
  }

  const last = pts[pts.length - 1];
  const first = pts[0];
  const floor = (vh - 1).toFixed(2);
  const area = `${d} L ${last.x.toFixed(2)} ${floor} L ${first.x.toFixed(2)} ${floor} Z`;
  return { line: d, area };
}

// ── DashboardOverview ─────────────────────────────────────────────────────────

export function DashboardOverview({ data }: { data: DashboardOverviewData }) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  // ── Computed values (lógica preservada) ──────────────────────────────────

  const maxBarValue = Math.max(...data.dailyRevenue.map((p) => p.total), 1);
  const topChannel = [...data.channels].sort((a, b) => b.share - a.share)[0];
  const totalShare = data.channels.reduce((s, c) => s + c.share, 0);
  const maxItemRevenue = Math.max(...data.topItems.map((i) => i.revenue), 1);

  const channelSegments = (() => {
    const palette = {
      mesa:     "#f4c35a",
      delivery: "#60a5fa",
      retirada: "#a78bfa",
    } as const;
    let offset = 0;
    const segments = data.channels.map((channel) => {
      const start = offset;
      const size = (channel.share / Math.max(totalShare, 1)) * 100;
      offset += size;
      return `${palette[channel.key]} ${start}% ${offset}%`;
    });
    return segments.length
      ? segments.join(", ")
      : "var(--admin-panel-border) 0 100%";
  })();

  const channelDotColor = {
    mesa:     "#f4c35a",
    delivery: "#60a5fa",
    retirada: "#a78bfa",
  } as const;

  const sparkVals = data.dailyRevenue.map((p) => p.total);
  const sparkChart = { width: 320, height: 128, padX: 8, padY: 14 };
  const { line: sparkLine, area: sparkArea } = buildSmoothPath(
    sparkVals,
    sparkChart.width,
    sparkChart.height,
    sparkChart.padX,
    sparkChart.padY
  );
  const hoveredSparkIndex =
    hoveredBar !== null && sparkVals.length ? Math.min(hoveredBar, sparkVals.length - 1) : null;
  const hoveredSparkValue = hoveredSparkIndex !== null ? sparkVals[hoveredSparkIndex] : null;
  const hoveredSparkMax = Math.max(...sparkVals, 1);
  const hoveredSparkX =
    hoveredSparkIndex !== null
      ? sparkChart.padX +
        (hoveredSparkIndex / Math.max(sparkVals.length - 1, 1)) *
          (sparkChart.width - sparkChart.padX * 2)
      : null;
  const hoveredSparkY =
    hoveredSparkIndex !== null && hoveredSparkValue !== null
      ? sparkChart.padY +
        (1 - hoveredSparkValue / hoveredSparkMax) *
          (sparkChart.height - sparkChart.padY * 2 - 4)
      : null;
  const hoveredSparkLeft = hoveredSparkX !== null ? (hoveredSparkX / sparkChart.width) * 100 : 0;

  const revenueNote = formatChange(
    data.currentRevenue,
    data.previousRevenue,
    "Primeiro período com vendas",
    "Sem variação relevante"
  );
  const ordersNote = formatChange(
    data.currentOrdersCount,
    data.previousOrdersCount,
    "Novos pedidos entrando",
    "Fluxo estável"
  );
  const ticketNote = formatChange(
    data.currentAverageTicket,
    data.previousAverageTicket,
    "Ticket em alta",
    "Ticket estável"
  );

  // Hovered bar info for header preview
  const hoveredPoint = hoveredBar !== null ? data.dailyRevenue[hoveredBar] : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AdminPage gap="default">

      {/* ─── 0. Page header ──────────────────────────────────────────────────── */}
      <AdminHeader>
        <AdminHeaderContent>
          <AdminHeaderTitle>Visão geral</AdminHeaderTitle>
          <AdminHeaderDescription>
            Resumo financeiro e operacional dos últimos 30 dias
          </AdminHeaderDescription>
        </AdminHeaderContent>
        <AdminHeaderActions>
          <AdminLivePulse label="Operação ativa" status="active" />
        </AdminHeaderActions>
      </AdminHeader>

      {/* ─── 1. KPI strip ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">

        {/* Hoje — dominant */}
        <div className="relative col-span-2 overflow-hidden rounded-ds-xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] p-5 shadow-soft xl:col-span-1">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-gold/60 to-transparent" />
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-admin-fg-faint">
              Faturamento hoje
            </p>
            <div className="rounded-ds-sm bg-brand-gold/10 p-1.5 ring-1 ring-brand-gold/20">
              <CircleDollarSign className="h-3.5 w-3.5 text-brand-gold" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums text-brand-gold 2xl:text-4xl">
            {formatCurrency(data.todayRevenue)}
          </p>
          <p className="mt-1.5 text-xs text-admin-fg-faint">
            {data.pendingOrdersCount > 0
              ? `${data.pendingOrdersCount} pedido${data.pendingOrdersCount !== 1 ? "s" : ""} em andamento`
              : "Nenhum pedido em andamento"}
          </p>
        </div>

        {/* 30d — faturamento */}
        <div className="relative overflow-hidden rounded-ds-xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] p-5 shadow-soft">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-admin-fg-faint">
              Faturamento
            </p>
            <TrendingUp className="h-3.5 w-3.5 text-admin-fg-faint" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight tabular-nums text-admin-fg">
            {formatCurrency(data.currentRevenue)}
          </p>
          <p className="mt-1.5 text-xs text-status-success-fg">{revenueNote}</p>
        </div>

        {/* 30d — pedidos */}
        <div className="relative overflow-hidden rounded-ds-xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] p-5 shadow-soft">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-admin-fg-faint">
              Pedidos
            </p>
            <ShoppingBag className="h-3.5 w-3.5 text-admin-fg-faint" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight tabular-nums text-admin-fg">
            {data.currentOrdersCount}
          </p>
          <p className="mt-1.5 text-xs text-status-success-fg">{ordersNote}</p>
        </div>

        {/* 30d — ticket médio */}
        <div className="relative overflow-hidden rounded-ds-xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] p-5 shadow-soft">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-admin-fg-faint">
              Ticket médio
            </p>
            <Receipt className="h-3.5 w-3.5 text-admin-fg-faint" />
          </div>
          <p className="mt-3 text-2xl font-bold tracking-tight tabular-nums text-admin-fg">
            {formatCurrency(data.currentAverageTicket)}
          </p>
          <p className="mt-1.5 text-xs text-status-success-fg">{ticketNote}</p>
        </div>
      </div>

      {/* ─── 3. Dominant chart + sidebar ─────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_296px] 2xl:grid-cols-[minmax(0,1fr)_328px]">

        {/* 3a. Chart block — dominant */}
        <DSCard variant="admin-panel" className="overflow-hidden shadow-panel">

          {/* Chart header — shows hover value inline */}
          <div className="flex items-start justify-between gap-4 border-b border-[var(--admin-panel-header-border)] bg-[var(--admin-panel-header-bg)] px-6 py-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-admin-fg-faint">
                Faturamento por dia
              </p>
              {hoveredPoint ? (
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="text-sm font-bold tabular-nums text-admin-fg">
                    {formatCurrency(hoveredPoint.total)}
                  </p>
                  <p className="text-xs text-admin-fg-faint">{hoveredPoint.label}</p>
                </div>
              ) : (
                <p className="mt-1 text-sm font-medium text-admin-fg-secondary">
                  Distribuição diária dos últimos 30 dias
                </p>
              )}
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 rounded-ds-md border border-admin-border-strong bg-admin-elevated px-3 py-1.5 text-xs font-medium text-admin-fg-secondary">
              30 dias
            </span>
          </div>

          {/* ── Bar chart ── */}
          <div className="px-5 pb-0 pt-7 2xl:px-7 2xl:pt-9">
            {data.dailyRevenue.length ? (
              <div className="relative overflow-hidden rounded-ds-xl border border-admin-border-faint bg-admin-elevated/60 px-4 pt-5 shadow-soft animate-motion-slide-up">

                {/* Gridlines */}
                <div className="pointer-events-none absolute inset-x-4 top-5 flex h-[284px] flex-col justify-between 2xl:h-[324px]">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-full border-t border-admin-border-faint/30"
                    />
                  ))}
                </div>

                {/* Bars */}
                <div
                  className="relative z-10 flex h-[284px] items-end gap-1.5 2xl:h-[324px] 2xl:gap-2"
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {data.dailyRevenue.map((point, index) => {
                    const pct = maxBarValue > 0 ? point.total / maxBarValue : 0;
                    const isMax = point.total === maxBarValue && point.total > 0;
                    const hasValue = point.total > 0;
                    const isHov = hoveredBar === index;
                    const isActive = isMax || isHov;

                    const barH = hasValue ? Math.max(10, pct * 258) : 3;

                    const gradActive =
                      "linear-gradient(to bottom, rgba(255,222,112,1) 0%, rgba(244,195,90,0.97) 40%, rgba(185,130,14,0.90) 100%)";
                    const gradMuted = "var(--admin-bar-inactive)";
                    const gradZero = "var(--admin-bar-empty)";

                    const bg = isActive
                      ? gradActive
                      : hasValue
                        ? gradMuted
                        : gradZero;

                    return (
                      <div
                        key={point.label}
                        className="group relative flex flex-1 cursor-default flex-col items-center justify-end animate-motion-slide-up"
                        onMouseEnter={() => setHoveredBar(index)}
                        style={{ animationDelay: `${index * 12}ms` }}
                      >
                        <div
                          className={`relative w-full overflow-hidden rounded-t transition-all duration-motion-fast ease-motion-in-out ${
                            isActive && hasValue
                              ? "ring-1 ring-brand-gold/25"
                              : "ring-0"
                          }`}
                          style={{
                            height: `${barH}px`,
                            background: bg,
                            filter: isHov && hasValue ? "brightness(1.18)" : isActive ? "brightness(1.08)" : "brightness(1)",
                            transform: isHov && hasValue ? "scaleY(1.045)" : "scaleY(1)",
                            transformOrigin: "bottom",
                          }}
                        >
                          <span className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/30 to-transparent opacity-0 transition-opacity duration-motion-fast group-hover:opacity-100" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Baseline */}
                <div className="relative z-10 border-t border-admin-border-faint/60" />

                {/* X-axis labels */}
                <div className="relative z-10 mt-3 flex pb-5 2xl:pb-7">
                  {data.dailyRevenue.map((point, index) => {
                    const step = Math.ceil(data.dailyRevenue.length / 8);
                    const show =
                      index % step === 0 || index === data.dailyRevenue.length - 1;
                    return (
                      <div key={point.label} className="flex-1 text-center">
                        {show && (
                          <span
                            className={`text-[9px] tabular-nums transition-colors duration-motion-fast ${
                              hoveredBar === index
                                ? "text-brand-gold"
                                : "text-admin-fg-faint"
                            }`}
                          >
                            {point.label}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex h-[220px] items-center justify-center pb-6">
                <p className="text-sm text-admin-fg-faint">Sem dados de faturamento</p>
              </div>
            )}
          </div>

          {/* ── Curva acumulada — smooth bezier sparkline ── */}
          <div className="border-t border-[var(--admin-panel-header-border)] bg-[var(--admin-panel-header-bg)] px-6 py-6">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-admin-fg-faint">
                  Curva acumulada
                </p>
                <p className="mt-0.5 text-[10px] tabular-nums text-admin-fg-faint/60">
                  {data.dailyRevenue[0]?.label ?? "—"}{" "}
                  →{" "}
                  {data.dailyRevenue[data.dailyRevenue.length - 1]?.label ?? "—"}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-[2px] w-6 rounded-full bg-brand-gold/70" />
                <span className="text-[10px] text-admin-fg-faint">Receita</span>
              </div>
            </div>

            <div
              className="relative overflow-hidden rounded-ds-xl border border-admin-border-faint bg-admin-elevated/70 shadow-soft animate-motion-slide-up"
              onMouseMove={(event) => {
                if (!data.dailyRevenue.length) return;
                const rect = event.currentTarget.getBoundingClientRect();
                const ratio = Math.min(Math.max((event.clientX - rect.left) / Math.max(rect.width, 1), 0), 1);
                setHoveredBar(Math.round(ratio * (data.dailyRevenue.length - 1)));
              }}
              onMouseLeave={() => setHoveredBar(null)}
            >
              {hoveredSparkIndex !== null && hoveredSparkValue !== null && (
                <div
                  className="pointer-events-none absolute top-3 z-20 -translate-x-1/2 rounded-ds-md border border-admin-border-strong bg-admin-shell px-3 py-2 shadow-panel"
                  style={{ left: `${hoveredSparkLeft}%` }}
                >
                  <p className="text-[10px] uppercase tracking-[0.14em] text-admin-fg-faint">
                    {data.dailyRevenue[hoveredSparkIndex]?.label}
                  </p>
                  <p className="mt-0.5 text-xs font-bold tabular-nums text-brand-gold">
                    {formatCurrency(hoveredSparkValue)}
                  </p>
                </div>
              )}
              <svg
                viewBox={`0 0 ${sparkChart.width} ${sparkChart.height}`}
                className="h-[118px] w-full"
                preserveAspectRatio="none"
              >
                <defs>
                  {/* Gradient fill under line */}
                  <linearGradient id="dboAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f4c35a" stopOpacity="0.34" />
                    <stop offset="58%" stopColor="#f4c35a" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#f4c35a" stopOpacity="0" />
                  </linearGradient>
                  {/* Glow filter for line */}
                  <filter id="dboLineGlow" x="-20%" y="-80%" width="140%" height="260%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {[0, 1, 2].map((line) => (
                  <line
                    key={line}
                    x1={0}
                    x2={sparkChart.width}
                    y1={sparkChart.padY + line * ((sparkChart.height - sparkChart.padY * 2) / 2)}
                    y2={sparkChart.padY + line * ((sparkChart.height - sparkChart.padY * 2) / 2)}
                    stroke="var(--admin-panel-border)"
                    strokeOpacity="0.35"
                    strokeWidth="1"
                  />
                ))}

                {/* Area fill */}
                {sparkArea && (
                  <path d={sparkArea} fill="url(#dboAreaGrad)" opacity="0">
                    <animate attributeName="opacity" from="0" to="1" dur="280ms" fill="freeze" />
                  </path>
                )}

                {/* Glow layer — blurred duplicate behind main line */}
                {sparkLine && (
                  <path
                    d={sparkLine}
                    fill="none"
                    stroke="#f4c35a"
                    strokeWidth="7"
                    strokeOpacity="0.24"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#dboLineGlow)"
                  />
                )}

                {/* Main line — crisp, thicker stroke */}
                {sparkLine && (
                  <path
                    d={sparkLine}
                    fill="none"
                    stroke="#f4c35a"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pathLength={1}
                    strokeDasharray={1}
                    strokeDashoffset={1}
                  >
                    <animate attributeName="stroke-dashoffset" from="1" to="0" dur="700ms" fill="freeze" />
                  </path>
                )}

                {hoveredSparkX !== null && hoveredSparkY !== null && (
                  <g>
                    <line
                      x1={hoveredSparkX}
                      x2={hoveredSparkX}
                      y1={sparkChart.padY}
                      y2={sparkChart.height - sparkChart.padY}
                      stroke="#f4c35a"
                      strokeOpacity="0.22"
                      strokeWidth="1"
                    />
                    <circle cx={hoveredSparkX} cy={hoveredSparkY} r="7" fill="#f4c35a" opacity="0.18" />
                    <circle cx={hoveredSparkX} cy={hoveredSparkY} r="3.2" fill="#f4c35a" />
                    <circle cx={hoveredSparkX} cy={hoveredSparkY} r="1.4" fill="var(--admin-title)" />
                  </g>
                )}
              </svg>
            </div>
          </div>
        </DSCard>

        {/* 3b. Sidebar — channels + quick actions */}
        <div className="flex flex-col gap-4">

          {/* Canais de venda */}
          <DSCard variant="admin-panel" className="overflow-hidden shadow-soft">
            <div className="border-b border-[var(--admin-panel-header-border)] bg-[var(--admin-panel-header-bg)] px-5 py-4">
              <p className="text-sm font-semibold text-admin-fg">Canais de venda</p>
              <p className="mt-0.5 text-xs text-admin-fg-faint">Últimos 30 dias</p>
            </div>

            <div className="p-5">
              {/* Donut */}
              <div className="mb-5 flex items-center justify-center">
                <div
                  className="relative flex h-28 w-28 items-center justify-center rounded-full p-2 shadow-panel transition-transform duration-motion-fast hover:scale-105"
                  style={{
                    background: `conic-gradient(${channelSegments})`,
                  }}
                >
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-full border border-admin-border-faint bg-admin-elevated text-center shadow-soft">
                    <p className="text-base font-bold tabular-nums text-admin-fg">
                      {Math.round((topChannel?.share ?? 0) * 100)}%
                    </p>
                    <p className="text-[9px] text-admin-fg-muted">{topChannel?.label ?? "—"}</p>
                  </div>
                </div>
              </div>

              {/* Channel rows */}
              {data.channels.length ? (
                <div className="space-y-1.5">
                  {data.channels.map((channel) => (
                    <div
                      key={channel.key}
                      className="flex items-center justify-between rounded-ds-md px-3 py-2.5 transition-colors hover:bg-admin-surface/60"
                    >
                      <span className="flex items-center gap-2 text-sm text-admin-fg-secondary">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: channelDotColor[channel.key] }}
                        />
                        {channel.label}
                      </span>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs text-admin-fg-faint">{channel.count}p</span>
                        <span className="min-w-[2.5rem] text-right text-sm font-bold tabular-nums text-admin-fg">
                          {Math.round(channel.share * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <DSEmpty context="orders" size="sm" title="Sem dados de canais" />
              )}
            </div>
          </DSCard>

          {/* Quick stats */}
          <DSCard variant="admin-panel" className="overflow-hidden shadow-soft">
            <div className="divide-y divide-admin-border-faint">
              <div className="flex items-center justify-between px-5 py-3.5">
                <p className="text-sm text-admin-fg-secondary">Em andamento</p>
                <p className="text-lg font-bold tabular-nums text-admin-fg">
                  {data.pendingOrdersCount}
                </p>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <p className="text-sm text-admin-fg-secondary">Mesas fechadas hoje</p>
                <p className="text-lg font-bold tabular-nums text-admin-fg">
                  {data.todayClosedTables}
                </p>
              </div>
            </div>
          </DSCard>

          {/* CTAs */}
          <div className="space-y-2">
            <Link
              href="/admin/caixa"
              className="flex items-center justify-between rounded-ds-lg border border-status-success-border bg-status-success-bg px-4 py-4 transition-opacity hover:opacity-90"
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-status-success-fg">
                  Caixa
                </p>
                <p className="mt-0.5 text-sm font-semibold text-status-success-text">Fechar caixa</p>
              </div>
              <ArrowRight className="h-4 w-4 text-status-success-fg" />
            </Link>
            <Link
              href="/admin/pedidos"
              className="flex items-center justify-between rounded-ds-lg border border-status-warning-border bg-status-warning-bg px-4 py-4 transition-opacity hover:opacity-90"
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-status-warning-fg">
                  Pedidos
                </p>
                <p className="mt-0.5 text-sm font-semibold text-status-warning-text">Ver todos os pedidos</p>
              </div>
              <ArrowRight className="h-4 w-4 text-brand-gold" />
            </Link>
          </div>
        </div>
      </div>

      {/* ─── 4. Products table — full width, premium ─────────────────────────── */}
      <DSCard variant="admin-panel" className="overflow-hidden shadow-soft">

        {/* Table header */}
        <div className="flex items-center justify-between border-b border-[var(--admin-panel-header-border)] bg-[var(--admin-panel-header-bg)] px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-admin-fg">Produtos mais vendidos</p>
            <p className="mt-0.5 text-xs text-admin-fg-faint">
              Por volume e faturamento — últimos 30 dias
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-ds-md border border-admin-border-strong bg-admin-elevated px-3 py-1.5 text-xs font-medium text-admin-fg-secondary">
            30 dias
          </span>
        </div>

        {data.topItems.length ? (
          <>
            {/* Column headers */}
            <div className="grid grid-cols-[2rem_minmax(0,1fr)_180px_120px_64px] items-center gap-4 border-b border-admin-border-faint bg-admin-surface/40 px-6 py-3">
              <span />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-admin-fg-faint">
                Produto
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-admin-fg-faint">
                Participação
              </span>
              <span className="text-right text-[10px] font-bold uppercase tracking-[0.18em] text-admin-fg-faint">
                Faturamento
              </span>
              <span className="text-right text-[10px] font-bold uppercase tracking-[0.18em] text-admin-fg-faint">
                Qtd.
              </span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-admin-border-faint">
              {data.topItems.map((item, index) => {
                const shareWidth = (item.revenue / maxItemRevenue) * 100;
                const isTop = index === 0;
                return (
                  <div
                    key={item.name}
                    className="grid grid-cols-[2rem_minmax(0,1fr)_180px_120px_64px] items-center gap-4 px-6 py-4 transition-colors duration-motion-fast hover:bg-admin-surface/50"
                  >
                    {/* Rank */}
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-ds-md text-[11px] font-bold tabular-nums ring-1 ${
                        isTop
                          ? "bg-brand-gold/15 text-brand-gold ring-brand-gold/30"
                          : "bg-admin-elevated text-admin-fg-faint ring-admin-border-faint"
                      }`}
                    >
                      {index + 1}
                    </span>

                    {/* Nome */}
                    <span
                      className={`truncate text-sm ${
                        isTop
                          ? "font-semibold text-admin-fg"
                          : "font-medium text-admin-fg-secondary"
                      }`}
                    >
                      {item.name}
                    </span>

                    {/* Barra de participação */}
                    <div className="flex items-center gap-2.5">
                      <div className="h-2 flex-1 overflow-hidden rounded-full border border-admin-border-faint bg-admin-elevated shadow-soft">
                        <div
                          className={`h-full rounded-full transition-all duration-motion-default ${
                            isTop
                              ? "bg-gradient-to-r from-brand-gold to-brand-purple shadow-soft"
                              : "bg-gradient-to-r from-admin-fg-faint/50 to-admin-fg-faint/20"
                          }`}
                          style={{ width: `${shareWidth}%` }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right text-xs tabular-nums text-admin-fg-faint">
                        {Math.round(shareWidth)}%
                      </span>
                    </div>

                    {/* Faturamento */}
                    <span
                      className={`text-right text-sm tabular-nums ${
                        isTop ? "font-bold text-admin-fg" : "font-semibold text-admin-fg-secondary"
                      }`}
                    >
                      {formatCurrency(item.revenue)}
                    </span>

                    {/* Quantidade */}
                    <span className="text-right text-sm tabular-nums text-admin-fg-faint">
                      {item.quantity}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Table footer — resumo */}
            <div className="flex items-center justify-between border-t border-[var(--admin-panel-header-border)] bg-[var(--admin-panel-header-bg)] px-6 py-4">
              <p className="text-xs text-admin-fg-faint">
                {data.topItems.length} produto{data.topItems.length !== 1 ? "s" : ""} listados
              </p>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-admin-fg-faint">
                    Total no período
                  </p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-admin-fg">
                    {formatCurrency(data.currentRevenue)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-admin-fg-faint">
                    Pedidos
                  </p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-admin-fg">
                    {data.currentOrdersCount}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-admin-fg-faint">
                    Ticket médio
                  </p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-admin-fg">
                    {formatCurrency(data.currentAverageTicket)}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="px-6 py-16">
            <DSEmpty context="products" size="sm" title="Sem dados de vendas ainda" />
          </div>
        )}
      </DSCard>
    </AdminPage>
  );
}
