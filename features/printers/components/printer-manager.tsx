"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  icon: React.ReactNode;
}) {
  return (
    <div className="admin-printers-dark-block rounded-[24px] border border-[#2c2c2c] bg-[linear-gradient(180deg,#161616_0%,#0f0f0f_100%)] p-4">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#aca598]">{eyebrow}</span>
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#343434] bg-[#171717] text-[#f2eadf]">
          {icon}
        </span>
      </div>
      <p className="text-xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[#9e988c]">{hint}</p>
    </div>
  );
}

function deploymentStep({
  step,
  title,
  description
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-[#2f2f2f] bg-[#151515] p-4">
      <div className="mb-3 inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-[#3a3550] bg-[#19152a] px-2 text-xs font-semibold text-[#d8cdfc]">
        {step}
      </div>
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#a39c90]">{description}</p>
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

  return (
    <div className="admin-printers-shell space-y-6">
      <section className="overflow-hidden rounded-[30px] border border-[#2a2a2a] bg-[radial-gradient(circle_at_top_left,rgba(91,52,255,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(212,167,80,0.16),transparent_28%),linear-gradient(180deg,#171717_0%,#101010_100%)]">
        <div className="grid gap-8 p-6 xl:grid-cols-[1.15fr_0.85fr] xl:p-7">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#3c3650] bg-[#19152b] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#ddd2ff]">
              <Printer className="h-3.5 w-3.5" />
              Central de impressoras
            </div>
            <div className="max-w-3xl space-y-3">
              <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
                Configure QZ Tray, impressoras e disparo automatico em um so lugar.
              </h1>
              <p className="text-sm leading-7 text-[#b6b0a4] sm:text-base">
                Esta tela foi pensada para colocar a operacao em funcionamento hoje: conectar a bridge local, cadastrar impressoras USB ou rede, testar ticket real e definir quando o pedido imprime sozinho.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="admin" onClick={() => void handleConnectQzTray()}>
                <Cable className="h-4 w-4" />
                {bridge.automaticPrintingAvailable ? "QZ Tray conectado" : "Conectar QZ Tray"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-[#313131] bg-transparent text-white hover:bg-[#1b1b1b]"
                onClick={() => void bridge.refreshUsbPrinters().then(() => feedback("Lista USB atualizada."))}
              >
                <MonitorCog className="h-4 w-4" />
                Atualizar impressoras USB
              </Button>
              <Button asChild type="button" variant="outline" className="border-[#313131] bg-transparent text-white hover:bg-[#1b1b1b]">
                <a href="https://qz.io/download/" target="_blank" rel="noreferrer">
                  Baixar QZ Tray
                </a>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {statCard({
              eyebrow: "Bridge local",
              value: bridge.automaticPrintingAvailable ? "QZ pronta" : bridge.qzAvailable ? "QZ detectado" : "Nao detectado",
              hint: bridge.qzStatusMessage,
              icon: <Cable className="h-4 w-4" />
            })}
            {statCard({
              eyebrow: "Certificados",
              value: qzStatus?.signingConfigured ? "Assinatura ativa" : qzStatus?.certificateConfigured ? "Certificado parcial" : "Modo rapido",
              hint: qzStatus?.signingConfigured
                ? "O navegador pode imprimir sem popup extra do QZ Tray."
                : "Funciona hoje com confianca manual; para operacao silenciosa, finalize certificado + chave.",
              icon: qzStatus?.signingConfigured ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />
            })}
            {statCard({
              eyebrow: "Impressoras ativas",
              value: `${activePrinters.length}`,
              hint: activePrinters.length
                ? "Ja prontas para uso manual e para as regras automaticas."
                : "Cadastre ao menos uma impressora antes de ativar auto print.",
              icon: <BadgeCheck className="h-4 w-4" />
            })}
            {statCard({
              eyebrow: "Auto print",
              value: initialSettings.autoPrintEnabled ? "Ligado" : "Desligado",
              hint: initialSettings.autoPrintEnabled
                ? `Disparo em ${initialSettings.autoPrintTriggerStatus}.`
                : "Ative abaixo quando o cadastro de impressoras estiver validado.",
              icon: <ClipboardCheck className="h-4 w-4" />
            })}
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <Card className="admin-printers-shell-card border-[#2a2a2a] bg-[#171717]">
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#a39d90]">Fluxo de implantacao</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Passos certos para colocar a impressao no ar hoje</h2>
              </div>
              <Link
                href="/admin/pedidos"
                className="inline-flex items-center gap-2 rounded-xl border border-[#313131] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]"
              >
                Voltar para pedidos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
              {deploymentStep({
                step: "1",
                title: "Abra o QZ Tray nesta maquina",
                description: "A bridge USB so funciona quando o app do QZ Tray esta instalado e aberto no computador que vai imprimir."
              })}
              {deploymentStep({
                step: "2",
                title: "Conecte e valide a bridge",
                description: "Use o botao Conectar QZ Tray. Se o modo estiver rapido, o operador ainda pode confiar manualmente na origem."
              })}
              {deploymentStep({
                step: "3",
                title: "Cadastre cada impressora",
                description: "Defina destino operacional, nome exibido e o printer_name para USB ou IP/porta para impressoras de rede."
              })}
              {deploymentStep({
                step: "4",
                title: "Teste e so depois ligue o automatico",
                description: "Rode um ticket de teste, confirme corte/saida e entao habilite as regras de auto print abaixo."
              })}
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
              <div className="rounded-[24px] border border-[#2c2c2c] bg-[#121212] p-5">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#333333] bg-[#171717] text-[#efe6d8]">
                    <KeyRound className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-white">QZ Tray e certificados</h3>
                    <p className="text-sm text-[#a69f92]">Certificado e assinatura deixam a impressao USB mais confiavel e sem prompts extras.</p>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-2xl border border-[#303030] bg-[#171717] p-4">
                    <p className="text-sm font-medium text-white">Status atual</p>
                    <p className="mt-2 text-sm leading-6 text-[#aba598]">{bridge.qzStatusMessage}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-[#343434] bg-[#111111] px-3 py-1 text-xs font-medium text-[#ede7dc]">
                        {bridge.qzAvailable ? "Bridge detectada" : "Bridge ausente"}
                      </span>
                      <span className="rounded-full border border-[#343434] bg-[#111111] px-3 py-1 text-xs font-medium text-[#ede7dc]">
                        {qzStatus?.signingConfigured ? "Assinatura automatica" : "Confianca manual ou parcial"}
                      </span>
                      <span className="rounded-full border border-[#343434] bg-[#111111] px-3 py-1 text-xs font-medium text-[#ede7dc]">
                        Rede/IP via TCP bruto
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#303030] bg-[#171717] p-4">
                    <p className="text-sm font-medium text-white">Como deixar pronto de forma profissional</p>
                    <div className="mt-3 space-y-2 text-sm leading-6 text-[#a9a396]">
                      <p>1. Salve o certificado publico em <span className="font-medium text-[#f0e8da]">public/qz/digital-certificate.txt</span> ou use <span className="font-medium text-[#f0e8da]">QZ_TRAY_CERTIFICATE</span>.</p>
                      <p>2. Guarde a chave privada somente no servidor com <span className="font-medium text-[#f0e8da]">QZ_TRAY_PRIVATE_KEY</span> ou <span className="font-medium text-[#f0e8da]">QZ_TRAY_PRIVATE_KEY_PATH</span>.</p>
                      <p>3. Reabra esta tela e conecte a bridge. Quando a assinatura estiver pronta, o status muda automaticamente.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#2c2c2c] bg-[#121212] p-5">
                <h3 className="text-lg font-semibold text-white">USB detectadas agora</h3>
                <p className="mt-2 text-sm leading-6 text-[#a69f92]">
                  Use estes nomes no cadastro USB. Eles sao lidos direto do QZ Tray e ajudam a evitar erro de mapeamento.
                </p>

                <div className="mt-4 space-y-2">
                  {bridge.availableUsbPrinters.length ? (
                    bridge.availableUsbPrinters.map((printerName) => (
                      <div key={printerName} className="rounded-2xl border border-[#303030] bg-[#171717] px-4 py-3 text-sm text-white">
                        {printerName}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#343434] bg-[#161616] px-4 py-4 text-sm leading-6 text-[#a8a194]">
                      Nenhuma impressora USB listada ainda. Conecte o QZ Tray e clique em atualizar para buscar os nomes disponiveis.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <PrinterForm
            key={editingPrinter?.id || "new"}
            initialValue={editingPrinter}
            availableUsbPrinters={bridge.availableUsbPrinters}
            onSubmit={editingPrinter ? handleUpdate : handleCreate}
            onCancel={editingPrinter ? () => setEditingPrinter(null) : undefined}
          />
          <div className="rounded-[24px] border border-[#2a2a2a] bg-[#111111] p-5">
            <p className="text-sm font-semibold text-white">O que fica pronto hoje</p>
            <div className="mt-3 space-y-2 text-sm leading-6 text-[#a49e92]">
              <p>• USB via QZ Tray com teste real de ticket.</p>
              <p>• Separacao por destino operacional (caixa, cozinha, bar e delivery).</p>
              <p>• Regras automaticas de disparo no aceite ou no novo pedido.</p>
              <p>• Historico do ultimo job para descobrir rapidamente onde falhou.</p>
            </div>
            {!qzStatus?.signingConfigured ? (
              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-100">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Mesmo sem certificado completo, voce ja consegue operar hoje em modo rapido, aceitando a confianca do QZ Tray neste computador.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

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

    </div>
  );
}
