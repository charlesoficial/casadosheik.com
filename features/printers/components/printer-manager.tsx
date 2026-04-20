"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Cable,
  CheckCircle2,
  ClipboardCheck,
  KeyRound,
  MonitorCog,
  Printer,
  ShieldCheck,
  ShieldOff
} from "lucide-react";

import { PrinterForm } from "@/features/printers/components/printer-form";
import { PrinterList } from "@/features/printers/components/printer-list";
import { DSBadge, DSButton, DSCard, DSFeedback } from "@/components/system";
import { usePrinterBridge } from "@/features/printers/hooks/use-printer-bridge";
import type { OrderSettingsRecord, PrintJobRecord, PrinterPayload, PrinterRecord } from "@/lib/types";

type PrinterMutationResponse = PrinterRecord & { error?: string };
type QzStatusResponse = {
  certificateConfigured: boolean;
  signingConfigured: boolean;
  certificateSource: string | null;
  privateKeySource: string | null;
};

function ensurePrinterRecord(data: Partial<PrinterMutationResponse>, fallbackMessage: string): PrinterRecord {
  if (
    typeof data.id !== "string" ||
    typeof data.name !== "string" ||
    typeof data.type !== "string" ||
    typeof data.destination !== "string"
  ) {
    throw new Error(data.error || fallbackMessage);
  }

  return data as PrinterRecord;
}

function statCard({
  eyebrow,
  value,
  hint,
  icon
}: {
  eyebrow: string;
  value: string;
  hint: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-ds-lg border border-admin-border bg-admin-elevated p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-admin-fg-faint">{eyebrow}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-ds-md border border-admin-border-strong bg-admin-overlay text-brand-gold">
          {icon}
        </span>
      </div>
      <p className="text-xl font-semibold tracking-tight text-admin-fg">{value}</p>
      <p className="mt-2 text-sm leading-6 text-admin-fg-muted">{hint}</p>
    </div>
  );
}

function readinessStep({
  step,
  title,
  description
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-ds-lg border border-admin-border bg-admin-elevated p-4">
      <div className="mb-3 inline-flex h-8 min-w-8 items-center justify-center rounded-ds-md border border-status-new-border bg-status-new-bg px-2 text-xs font-semibold text-status-new-fg">
        {step}
      </div>
      <p className="text-sm font-semibold text-admin-fg">{title}</p>
      <p className="mt-2 text-sm leading-6 text-admin-fg-muted">{description}</p>
    </div>
  );
}

export function PrinterManager({
  initialPrinters,
  initialSettings
}: {
  initialPrinters: PrinterRecord[];
  initialSettings: OrderSettingsRecord;
}) {
  const bridge = usePrinterBridge();
  const [printers, setPrinters] = useState(initialPrinters);
  const [latestJobs, setLatestJobs] = useState<Record<string, PrintJobRecord | undefined>>({});
  const [editingPrinter, setEditingPrinter] = useState<PrinterRecord | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qzStatus, setQzStatus] = useState<QzStatusResponse | null>(null);
  const activePrinters = useMemo(() => printers.filter((printer) => printer.isActive), [printers]);

  useEffect(() => {
    setPrinters(initialPrinters);
  }, [initialPrinters]);

  async function refreshLogs() {
    try {
      const response = await fetch("/api/admin/print-jobs?mode=printer-summary", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as PrintJobRecord[];
      setLatestJobs(
        data.reduce<Record<string, PrintJobRecord | undefined>>((accumulator, job) => {
          if (job.printerId) {
            accumulator[job.printerId] = job;
          }
          return accumulator;
        }, {})
      );
    } catch {
      // Nao derruba a tela se o backend estiver reiniciando.
    }
  }

  async function refreshQzStatus() {
    try {
      const response = await fetch("/api/admin/printers/qz/status", { cache: "no-store" });
      if (!response.ok) {
        setQzStatus(null);
        return;
      }

      setQzStatus((await response.json()) as QzStatusResponse);
    } catch {
      setQzStatus(null);
    }
  }

  useEffect(() => {
    void refreshLogs();
    void refreshQzStatus();
  }, []);

  function feedback(nextMessage: string, isError = false) {
    if (isError) {
      setError(nextMessage);
      setMessage(null);
    } else {
      setMessage(nextMessage);
      setError(null);
    }
  }

  async function handleCreate(payload: PrinterPayload) {
    const response = await fetch("/api/admin/printers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = (await response.json().catch(() => ({}))) as Partial<PrinterMutationResponse>;
    if (!response.ok) throw new Error(data.error || "Erro ao criar impressora.");
    const printer = ensurePrinterRecord(data, "Erro ao criar impressora.");
    setPrinters((current) => [printer, ...current]);
    void refreshLogs();
    feedback("Impressora salva com sucesso.");
  }

  async function handleUpdate(payload: PrinterPayload) {
    if (!editingPrinter) return;
    const response = await fetch(`/api/admin/printers/${editingPrinter.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = (await response.json().catch(() => ({}))) as Partial<PrinterMutationResponse>;
    if (!response.ok) throw new Error(data.error || "Erro ao atualizar impressora.");
    const printer = ensurePrinterRecord(data, "Erro ao atualizar impressora.");
    setPrinters((current) => current.map((item) => (item.id === editingPrinter.id ? printer : item)));
    setEditingPrinter(null);
    void refreshLogs();
    feedback("Impressora atualizada com sucesso.");
  }

  async function handleDelete(printer: PrinterRecord) {
    const confirmed = window.confirm(`Excluir a impressora "${printer.name}"? Essa acao remove o cadastro do painel.`);
    if (!confirmed) {
      return;
    }

    const response = await fetch(`/api/admin/printers/${printer.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      feedback((data as { error?: string }).error || "Erro ao excluir impressora.", true);
      return;
    }
    setPrinters((current) => current.filter((item) => item.id !== printer.id));
    void refreshLogs();
    feedback("Impressora excluida com sucesso.");
  }

  async function handleToggleActive(printer: PrinterRecord) {
    try {
      const response = await fetch(`/api/admin/printers/${printer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: printer.name,
          type: printer.type,
          destination: printer.destination,
          printerName: printer.printerName || undefined,
          ipAddress: printer.ipAddress || undefined,
          port: printer.port || 9100,
          isActive: !printer.isActive,
          autoPrintOnAccept: printer.autoPrintOnAccept,
          copies: printer.copies
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao alternar impressora.");
      }
      setPrinters((current) => current.map((item) => (item.id === printer.id ? data : item)));
      void refreshLogs();
      feedback(!printer.isActive ? "Impressora ativada." : "Impressora desativada.");
    } catch (toggleError) {
      feedback(toggleError instanceof Error ? toggleError.message : "Erro ao alternar impressora.", true);
    }
  }

  async function handleToggleAutoPrint(printer: PrinterRecord) {
    try {
      const response = await fetch(`/api/admin/printers/${printer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: printer.name,
          type: printer.type,
          destination: printer.destination,
          printerName: printer.printerName || undefined,
          ipAddress: printer.ipAddress || undefined,
          port: printer.port || 9100,
          isActive: printer.isActive,
          autoPrintOnAccept: !printer.autoPrintOnAccept,
          copies: printer.copies
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao alternar impressao automatica.");
      }
      setPrinters((current) => current.map((item) => (item.id === printer.id ? data : item)));
      feedback(!printer.autoPrintOnAccept ? "Auto print ativado." : "Auto print desativado.");
    } catch (toggleError) {
      feedback(toggleError instanceof Error ? toggleError.message : "Erro ao alternar auto print.", true);
    }
  }

  async function handleConnectQzTray() {
    try {
      const connected = await bridge.connectQzTray();
      await bridge.refreshUsbPrinters();
      await refreshQzStatus();
      feedback(
        connected
          ? bridge.qzSecurityMode === "signed"
            ? "QZ Tray conectado com certificado e assinatura automatica."
            : "QZ Tray conectado. O fluxo rapido funciona hoje, mas pode pedir confianca manual."
          : "QZ Tray nao disponivel. Instale e deixe o app aberto nesta maquina."
      );
    } catch {
      feedback("Erro ao conectar ao QZ Tray.", true);
    }
  }

  const inactivePrinters = printers.filter((printer) => !printer.isActive);
  const configuredDestinations = new Set(activePrinters.map((printer) => printer.destination)).size;
  const latestFailedJobs = Object.values(latestJobs).filter((job) => job?.status === "failed").length;
  const automationReady = initialSettings.autoPrintEnabled && activePrinters.length > 0;
  const readinessLabel = bridge.automaticPrintingAvailable && activePrinters.length ? "Pronto" : "Revisar setup";
  const readinessHint = bridge.automaticPrintingAvailable
    ? activePrinters.length
      ? "Bridge e impressoras ativas para operacao."
      : "Bridge pronta, mas falta impressora ativa."
    : "Conecte o QZ Tray para operar USB.";

  return (
    <div className="space-y-6">
      <header className="grid gap-4 rounded-ds-2xl border border-admin-border bg-admin-elevated p-5 shadow-panel xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="space-y-3">
          <DSBadge variant="admin" className="gap-2 uppercase tracking-[0.18em]">
            <Printer className="h-3.5 w-3.5" />
            Printer Operations
          </DSBadge>
          <div className="max-w-4xl space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-admin-fg 2xl:text-3xl">
              Centro de operacao das impressoras
            </h1>
            <p className="text-sm leading-6 text-admin-fg-muted">
              Conexao, roteamento, testes e prontidao da impressao automatica do restaurante.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
          <DSButton type="button" variant="admin" onClick={() => void handleConnectQzTray()}>
            <Cable className="h-4 w-4" />
            {bridge.automaticPrintingAvailable ? "QZ conectado" : "Conectar QZ"}
          </DSButton>
          <DSButton
            type="button"
            variant="outline"
            onClick={() => void bridge.refreshUsbPrinters().then(() => feedback("Lista USB atualizada."))}
          >
            <MonitorCog className="h-4 w-4" />
            Atualizar USB
          </DSButton>
          <DSButton asChild variant="outline">
            <a href="https://qz.io/download/" target="_blank" rel="noreferrer">
              Baixar QZ Tray
            </a>
          </DSButton>
        </div>
      </header>

      {message && <DSFeedback variant="success" title={message} onDismiss={() => setMessage(null)} />}
      {error && <DSFeedback variant="error" title={error} onDismiss={() => setError(null)} />}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <main className="space-y-6">
          <DSCard variant="admin-panel" className="overflow-hidden shadow-panel" entering>
            <div className="grid gap-6 border-b border-admin-border bg-admin-surface p-5 xl:grid-cols-[1.15fr_0.85fr] 2xl:p-6">
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-ds-lg border border-brand-purple/30 bg-brand-purple-bg text-brand-purple shadow-soft">
                    <Printer className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-admin-fg-faint">
                      Readiness
                    </p>
                    <h2 className="mt-1 text-xl font-semibold tracking-tight text-admin-fg 2xl:text-2xl">
                      {readinessLabel}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-admin-fg-muted">{readinessHint}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-ds-lg border border-admin-border bg-admin-elevated p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-admin-fg-faint">Bridge</p>
                    <p className="mt-2 text-lg font-semibold text-admin-fg">
                      {bridge.automaticPrintingAvailable ? "Online" : bridge.qzAvailable ? "Detectada" : "Offline"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-admin-fg-muted">{bridge.qzStatusMessage}</p>
                  </div>
                  <div className="rounded-ds-lg border border-admin-border bg-admin-elevated p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-admin-fg-faint">Ativas</p>
                    <p className="mt-2 text-lg font-semibold tabular-nums text-admin-fg">{activePrinters.length}</p>
                    <p className="mt-1 text-xs leading-5 text-admin-fg-muted">
                      {inactivePrinters.length} inativas ou pausadas.
                    </p>
                  </div>
                  <div className="rounded-ds-lg border border-admin-border bg-admin-elevated p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-admin-fg-faint">Automacao</p>
                    <p className="mt-2 text-lg font-semibold text-admin-fg">
                      {automationReady ? "Pronta" : initialSettings.autoPrintEnabled ? "Sem ativa" : "Manual"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-admin-fg-muted">
                      Disparo em {initialSettings.autoPrintTriggerStatus}.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-ds-xl border border-admin-border bg-admin-elevated p-4 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-admin-fg-faint">
                  Proxima acao
                </p>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 rounded-ds-md bg-admin-surface px-3 py-2.5">
                    <span className="text-sm text-admin-fg-secondary">Conectar QZ</span>
                    <DSBadge variant={bridge.automaticPrintingAvailable ? "success" : "warning"}>
                      {bridge.automaticPrintingAvailable ? "Ok" : "Pendente"}
                    </DSBadge>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-ds-md bg-admin-surface px-3 py-2.5">
                    <span className="text-sm text-admin-fg-secondary">Testar impressora</span>
                    <DSBadge variant={printers.length ? "info" : "secondary"}>
                      {printers.length ? "Disponivel" : "Cadastre"}
                    </DSBadge>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-ds-md bg-admin-surface px-3 py-2.5">
                    <span className="text-sm text-admin-fg-secondary">Jobs com falha</span>
                    <DSBadge variant={latestFailedJobs ? "danger" : "success"}>{latestFailedJobs}</DSBadge>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 bg-admin-elevated p-4 sm:grid-cols-2 2xl:grid-cols-4">
              {statCard({
                eyebrow: "Ativas",
                value: `${activePrinters.length}`,
                hint: "Prontas para uso manual e automacao.",
                icon: <BadgeCheck className="h-4 w-4" />
              })}
              {statCard({
                eyebrow: "Inativas",
                value: `${inactivePrinters.length}`,
                hint: "Pausadas ou aguardando revisao.",
                icon: <ShieldOff className="h-4 w-4" />
              })}
              {statCard({
                eyebrow: "Destinos",
                value: `${configuredDestinations}`,
                hint: "Areas cobertas por impressoras ativas.",
                icon: <ClipboardCheck className="h-4 w-4" />
              })}
              {statCard({
                eyebrow: "Certificado",
                value: qzStatus?.signingConfigured ? "Assinado" : qzStatus?.certificateConfigured ? "Parcial" : "Rapido",
                hint: qzStatus?.signingConfigured ? "Sem popup extra do QZ Tray." : "Pode pedir confianca manual.",
                icon: qzStatus?.signingConfigured ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />
              })}
            </div>
          </DSCard>

          <PrinterList
            printers={printers}
            latestJobs={latestJobs}
            onEdit={setEditingPrinter}
            onDelete={(printer) => void handleDelete(printer)}
            onToggleActive={(printer) => void handleToggleActive(printer)}
            onToggleAutoPrint={(printer) => void handleToggleAutoPrint(printer)}
            onFeedback={feedback}
            onRefreshLogs={() => void refreshLogs()}
          />

          <DSCard variant="admin-panel" className="overflow-hidden shadow-soft">
            <div className="border-b border-admin-border bg-admin-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-admin-fg-faint">
                Automacao e roteamento
              </p>
              <h2 className="mt-2 text-xl font-semibold text-admin-fg">Impressao automatica</h2>
              <p className="mt-2 text-sm leading-6 text-admin-fg-muted">
                Estado salvo do fluxo de pedidos e cobertura por destino operacional.
              </p>
            </div>
            <div className="grid gap-4 p-5 lg:grid-cols-3">
              <div className="rounded-ds-lg border border-admin-border bg-admin-elevated p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-admin-fg-faint">Auto print</p>
                <p className="mt-2 text-lg font-semibold text-admin-fg">
                  {initialSettings.autoPrintEnabled ? "Ligado" : "Desligado"}
                </p>
                <p className="mt-1 text-sm leading-6 text-admin-fg-muted">
                  {initialSettings.autoPrintEnabled ? "Fluxo automatico habilitado." : "Operacao segue manual."}
                </p>
              </div>
              <div className="rounded-ds-lg border border-admin-border bg-admin-elevated p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-admin-fg-faint">Disparo</p>
                <p className="mt-2 text-lg font-semibold text-admin-fg">{initialSettings.autoPrintTriggerStatus}</p>
                <p className="mt-1 text-sm leading-6 text-admin-fg-muted">Momento em que o sistema tenta imprimir.</p>
              </div>
              <div className="rounded-ds-lg border border-admin-border bg-admin-elevated p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-admin-fg-faint">Modo</p>
                <p className="mt-2 text-lg font-semibold text-admin-fg">
                  {initialSettings.autoPrintMode === "single_printer" ? "Unica" : "Por destino"}
                </p>
                <p className="mt-1 text-sm leading-6 text-admin-fg-muted">
                  {configuredDestinations} destinos cobertos por impressoras ativas.
                </p>
              </div>
            </div>
          </DSCard>

          <DSCard variant="admin-panel" className="overflow-hidden shadow-soft">
            <div className="border-b border-admin-border bg-admin-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-admin-fg-faint">
                Diagnostico
              </p>
              <h2 className="mt-2 text-xl font-semibold text-admin-fg">Bridge, certificados e USB</h2>
            </div>
            <div className="grid gap-4 p-5 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                {readinessStep({
                  step: "1",
                  title: "Abra o QZ Tray",
                  description: "Instale e deixe o app aberto na maquina que imprime."
                })}
                {readinessStep({
                  step: "2",
                  title: "Conecte a bridge",
                  description: "Clique em conectar e confirme confianca no popup."
                })}
                {readinessStep({
                  step: "3",
                  title: "Teste antes de automatizar",
                  description: "Rode um ticket de teste e valide corte, acento e via."
                })}
              </div>

              <div className="space-y-4">
                <div className="rounded-ds-xl border border-admin-border bg-admin-elevated p-4">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-ds-md border border-admin-border-strong bg-admin-surface text-brand-gold">
                      <KeyRound className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-admin-fg">Certificados QZ</p>
                      <p className="text-xs text-admin-fg-muted">
                        {qzStatus?.signingConfigured ? "Assinatura ativa." : "Modo rapido ou parcial."}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm leading-6 text-admin-fg-muted">
                    Para operar sem prompts, configure certificado publico e chave privada no servidor.
                  </p>
                </div>

                <div className="rounded-ds-xl border border-admin-border bg-admin-elevated p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-admin-fg">USB detectadas</p>
                    <DSBadge variant={bridge.availableUsbPrinters.length ? "success" : "secondary"}>
                      {bridge.availableUsbPrinters.length}
                    </DSBadge>
                  </div>
                  <div className="space-y-2">
                    {bridge.availableUsbPrinters.length ? (
                      bridge.availableUsbPrinters.map((printerName) => (
                        <div key={printerName} className="rounded-ds-md border border-admin-border bg-admin-surface px-3 py-2 text-sm text-admin-fg-secondary">
                          {printerName}
                        </div>
                      ))
                    ) : (
                      <p className="rounded-ds-md border border-dashed border-admin-border-strong bg-admin-surface px-3 py-3 text-sm leading-6 text-admin-fg-muted">
                        Conecte o QZ Tray e atualize para listar impressoras USB.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </DSCard>
        </main>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <DSCard variant="admin-panel" className="overflow-hidden shadow-panel">
            <div className="border-b border-admin-border bg-admin-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-admin-fg-faint">
                Health rail
              </p>
              <h2 className="mt-2 text-lg font-semibold text-admin-fg">Leitura rapida</h2>
            </div>
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-admin-fg-muted">QZ Tray</span>
                <DSBadge variant={bridge.automaticPrintingAvailable ? "success" : "warning"}>
                  {bridge.automaticPrintingAvailable ? "Online" : "Revisar"}
                </DSBadge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-admin-fg-muted">Impressoras</span>
                <DSBadge variant={activePrinters.length ? "success" : "warning"}>
                  {activePrinters.length ? `${activePrinters.length} ativas` : "Nenhuma"}
                </DSBadge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-admin-fg-muted">Automacao</span>
                <DSBadge variant={automationReady ? "success" : "secondary"}>
                  {automationReady ? "Pronta" : "Manual"}
                </DSBadge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-admin-fg-muted">Falhas recentes</span>
                <DSBadge variant={latestFailedJobs ? "danger" : "success"}>{latestFailedJobs}</DSBadge>
              </div>
            </div>
          </DSCard>

          <PrinterForm
            key={editingPrinter?.id || "new"}
            initialValue={editingPrinter}
            availableUsbPrinters={bridge.availableUsbPrinters}
            onSubmit={editingPrinter ? handleUpdate : handleCreate}
            onCancel={editingPrinter ? () => setEditingPrinter(null) : undefined}
          />

          {!qzStatus?.signingConfigured && (
            <DSFeedback
              variant="warning"
              title="Modo rapido ativo"
              description="Aceite a confianca do QZ Tray neste computador para operar sem certificado completo."
            />
          )}

          <DSButton asChild variant="outline" className="w-full">
            <Link href="/admin/pedidos">
              Voltar para pedidos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </DSButton>
        </aside>
      </div>
    </div>
  );
}
