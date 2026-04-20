"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  CircleDollarSign,
  LayoutDashboard,
  MenuSquare,
  Printer,
  QrCode,
  ReceiptText,
  Settings,
  TableProperties
} from "lucide-react";

import { cn } from "@/lib/utils";

// Sidebar principal do admin.
// Em xl (1280px): colapsada — apenas ícones, 72px de largura.
// Em 2xl (1536px): expandida — ícones + labels, 240px de largura.
// Cada item tem title= para tooltip nativo ao passar o mouse no modo colapsado.
const items = [
  { href: "/admin/pedidos", label: "Gestor de Pedidos", icon: ReceiptText, match: "exact" as const },
  { href: "/admin/pedidos/configuracoes", label: "Fluxo e Alertas", icon: Bell, match: "exact" as const },
  { href: "/admin/configuracoes/impressoras", label: "Impressoras", icon: Printer, match: "exact" as const },
  { href: "/admin/caixa", label: "Caixa", icon: CircleDollarSign, match: "exact" as const },
  { href: "/admin/cardapio", label: "Cardápio", icon: MenuSquare, match: "exact" as const },
  { href: "/admin/mesas", label: "Mesas & QR", icon: TableProperties, match: "exact" as const },
  { href: "/admin/configuracoes", label: "Ajustes Gerais", icon: Settings, match: "exact" as const },
  { href: "/admin/historico", label: "Histórico", icon: BarChart3, match: "prefix" as const },
  { href: "/menu?mesa=7", label: "Ver Cardápio", icon: QrCode, match: "path" as const, pathMatch: "/menu" }
];

export function AdminSidebar() {
  const pathname = usePathname() ?? "";

  const isActive = (
    href: string,
    match: "exact" | "prefix" | "path",
    pathMatch?: string
  ) => {
    if (match === "path") return pathname === pathMatch;
    if (match === "prefix") return pathname === href || pathname.startsWith(`${href}/`);
    return pathname === href;
  };

  return (
    <aside className="admin-sidebar hidden xl:flex xl:w-[72px] 2xl:w-[240px] shrink-0 flex-col border-r border-[var(--admin-sidebar-border)] bg-[var(--admin-sidebar-bg)] py-6">
      <div className="flex flex-1 flex-col gap-8 px-3 2xl:px-5">

        {/* Brand — ícone centrado em xl, wordmark completo em 2xl */}
        <div className="flex items-center justify-center 2xl:justify-start">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--admin-brand-tile-bg)] text-base font-black text-[var(--admin-brand-tile-fg)]">
            CS
          </div>
          <div className="ml-3 hidden 2xl:block">
            <p className="text-sm font-semibold tracking-[0.24em] text-[var(--admin-brand-wordmark)]">CASA DO SHEIK</p>
            <p className="text-xs text-muted-foreground">Sistema de pedidos</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1">
          <Link
            href="/admin"
            title="Início"
            className={cn(
              "flex items-center justify-center gap-3 rounded-2xl py-3 text-sm font-medium transition-colors 2xl:justify-start 2xl:px-4",
              pathname === "/admin"
                ? "border border-[var(--admin-nav-active-border)] bg-[var(--admin-nav-active-bg)] text-[var(--admin-nav-active-fg)]"
                : "text-[var(--admin-nav-fg)] hover:bg-[var(--admin-nav-hover-bg)] hover:text-[var(--admin-nav-hover-fg)]"
            )}
          >
            <LayoutDashboard className="h-5 w-5 shrink-0 2xl:h-4 2xl:w-4" />
            <span className="hidden 2xl:inline">Início</span>
          </Link>

          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.match, item.pathMatch);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={cn(
                  "flex items-center justify-center gap-3 rounded-2xl py-3 text-sm font-medium transition-colors 2xl:justify-start 2xl:px-4",
                  active
                    ? "border border-[var(--admin-nav-active-border)] bg-[var(--admin-nav-active-bg)] text-[var(--admin-nav-active-fg)]"
                    : "text-[var(--admin-nav-fg)] hover:bg-[var(--admin-nav-hover-bg)] hover:text-[var(--admin-nav-hover-fg)]"
                )}
              >
                <Icon className="h-5 w-5 shrink-0 2xl:h-4 2xl:w-4" />
                <span className="hidden 2xl:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
