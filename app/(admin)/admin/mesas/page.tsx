import { headers } from "next/headers";
import { Link2, QrCode, Store, Truck } from "lucide-react";

import { TablesQrManager } from "@/features/tables/components/tables-qr-manager";
import { tableService } from "@/features/tables/services/table.service";
import { Badge } from "@/components/ui/badge";

function getBaseUrl() {
  const headerStore = headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const protocol =
    headerStore.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}

export default async function AdminTablesPage() {
  const baseUrl = getBaseUrl();
  const tables = await tableService.listActiveTables();
  const tableCount = tables.length;
  const entries = [
    ...tables.map((table) => {
      const tableNumber = table.number;
      return {
        id: table.id,
        title: `Mesa ${tableNumber}`,
        subtitle: "Cliente escaneia e faz o pedido direto da mesa.",
        href: `${baseUrl}/menu?mesa=${tableNumber}`,
        mode: "mesa" as const
      };
    }),
    {
      id: "delivery",
      title: "QR Delivery",
      subtitle: "Cliente entra direto no cardapio sem mesa vinculada.",
      href: `${baseUrl}/menu`,
      mode: "delivery" as const
    }
  ];

  return (
    <div className="space-y-6">
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <p className="text-sm text-[#a49f92]">Gerenciamento real de acesso ao cardapio</p>
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#131313] sm:text-4xl dark:text-white">Mesas & QR Codes</h1>
            <p className="text-sm leading-7 text-[#b8b0a4] sm:text-base">
              Cada mesa tem um QR proprio apontando para o cardapio com a mesa ja identificada. O QR de delivery leva o cliente direto para o cardapio geral para atendimento externo, embalagens e divulgacao.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge className="border-[#4a3410] bg-[#21170c] px-3 py-1 text-[#f5c562]">
              <Store className="mr-1 h-3.5 w-3.5" />
              {tableCount} mesas prontas
            </Badge>
            <Badge className="border-[#295779] bg-[#10263c] px-3 py-1 text-[#8fd0ff]">
              <Truck className="mr-1 h-3.5 w-3.5" />1 QR de delivery
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="admin-tables-dark-card rounded-[24px] border border-[#2d2d2d] bg-[linear-gradient(180deg,#191919_0%,#131313_100%)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.18em] text-[#998f82]">Acesso interno</span>
              <QrCode className="h-4 w-4 text-[#f0e7db]" />
            </div>
            <p className="text-3xl font-semibold text-white">{tableCount}</p>
            <p className="mt-2 text-sm leading-6 text-[#a99f92]">Mesas com identificacao pronta para leitura do cliente.</p>
          </div>

          <div className="admin-tables-dark-card rounded-[24px] border border-[#2d2d2d] bg-[linear-gradient(180deg,#191919_0%,#131313_100%)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.18em] text-[#998f82]">Canal externo</span>
              <Truck className="h-4 w-4 text-[#8fd0ff]" />
            </div>
            <p className="text-3xl font-semibold text-white">1</p>
            <p className="mt-2 text-sm leading-6 text-[#a99f92]">QR pronto para delivery, retirada e materiais de divulgacao.</p>
          </div>

          <div className="admin-tables-dark-card rounded-[24px] border border-[#2d2d2d] bg-[linear-gradient(180deg,#191919_0%,#131313_100%)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.18em] text-[#998f82]">Link base</span>
              <Link2 className="h-4 w-4 text-[#d7cdbf]" />
            </div>
            <p className="truncate text-sm font-medium text-white">{baseUrl}/menu</p>
            <p className="mt-2 text-sm leading-6 text-[#a99f92]">Todas as mesas derivam deste endereco com o parametro de identificacao.</p>
          </div>
        </div>
      </section>

      <TablesQrManager entries={entries} />
    </div>
  );
}
