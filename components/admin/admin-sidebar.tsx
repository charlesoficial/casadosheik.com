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

import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

// Sidebar principal do admin. Cada item tem a propria regra de destaque para
// evitar falsos positivos entre rotas parecidas, como /admin/configuracoes e
// /admin/configuracoes/impressoras.
const items = [
  { href: "/admin/pedidos", label: "Gestor de Pedidos", icon: ReceiptText, match: "exact" as const },
  { href: "/admin/pedidos/configuracoes", label: "Fluxo e Alertas", icon: Bell, match: "exact" as const },
  { href: "/admin/configuracoes/impressoras", label: "Impressoras", icon: Printer, match: "exact" as const },
  { href: "/admin/caixa", label: "Caixa", icon: CircleDollarSign, match: "exact" as const },
  { href: "/admin/cardapio", label: "Cardapio", icon: MenuSquare, match: "exact" as const },
  { href: "/admin/mesas", label: "Mesas & QR", icon: TableProperties, match: "exact" as const },
  { href: "/admin/configuracoes", label: "Ajustes Gerais", icon: Settings, match: "exact" as const },
  { href: "/admin/historico", label: "Historico", icon: BarChart3, match: "prefix" as const },
  { href: "/menu?mesa=7", label: "Ver Cardapio", icon: QrCode, match: "path" as const, pathMatch: "/menu" }
];

export function AdminSidebar() {
  const pathname = usePathname() ?? "";
  const isActive = (
    href: string,
    match: "exact" | "prefix" | "path",
    pathMatch?: string
  ) => {
    if (match === "path") {
      return pathname === pathMatch;
    }

    if (match === "prefix") {
      return pathname === href || pathname.startsWith(`${href}/`);
    }

    return pathname === href;
  };

  return (
    <aside className="admin-sidebar hidden w-[280px] shrink-0 border-r border-[var(--admin-sidebar-border)] bg-[var(--admin-sidebar-bg)] px-5 py-6 xl:block">
      <div className="space-y-8">
        <BrandMark />
        <nav className="space-y-2">
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
              pathname === "/admin"
                ? "border border-[var(--admin-nav-active-border)] bg-[var(--admin-nav-active-bg)] text-[var(--admin-nav-active-fg)]"
                : "text-[var(--admin-nav-fg)] hover:bg-[var(--admin-nav-hover-bg)] hover:text-[var(--admin-nav-hover-fg)]"
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Inicio
          </Link>

          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.match, item.pathMatch);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                  active
                    ? "border border-[var(--admin-nav-active-border)] bg-[var(--admin-nav-active-bg)] text-[var(--admin-nav-active-fg)]"
                    : "text-[var(--admin-nav-fg)] hover:bg-[var(--admin-nav-hover-bg)] hover:text-[var(--admin-nav-hover-fg)]"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
