"use client";

import { Pencil, Trash2 } from "lucide-react";

import { PrinterStatusBadge } from "@/features/printers/components/printer-status-badge";
import { PrinterTestButton } from "@/features/printers/components/printer-test-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PrintJobRecord, PrinterRecord } from "@/lib/types";

export function PrinterList({
  printers,
  latestJobs,
  onEdit,
  onDelete,
  onToggleActive,
  onToggleAutoPrint,
  onFeedback,
  onRefreshLogs
}: {
  printers: PrinterRecord[];
  latestJobs: Record<string, PrintJobRecord | undefined>;
  onEdit: (printer: PrinterRecord) => void;
  onDelete: (printer: PrinterRecord) => void;
  onToggleActive: (printer: PrinterRecord) => void;
  onToggleAutoPrint: (printer: PrinterRecord) => void;
  onFeedback: (message: string, isError?: boolean) => void;
  onRefreshLogs: () => void;
}) {
  return (
    <div className="space-y-3">
      {printers.map((printer) => {
        const latestJob = latestJobs[printer.id];
        const autoPrintLabel = printer.autoPrintOnAccept ? "Auto print ligado" : "Auto print desligado";

        return (
          <Card key={printer.id} className="admin-printers-shell-card border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] shadow-[var(--admin-panel-shadow)]">
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-[var(--admin-title)]">{printer.name}</p>
                  <p className="text-sm text-[var(--admin-subtle)]">
                    {printer.type.toUpperCase()} - {printer.destination}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <PrinterStatusBadge printer={printer} />
                  <PrinterTestButton
                    printer={printer}
                    onFeedback={onFeedback}
                    onCompleted={onRefreshLogs}
                  />
                </div>
              </div>

              <div className="grid gap-2 text-sm text-[var(--admin-title)] sm:grid-cols-2">
                <div>
                  {printer.type === "usb"
                    ? `Printer: ${printer.printerName || "-"}`
                    : `IP: ${printer.ipAddress || "-"}`}
                </div>
                <div>{printer.type === "network" ? `Porta: ${printer.port || 9100}` : `Copias: ${printer.copies}`}</div>
                <div>Auto print: {printer.autoPrintOnAccept ? "sim" : "nao"}</div>
                <div>Status: {printer.isActive ? "pronta para uso" : "desativada"}</div>
                <div>Ultimo job: {latestJob ? latestJob.status : "sem historico"}</div>
                <div>Origem: {latestJob?.triggerSource ?? "-"}</div>
              </div>

              {printer.type === "network" ? (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-100">
                  Modo por IP/rede ativo. Funciona quando a impressora aceita ESC/POS bruto via TCP, normalmente na porta 9100.
                </p>
              ) : null}

              {latestJob?.errorMessage ? (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                  Ultimo erro: {latestJob.errorMessage}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(printer)}
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onToggleActive(printer)}
                >
                  {printer.isActive ? "Desativar" : "Ativar"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onToggleAutoPrint(printer)}
                  title={autoPrintLabel}
                >
                  {autoPrintLabel}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-red-500/30 text-red-600 hover:bg-red-500/10 dark:text-red-300"
                  onClick={() => onDelete(printer)}
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
