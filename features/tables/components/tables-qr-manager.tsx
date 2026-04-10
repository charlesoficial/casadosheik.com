"use client";

import Image from "next/image";
import { Copy, ExternalLink, Printer, QrCode, Store, Truck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  async function copyLink(href: string) {
    await navigator.clipboard.writeText(href);
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
    <div className="admin-tables-shell-card space-y-6">
      {deliveryEntry ? (
        <Card className="admin-tables-dark-card overflow-hidden border-[#2a2a2a] bg-[linear-gradient(180deg,#171717_0%,#121212_100%)]">
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div className="space-y-2">
              <Badge className="w-fit border-[#295779] bg-[#10263c] text-[#8fd0ff]">
                <Truck className="mr-1 h-3.5 w-3.5" />
                Delivery / Retirada
              </Badge>
              <CardTitle className="text-white">{deliveryEntry.title}</CardTitle>
              <p className="max-w-3xl text-sm leading-6 text-[#b8b0a4]">
                Use este QR em cartoes de balcão, flyers, embalagens e materiais de divulgacao para levar o cliente direto ao cardapio.
              </p>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-[280px_minmax(0,1fr)]">
            <div className="flex items-center justify-center rounded-[28px] border border-dashed border-[#3c3c3c] bg-[#101010] p-5">
              <Image
                src={buildQrImageUrl(deliveryEntry.href)}
                alt={deliveryEntry.title}
                width={240}
                height={240}
                className="rounded-2xl"
                unoptimized
              />
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-[#2f2f2f] bg-[#111111] p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8e877c]">Link direto</p>
                <p className="mt-2 break-all text-sm text-[#ebe4d8]">{deliveryEntry.href}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  className="border-[#313131] bg-transparent text-white hover:bg-[#212121]"
                  onClick={() => void copyLink(deliveryEntry.href)}
                >
                  <Copy className="h-4 w-4" />
                  Copiar link
                </Button>
                <Button
                  variant="outline"
                  className="border-[#313131] bg-transparent text-white hover:bg-[#212121]"
                  onClick={() => window.open(deliveryEntry.href, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir
                </Button>
                <Button variant="admin" onClick={() => printQr(deliveryEntry)}>
                  <Printer className="h-4 w-4" />
                  Imprimir QR
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-[#a59d91]">Grade operacional</p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">QRs das mesas</h2>
          </div>
          <p className="text-sm text-[#968f84]">Imprima, copie ou abra cada acesso individual da operacao.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {tableEntries.map((entry) => (
            <Card
              key={entry.id}
              className="admin-tables-dark-card overflow-hidden border-[#2a2a2a] bg-[linear-gradient(180deg,#171717_0%,#121212_100%)] transition-transform duration-200 hover:-translate-y-0.5"
            >
              <CardHeader className="space-y-3 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#978e82]">Acesso da mesa</p>
                    <CardTitle className="text-white">{entry.title}</CardTitle>
                  </div>
                  <Badge variant="success">
                    <Store className="mr-1 h-3.5 w-3.5" />
                    Ativa
                  </Badge>
                </div>
                <p className="text-sm leading-6 text-[#b8b0a4]">{entry.subtitle}</p>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="rounded-[28px] border border-[#2e2e2e] bg-[#101010] p-4">
                  <div className="flex aspect-square items-center justify-center rounded-[24px] border border-dashed border-[#3c3c3c] bg-[#151515] p-4">
                    <Image
                      src={buildQrImageUrl(entry.href)}
                      alt={entry.title}
                      width={210}
                      height={210}
                      className="rounded-2xl"
                      unoptimized
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-[#2f2f2f] bg-[#111111] p-3">
                  <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[#8e877c]">
                    <QrCode className="h-3.5 w-3.5" />
                    Link da mesa
                  </p>
                  <p className="mt-2 break-all text-sm text-[#ebe4d8]">{entry.href}</p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    className="border-[#313131] bg-transparent text-white hover:bg-[#212121]"
                    onClick={() => printQr(entry)}
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-[#c7c2b8] hover:bg-[#1b1b1b] hover:text-white"
                    onClick={() => void copyLink(entry.href)}
                  >
                    <Copy className="h-4 w-4" />
                    Copiar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
