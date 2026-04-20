"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Copy, ExternalLink, Printer, QrCode, Store, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";

// Gerencia a geracao, copia e impressao dos QR Codes de mesas e canais externos.
type QrEntry = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  mode: "mesa" | "delivery";
};

function buildQrImageUrl(href: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(href)}`;
}

export function TablesQrManager({ entries }: { entries: QrEntry[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyLink(href: string, id: string) {
    try {
      await navigator.clipboard.writeText(href);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // Clipboard API indisponível — fallback silencioso
    }
  }

  function printQr(entry: QrEntry) {
    // A impressao abre uma folha isolada para o operador conseguir gerar
    // material fisico de mesa sem depender de estilos do painel.
    const qrUrl = buildQrImageUrl(entry.href);
    const printWindow = window.open("", "_blank", "width=720,height=900");
    if (!printWindow) return;

    printWindow.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>${entry.title}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 32px;
              display: flex;
              justify-content: center;
              background: #ffffff;
              color: #111111;
            }
            .sheet {
              width: 360px;
              border: 2px solid #111111;
              border-radius: 24px;
              padding: 24px;
              text-align: center;
            }
            h1 {
              margin: 0 0 8px;
              font-size: 28px;
            }
            p {
              margin: 0 0 16px;
              color: #444444;
            }
            img {
              width: 280px;
              height: 280px;
              display: block;
              margin: 0 auto 16px;
            }
            .link {
              font-size: 12px;
              word-break: break-all;
              color: #666666;
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <h1>${entry.title}</h1>
            <p>${entry.subtitle}</p>
            <img src="${qrUrl}" alt="${entry.title}" />
            <div class="link">${entry.href}</div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  const deliveryEntry = entries.find((entry) => entry.mode === "delivery");
  const tableEntries = entries.filter((entry) => entry.mode === "mesa");

  return (
    <div className="admin-tables-shell-card grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">

      {/* ── Coluna principal: grade de mesas ── */}
      <div className="overflow-hidden rounded-ds-xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] shadow-soft">

        {/* Cabeçalho da seção */}
        <div className="flex items-center justify-between border-b border-[var(--admin-panel-header-border)] bg-[var(--admin-panel-header-bg)] px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-admin-fg">Mesas configuradas</p>
            <p className="mt-0.5 text-xs text-admin-fg-faint">
              Imprima, copie ou abra o acesso de cada mesa
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-status-success-border/30 bg-status-success-fg/10 px-2.5 py-1 text-xs font-semibold text-status-success-fg">
            <span className="h-1.5 w-1.5 rounded-full bg-status-success-fg" />
            {tableEntries.length} ativas
          </span>
        </div>

        {/* Cabeçalho da tabela */}
        <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)_108px] items-center gap-4 border-b border-admin-border-faint bg-admin-surface/40 px-6 py-3">
          <span />
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-admin-fg-faint">
            Mesa
          </span>
          <span className="hidden text-[10px] font-bold uppercase tracking-[0.18em] text-admin-fg-faint xl:block">
            Link de acesso
          </span>
          <span className="text-right text-[10px] font-bold uppercase tracking-[0.18em] text-admin-fg-faint">
            Ações
          </span>
        </div>

        {/* Linhas */}
        {tableEntries.length ? (
          <div className="divide-y divide-admin-border-faint">
            {tableEntries.map((entry, index) => (
              <div
                key={entry.id}
                className="grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1fr)_108px] items-center gap-4 px-6 py-4 transition-colors duration-motion-fast hover:bg-admin-surface/50"
              >
                {/* Número */}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-ds-md bg-admin-overlay text-[11px] font-bold tabular-nums text-admin-fg-faint ring-1 ring-admin-border-faint">
                  {index + 1}
                </span>

                {/* Nome + status */}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-admin-fg">{entry.title}</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-status-success-fg" />
                    <span className="text-xs text-admin-fg-faint">Ativa</span>
                  </div>
                </div>

                {/* URL */}
                <p className="hidden min-w-0 truncate text-xs text-admin-fg-faint xl:block">
                  {entry.href}
                </p>

                {/* Ações */}
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    title="Imprimir QR"
                    onClick={() => printQr(entry)}
                    className="rounded-ds-md p-2 text-admin-fg-faint transition-colors duration-motion-fast hover:bg-admin-overlay hover:text-admin-fg"
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title={copiedId === entry.id ? "Copiado!" : "Copiar link"}
                    onClick={() => void copyLink(entry.href, entry.id)}
                    className="rounded-ds-md p-2 text-admin-fg-faint transition-colors duration-motion-fast hover:bg-admin-overlay hover:text-admin-fg"
                  >
                    {copiedId === entry.id
                      ? <Check className="h-3.5 w-3.5 text-status-success-fg" />
                      : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    title="Abrir cardápio"
                    onClick={() => window.open(entry.href, "_blank", "noopener,noreferrer")}
                    className="rounded-ds-md p-2 text-admin-fg-faint transition-colors duration-motion-fast hover:bg-admin-overlay hover:text-admin-fg"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-admin-overlay ring-1 ring-admin-border-faint">
              <Store className="h-5 w-5 text-admin-fg-faint" />
            </div>
            <p className="text-sm font-semibold text-admin-fg-secondary">Nenhuma mesa cadastrada</p>
            <p className="mt-1.5 max-w-[220px] text-xs leading-relaxed text-admin-fg-faint">
              Adicione mesas no banco de dados para que os QR codes apareçam aqui.
            </p>
          </div>
        )}

        {/* Footer */}
        {tableEntries.length > 0 && (
          <div className="border-t border-[var(--admin-panel-header-border)] bg-[var(--admin-panel-header-bg)] px-6 py-3">
            <p className="text-xs text-admin-fg-faint">
              Clique em <Printer className="inline h-3 w-3" /> para gerar o QR de impressão individual de cada mesa.
            </p>
          </div>
        )}
      </div>

      {/* ── Sidebar: canal delivery ── */}
      {deliveryEntry ? (
        <div className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-ds-xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] shadow-soft">

            {/* Header */}
            <div className="border-b border-[var(--admin-panel-header-border)] bg-[var(--admin-panel-header-bg)] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-ds-md bg-status-info-fg/10 ring-1 ring-status-info-fg/20">
                  <Truck className="h-3.5 w-3.5 text-status-info-fg" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-admin-fg">QR Delivery</p>
                  <p className="text-xs text-admin-fg-faint">Canal externo</p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <p className="mb-4 text-xs text-admin-fg-faint">
                Use em cartões de balcão, embalagens, flyers e materiais de divulgação para levar o cliente direto ao cardápio.
              </p>

              {/* QR code */}
              <div className="admin-tables-dark-card flex items-center justify-center overflow-hidden rounded-ds-xl border border-dashed border-admin-border-strong bg-admin-surface p-5">
                <Image
                  src={buildQrImageUrl(deliveryEntry.href)}
                  alt={deliveryEntry.title}
                  width={200}
                  height={200}
                  className="rounded-ds-lg"
                  unoptimized
                />
              </div>

              {/* Link */}
              <div className="mt-4 overflow-hidden rounded-ds-lg border border-admin-border-faint bg-admin-surface px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <QrCode className="h-3 w-3 shrink-0 text-admin-fg-faint" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-admin-fg-faint">
                    Link direto
                  </p>
                </div>
                <p className="mt-2 break-all text-xs text-admin-fg-secondary">
                  {deliveryEntry.href}
                </p>
              </div>

              {/* Ações */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-admin-border-strong bg-transparent text-admin-fg hover:bg-admin-overlay"
                  onClick={() => void copyLink(deliveryEntry.href, deliveryEntry.id)}
                >
                  {copiedId === deliveryEntry.id
                    ? <><Check className="h-3.5 w-3.5 text-status-success-fg" /> Copiado</>
                    : <><Copy className="h-3.5 w-3.5" /> Copiar</>}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-admin-border-strong bg-transparent text-admin-fg hover:bg-admin-overlay"
                  onClick={() => window.open(deliveryEntry.href, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Abrir
                </Button>
                <Button
                  variant="admin"
                  size="sm"
                  onClick={() => printQr(deliveryEntry)}
                >
                  <Printer className="h-3.5 w-3.5" />
                  Imprimir
                </Button>
              </div>
            </div>
          </div>

          {/* Info card */}
          <div className="overflow-hidden rounded-ds-xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] shadow-soft">
            <div className="border-b border-[var(--admin-panel-header-border)] bg-[var(--admin-panel-header-bg)] px-5 py-4">
              <p className="text-sm font-semibold text-admin-fg">Como funciona</p>
            </div>
            <ol className="divide-y divide-admin-border-faint">
              {[
                { step: "Mesa", desc: "QR identifica a mesa automaticamente ao escanear." },
                { step: "Delivery", desc: "QR sem mesa — o cliente escolhe o tipo de pedido." },
                { step: "Impressão", desc: "Clique em Imprimir para gerar a folha de mesa física." },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 px-5 py-4">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-admin-overlay text-[10px] font-bold text-admin-fg-faint ring-1 ring-admin-border-faint">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-admin-fg">{item.step}</p>
                    <p className="mt-0.5 text-xs text-admin-fg-muted">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}
    </div>
  );
}
