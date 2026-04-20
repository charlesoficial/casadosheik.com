"use client";

import { Pencil, Printer, Trash2 } from "lucide-react";

import { PrinterStatusBadge } from "@/features/printers/components/printer-status-badge";
import { PrinterTestButton } from "@/features/printers/components/printer-test-button";
import { DSBadge, DSButton, DSCard, DSEmpty } from "@/components/system";
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
  const activeCount = printers.filter((printer) => printer.isActive).length;
  const autoPrintCount = printers.filter((printer) => printer.autoPrintOnAccept).length;

  if (!printers.length) {
    return (
      <DSCard variant="admin-panel" className="p-8 shadow-panel">
        <DSEmpty
          context="printers"
          title="Nenhuma impressora cadastrada"
          description="Cadastre a primeira impressora para liberar testes, logs e impressao automatica."
        />
      </DSCard>
    );
  }

  return (
    <DSCard variant="admin-panel" className="overflow-hidden shadow-panel">
      <div className="grid gap-4 border-b border-admin-border bg-admin-surface p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-admin-fg-faint">
            Registradas
          </p>
          <h2 className="mt-2 text-xl font-semibold text-admin-fg">Impressoras operacionais</h2>
          <p className="mt-2 text-sm leading-6 text-admin-fg-muted">
            Status, ultimo job, teste e automacao por impressora.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DSBadge variant="success">{activeCount} ativas</DSBadge>
          <DSBadge variant="admin">{autoPrintCount} auto print</DSBadge>
        </div>
      </div>

      <div className="divide-y divide-admin-border">
        {printers.map((printer) => {
          const latestJob = latestJobs[printer.id];
          const autoPrintLabel = printer.autoPrintOnAccept ? "Auto print ligado" : "Auto print desligado";
          const connectionLabel =
            printer.type === "usb"
              ? printer.printerName || "USB sem nome"
              : `${printer.ipAddress || "IP nao definido"}:${printer.port || 9100}`;

          return (
            <article
              key={printer.id}
              className="grid gap-4 bg-admin-elevated p-5 transition-colors duration-motion-fast hover:bg-admin-overlay lg:grid-cols-[minmax(0,1fr)_260px]"
            >
              <div className="min-w-0 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-ds-lg border border-admin-border-strong bg-admin-surface text-brand-gold">
                      <Printer className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-lg font-semibold text-admin-fg">{printer.name}</h3>
                        <PrinterStatusBadge printer={printer} />
                      </div>
                      <p className="mt-1 text-sm text-admin-fg-muted">
                        {printer.type.toUpperCase()} / {printer.destination}
                      </p>
                    </div>
                  </div>
                  <DSBadge variant={printer.autoPrintOnAccept ? "info" : "secondary"}>
                    {autoPrintLabel}
                  </DSBadge>
                </div>

                <div className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-ds-lg border border-admin-border bg-admin-surface p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-admin-fg-faint">Conexao</p>
                    <p className="mt-1 truncate font-medium text-admin-fg-secondary">{connectionLabel}</p>
                  </div>
                  <div className="rounded-ds-lg border border-admin-border bg-admin-surface p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-admin-fg-faint">Copias</p>
                    <p className="mt-1 font-medium tabular-nums text-admin-fg-secondary">{printer.copies}</p>
                  </div>
                  <div className="rounded-ds-lg border border-admin-border bg-admin-surface p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-admin-fg-faint">Ultimo job</p>
                    <p className="mt-1 truncate font-medium text-admin-fg-secondary">
                      {latestJob ? latestJob.status : "sem registro"}
                    </p>
                  </div>
                  <div className="rounded-ds-lg border border-admin-border bg-admin-surface p-3 sm:col-span-2 xl:col-span-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-admin-fg-faint">Disparo</p>
                    <p className="mt-1 text-admin-fg-secondary">
                      {latestJob?.triggerSource ?? "sem job recente"}
                    </p>
                  </div>
                </div>

                {printer.type === "network" ? (
                  <p className="rounded-ds-lg border border-status-warning-border bg-status-warning-bg px-3 py-2 text-sm text-status-warning-fg">
                    Modo rede envia ESC/POS via TCP. Confirme a porta {printer.port || 9100}.
                  </p>
                ) : null}

                {latestJob?.errorMessage ? (
                  <p className="rounded-ds-lg border border-status-danger-border bg-status-danger-bg px-3 py-2 text-sm text-status-danger-text">
                    Erro no ultimo job: {latestJob.errorMessage}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2 lg:items-stretch">
                <PrinterTestButton
                  printer={printer}
                  onFeedback={onFeedback}
                  onCompleted={onRefreshLogs}
                />
                <DSButton type="button" size="sm" variant="outline" onClick={() => onEdit(printer)}>
                  <Pencil className="h-4 w-4" />
                  Editar setup
                </DSButton>
                <DSButton type="button" size="sm" variant="secondary" onClick={() => onToggleActive(printer)}>
                  {printer.isActive ? "Desativar" : "Ativar"}
                </DSButton>
                <DSButton
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => onToggleAutoPrint(printer)}
                  title={autoPrintLabel}
                >
                  {printer.autoPrintOnAccept ? "Desligar auto" : "Ligar auto"}
                </DSButton>
                <DSButton type="button" size="sm" variant="danger" onClick={() => onDelete(printer)}>
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </DSButton>
              </div>
            </article>
          );
        })}
      </div>
    </DSCard>
  );
}
