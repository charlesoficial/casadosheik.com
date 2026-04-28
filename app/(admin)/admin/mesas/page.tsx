import { headers } from "next/headers";
import { Link2, QrCode, Store, Truck } from "lucide-react";

import { TablesQrManager } from "@/features/tables/components/tables-qr-manager";
import { tableService } from "@/features/tables/services/table.service";
import {
  AdminPage,
  AdminHeader,
  AdminHeaderContent,
  AdminHeaderEyebrow,
  AdminHeaderTitle,
  AdminHeaderDescription,
  AdminHeaderActions,
} from "@/components/layout";

async function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  }

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const protocol =
    headerStore.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}

export default async function AdminTablesPage() {
  const [baseUrl, tables] = await Promise.all([getBaseUrl(), tableService.listActiveTables()]);
  const tableCount = tables.length;

  const entries = [
    ...tables.map((table) => ({
      id: table.id,
      title: `Mesa ${table.number}`,
      subtitle: "Cliente escaneia e faz o pedido diretamente da mesa.",
      href: `${baseUrl}/menu?mesa=${table.number}`,
      mode: "mesa" as const,
    })),
    {
      id: "delivery",
      title: "QR Delivery",
      subtitle: "Cliente acessa o cardápio sem mesa vinculada — delivery ou retirada.",
      href: `${baseUrl}/menu`,
      mode: "delivery" as const,
    },
  ];

  return (
    <AdminPage gap="default">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <AdminHeader>
        <AdminHeaderContent>
          <AdminHeaderEyebrow>Acesso ao cardápio</AdminHeaderEyebrow>
          <AdminHeaderTitle>Mesas &amp; QR Codes</AdminHeaderTitle>
          <AdminHeaderDescription>
            Cada mesa tem um QR próprio com identificação automática. O canal de delivery serve para atendimento externo e materiais de divulgação.
          </AdminHeaderDescription>
        </AdminHeaderContent>
        <AdminHeaderActions>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-status-warning-border bg-status-warning-bg px-3 py-1.5 text-xs font-semibold text-status-warning-fg">
            <Store className="h-3 w-3" />
            {tableCount} mesas ativas
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-status-info-border bg-status-info-bg px-3 py-1.5 text-xs font-semibold text-status-info-fg">
            <Truck className="h-3 w-3" />
            1 canal delivery
          </span>
        </AdminHeaderActions>
      </AdminHeader>

      {/* ── KPI strip ────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-ds-xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] shadow-soft">
        <div className="grid grid-cols-3 divide-x divide-admin-border-faint">

          <div className="relative px-6 py-5">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-status-warning-fg/50 to-transparent" />
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-admin-fg-faint">
                Mesas ativas
              </p>
              <div className="rounded-ds-sm bg-status-warning-fg/10 p-1.5 ring-1 ring-status-warning-fg/20">
                <QrCode className="h-3.5 w-3.5 text-status-warning-fg" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums text-admin-fg">{tableCount}</p>
            <p className="mt-1 text-xs text-admin-fg-faint">Com QR configurado</p>
          </div>

          <div className="relative px-6 py-5">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-status-info-fg/50 to-transparent" />
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-admin-fg-faint">
                Canal externo
              </p>
              <div className="rounded-ds-sm bg-status-info-fg/10 p-1.5 ring-1 ring-status-info-fg/20">
                <Truck className="h-3.5 w-3.5 text-status-info-fg" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums text-admin-fg">1</p>
            <p className="mt-1 text-xs text-admin-fg-faint">Delivery e retirada</p>
          </div>

          <div className="relative px-6 py-5">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-admin-fg-faint/30 to-transparent" />
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-admin-fg-faint">
                URL base
              </p>
              <div className="rounded-ds-sm bg-admin-overlay p-1.5 ring-1 ring-admin-border-faint">
                <Link2 className="h-3.5 w-3.5 text-admin-fg-secondary" />
              </div>
            </div>
            <p className="mt-3 truncate text-sm font-semibold text-admin-fg-secondary">
              {baseUrl}/menu
            </p>
            <p className="mt-1 text-xs text-admin-fg-faint">Base de todos os QR codes</p>
          </div>
        </div>
      </div>

      {/* ── Manager ──────────────────────────────────────────────────────── */}
      <TablesQrManager entries={entries} />

    </AdminPage>
  );
}
