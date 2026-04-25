"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Info,
  Loader2,
  Printer,
  Radio,
  Volume2,
  WandSparkles,
  XCircle,
} from "lucide-react";

import { AlertSoundSettings } from "@/components/admin/alert-sound-settings";
import { DSBadge, DSButton, DSCard } from "@/components/system";
import { alertAudio } from "@/lib/audio/alert-audio";
import { getSavedReceiptPaperWidth, saveReceiptPaperWidth } from "@/lib/receipt/print";
import type { ReceiptPaperWidth } from "@/lib/receipt/constants";
import type { OrderSettingsPayload, OrderSettingsRecord, PrinterRecord } from "@/lib/types";

// ── Constants (lógica preservada) ─────────────────────────────────────────────

const alertOptions: Array<OrderSettingsRecord["alertSound"]> = [
  "Alerta 1", "Alerta 2", "Alerta 3", "Alerta 4",
  "Alerta 5", "Alerta 6", "Alerta 7", "Alerta 8",
];
const alertToneMeta: Record<OrderSettingsRecord["alertSound"], { profile: string; hint: string }> = {
  "Alerta 1": { profile: "Sino unico",      hint: "Campainha limpa de balcao, direta e reconhecivel." },
  "Alerta 2": { profile: "Ding-dong",       hint: "Dois tons descendentes, estilo campainha de entrada." },
  "Alerta 3": { profile: "Tres pings",      hint: "Tres toques rapidos para chamar atencao no pico." },
  "Alerta 4": { profile: "Balcao oitava",   hint: "Sino grave e agudo juntos, encorpado e limpo." },
  "Alerta 5": { profile: "Chime suave",     hint: "Tom discreto para ambientes com som ambiente alto." },
  "Alerta 6": { profile: "Duplo agudo",     hint: "Dois pings de alta frequencia, corta qualquer ruido." },
  "Alerta 7": { profile: "Chamada ritmica", hint: "Padrao grave-agudo-grave que prende a atencao." },
  "Alerta 8": { profile: "Fanfarra",        hint: "Sequencia ascendente de quatro notas, inconfundivel." },
};
const alertFrequencies: Array<{ value: OrderSettingsRecord["alertFrequency"]; label: string; hint: string }> = [
  { value: "none",                label: "Silenciado",          hint: "Sem som ao entrar pedidos." },
  { value: "once_per_order",      label: "Uma vez por pedido",  hint: "Toca no momento da entrada." },
  { value: "repeat_while_pending",label: "Repetir pendentes",   hint: "Repete ate o pedido sair de novo." },
];
const autoPrintModes: Array<{ value: OrderSettingsRecord["autoPrintMode"]; label: string; hint: string }> = [
  { value: "single_printer",  label: "Impressora única",      hint: "Comanda completa em uma impressora." },
  { value: "by_destination",  label: "Por destino",           hint: "Cada área usa suas impressoras." },
];
const destinationLabels = {
  caixa: "Caixa", cozinha: "Cozinha", bar: "Bar", delivery: "Delivery",
} as const;

// ── Primitive controls ─────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        "relative flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition-all duration-motion-fast",
        checked
          ? "border-brand-purple bg-brand-purple shadow-soft"
          : "border-admin-border-strong bg-admin-surface",
      ].join(" ")}
    >
      <span
        className={[
          "h-5 w-5 rounded-full bg-admin-fg transition-transform duration-motion-fast",
          checked ? "translate-x-5" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}

function selectClass(disabled?: boolean) {
  return [
    "h-10 w-full rounded-ds-md border px-3 text-sm transition-colors duration-motion-fast",
    disabled
      ? "cursor-not-allowed border-admin-border bg-admin-elevated text-admin-fg-muted"
      : "border-admin-border-strong bg-admin-surface text-admin-fg hover:border-brand-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/40",
  ].join(" ");
}

function SectionShell({
  icon,
  eyebrow,
  title,
  badge,
  action,
  children,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-ds-xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] shadow-soft">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--admin-panel-header-border)] bg-[var(--admin-panel-header-bg)] px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-ds-md border border-admin-border-strong bg-admin-elevated text-admin-fg-secondary">
            {icon}
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-admin-fg-faint">
              {eyebrow}
            </p>
            <p className="text-sm font-semibold text-admin-fg">{title}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {badge}
          {action}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── API helper (lógica preservada) ────────────────────────────────────────────

async function readApiJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  const text = await response.text().catch(() => "");
  if (response.redirected || response.url.includes("/login")) {
    throw new Error("Sessao expirada. Entre novamente no admin e salve as configuracoes.");
  }
  if (text.trimStart().startsWith("<")) {
    throw new Error(`${fallbackMessage} O servidor devolveu uma pagina HTML em vez de JSON.`);
  }
  throw new Error(fallbackMessage);
}

function playAlertPreview(sound: OrderSettingsRecord["alertSound"], volume: number) {
  if (typeof window === "undefined") return;
  void alertAudio.unlock().then(() => {
    alertAudio.setSettings({ enabled: true, volume: Math.max(1, volume) / 100, alertTone: sound });
    return alertAudio.playTestSound();
  });
}

// ── PrintSettings ─────────────────────────────────────────────────────────────

export function PrintSettings({
  initialSettings,
  activePrinters,
}: {
  initialSettings: OrderSettingsRecord;
  activePrinters: PrinterRecord[];
}) {
  // ── State (lógica preservada integralmente) ───────────────────────────────
  const [form, setForm] = useState<OrderSettingsPayload>({
    enableTableOrders:          initialSettings.enableTableOrders,
    enableDeliveryOrders:       initialSettings.enableDeliveryOrders,
    enableManualOrders:         initialSettings.enableManualOrders,
    enableStepAccepted:         initialSettings.enableStepAccepted,
    enableStepPreparing:        initialSettings.enableStepPreparing,
    enableStepDelivery:         initialSettings.enableStepDelivery,
    notificationsEnabled:       initialSettings.notificationsEnabled,
    alertSound:                 initialSettings.alertSound,
    alertFrequency:             initialSettings.alertFrequency,
    alertVolume:                initialSettings.alertVolume,
    autoPrintEnabled:           initialSettings.autoPrintEnabled,
    autoPrintMode:              initialSettings.autoPrintMode,
    defaultAutoPrintPrinterId:  initialSettings.defaultAutoPrintPrinterId ?? null,
    autoPrintTriggerStatus:     initialSettings.autoPrintTriggerStatus,
  });
  const [loading, setLoading]               = useState(false);
  const [message, setMessage]               = useState<string | null>(null);
  const [error, setError]                   = useState<string | null>(null);
  const [receiptPaperWidth, setReceiptPaperWidth] = useState<ReceiptPaperWidth>("a4");

  const printerOptions          = useMemo(() => activePrinters, [activePrinters]);
  const autoPrintControlsDisabled = !form.autoPrintEnabled;
  const singlePrinterMode       = form.autoPrintMode === "single_printer";
  const selectedAlertTone       = alertToneMeta[form.alertSound];

  const enabledOrigins = [
    form.enableTableOrders    ? "Mesa"     : null,
    form.enableDeliveryOrders ? "Delivery" : null,
    form.enableManualOrders   ? "Manual"   : null,
  ].filter(Boolean) as string[];

  const enabledSteps = [
    form.enableStepAccepted  ? "Aceito" : null,
    form.enableStepPreparing ? "Preparo": null,
    form.enableStepDelivery  ? "Entrega": null,
  ].filter(Boolean) as string[];

  const autoPrintModeLabel   = form.autoPrintMode === "single_printer" ? "Impressora unica" : "Distribuicao por destino";
  const triggerStatusLabel   = form.autoPrintTriggerStatus === "aceito" ? "No aceite" : "Ao entrar como novo";

  const destinationAssignments = useMemo(
    () =>
      (Object.keys(destinationLabels) as Array<keyof typeof destinationLabels>).map((destination) => {
        const options = printerOptions.filter(
          (p) => p.destination === destination || p.destination === "geral"
        );
        return { destination, label: destinationLabels[destination], options, selectedId: options[0]?.id ?? "" };
      }),
    [printerOptions]
  );

  useEffect(() => {
    setReceiptPaperWidth(getSavedReceiptPaperWidth());
  }, []);

  function handleReceiptPaperWidthChange(value: ReceiptPaperWidth) {
    setReceiptPaperWidth(value);
    saveReceiptPaperWidth(value);
    setMessage(`Formato ${value === "a4" ? "A4" : value} salvo para impressoes pelo navegador.`);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/order-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await readApiJson<OrderSettingsRecord & { error?: string }>(
        response,
        "Nao foi possivel salvar configuracoes."
      );
      if (!response.ok) throw new Error(data.error || "Nao foi possivel salvar configuracoes.");
      setForm({
        enableTableOrders:          data.enableTableOrders,
        enableDeliveryOrders:       data.enableDeliveryOrders,
        enableManualOrders:         data.enableManualOrders,
        enableStepAccepted:         data.enableStepAccepted,
        enableStepPreparing:        data.enableStepPreparing,
        enableStepDelivery:         data.enableStepDelivery,
        notificationsEnabled:       data.notificationsEnabled,
        alertSound:                 data.alertSound,
        alertFrequency:             data.alertFrequency,
        alertVolume:                data.alertVolume,
        autoPrintEnabled:           data.autoPrintEnabled,
        autoPrintMode:              data.autoPrintMode,
        defaultAutoPrintPrinterId:  data.defaultAutoPrintPrinterId ?? null,
        autoPrintTriggerStatus:     data.autoPrintTriggerStatus,
      });
      setMessage("Configuracoes de pedidos salvas com sucesso.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro ao salvar configuracoes.");
    } finally {
      setLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <WandSparkles className="h-3.5 w-3.5 text-admin-fg-faint" />
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-admin-fg-faint">
              Order Operations
            </p>
          </div>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-admin-fg">
            Configurações de pedidos
          </h1>
          <p className="mt-1 text-sm text-admin-fg-secondary">
            Canais, etapas, alertas e impressão — controle tudo aqui.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <DSButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => playAlertPreview(form.alertSound, form.alertVolume)}
          >
            <Volume2 className="h-3.5 w-3.5" />
            Testar som
          </DSButton>
          <DSButton type="submit" variant="admin" size="sm" disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {loading ? "Salvando..." : "Salvar operação"}
          </DSButton>
        </div>
      </div>

      {/* ── Feedback ───────────────────────────────────────────────────────── */}
      {message && (
        <div className="flex items-center gap-3 rounded-ds-lg border border-status-success-border bg-status-success-bg px-4 py-3 text-sm text-status-success-fg">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {message}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 rounded-ds-lg border border-status-danger-border bg-status-danger-bg px-4 py-3 text-sm text-status-danger-fg">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* ── Operational status strip ────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-ds-xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] shadow-soft">
        <div className="grid grid-cols-2 divide-x divide-admin-border-faint xl:grid-cols-4">

          {/* Canais */}
          <div className="relative px-5 py-4">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-purple/40 to-transparent" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-admin-fg-faint">Canais</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-admin-fg">{enabledOrigins.length}<span className="text-base font-normal text-admin-fg-faint">/3</span></p>
            <p className="mt-0.5 truncate text-xs text-admin-fg-secondary">
              {enabledOrigins.length ? enabledOrigins.join(", ") : "Nenhum ativo"}
            </p>
          </div>

          {/* Etapas */}
          <div className="relative px-5 py-4">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-status-info-fg/40 to-transparent" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-admin-fg-faint">Etapas</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-admin-fg">{enabledSteps.length + 2}</p>
            <p className="mt-0.5 text-xs text-admin-fg-secondary">
              {enabledSteps.length ? `+ ${enabledSteps.join(", ")}` : "Novo e Concluído"}
            </p>
          </div>

          {/* Alerta */}
          <div className="relative px-5 py-4">
            <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${form.notificationsEnabled ? "via-brand-gold/40" : "via-admin-fg-faint/20"} to-transparent`} />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-admin-fg-faint">Alerta</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-admin-fg">
              {form.notificationsEnabled ? `${form.alertVolume}%` : "Off"}
            </p>
            <p className="mt-0.5 text-xs text-admin-fg-secondary">
              {form.notificationsEnabled ? selectedAlertTone.profile : "Silenciado"}
            </p>
          </div>

          {/* Impressão */}
          <div className="relative px-5 py-4">
            <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${form.autoPrintEnabled ? "via-status-success-fg/40" : "via-admin-fg-faint/20"} to-transparent`} />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-admin-fg-faint">Impressão</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-admin-fg">{printerOptions.length}</p>
            <p className="mt-0.5 text-xs text-admin-fg-secondary">
              {form.autoPrintEnabled ? autoPrintModeLabel : "Manual disponível"}
            </p>
          </div>

        </div>
      </div>

      {/* ── Main 2-column layout ────────────────────────────────────────────── */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_272px] 2xl:grid-cols-[minmax(0,1fr)_304px]">

        {/* ── Left: Settings sections ─────────────────────────────────────── */}
        <div className="space-y-4">

          {/* ── 1. Origem do pedido ─────────────────────────────────────────── */}
          <SectionShell
            icon={<Radio className="h-4 w-4" />}
            eyebrow="Canais de entrada"
            title="Origem do pedido"
            badge={
              <DSBadge variant={enabledOrigins.length ? "success" : "warning"}>
                {enabledOrigins.length} ativo{enabledOrigins.length !== 1 ? "s" : ""}
              </DSBadge>
            }
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {([
                ["enableTableOrders",    "Mesa / QR Code",       "Via QR Code na mesa."],
                ["enableDeliveryOrders", "Delivery / Retirada",  "Menu público externo."],
                ["enableManualOrders",   "Manual",               "Lançado pelo operador."],
              ] as const).map(([key, label, hint]) => {
                const checked = form[key as keyof OrderSettingsPayload] as boolean;
                return (
                  <div
                    key={key}
                    className={[
                      "group relative overflow-hidden rounded-ds-lg border p-4 transition-all duration-motion-fast",
                      checked
                        ? "border-brand-purple/40 bg-brand-purple-bg ring-1 ring-brand-purple/20"
                        : "border-admin-border bg-admin-elevated hover:border-admin-border-strong",
                    ].join(" ")}
                  >
                    {checked && (
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-purple/50 to-transparent" />
                    )}
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-admin-fg">{label}</p>
                      <Toggle
                        checked={checked}
                        onChange={(v) => setForm((c) => ({ ...c, [key]: v }))}
                      />
                    </div>
                    <p className="text-xs text-admin-fg-muted">{hint}</p>
                  </div>
                );
              })}
            </div>
          </SectionShell>

          {/* ── 2. Pipeline de etapas ────────────────────────────────────────── */}
          <SectionShell
            icon={<ChevronRight className="h-4 w-4" />}
            eyebrow="Pipeline"
            title="Etapas do pedido"
            badge={
              <DSBadge variant="info">{enabledSteps.length + 2} etapas</DSBadge>
            }
          >
            {/* Flow visualization */}
            <div className="flex flex-wrap items-stretch gap-2">

              {/* Fixed: Novo */}
              <div className="flex flex-col items-center justify-center rounded-ds-lg border border-admin-border-strong bg-admin-elevated px-4 py-3 text-center">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-admin-fg-faint">Fixo</p>
                <p className="mt-1 text-sm font-semibold text-admin-fg">Novo</p>
              </div>

              {/* Optional stages */}
              {([
                ["enableStepAccepted",  "Aceito",  "Confirmação inicial."],
                ["enableStepPreparing", "Preparo", "Produção na cozinha."],
                ["enableStepDelivery",  "Entrega", "Saída operacional."],
              ] as const).map(([key, label, hint]) => {
                const checked = form[key as keyof OrderSettingsPayload] as boolean;
                return (
                  <div key={key} className="flex items-center gap-2">
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-admin-fg-faint/50" />
                    <button
                      type="button"
                      onClick={() => setForm((c) => ({ ...c, [key]: !checked }))}
                      className={[
                        "rounded-ds-lg border px-4 py-3 text-center transition-all duration-motion-fast",
                        checked
                          ? "border-brand-purple/40 bg-brand-purple-bg ring-1 ring-brand-purple/20"
                          : "border-dashed border-admin-border bg-admin-elevated opacity-50 hover:opacity-75",
                      ].join(" ")}
                    >
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-admin-fg-faint">
                        {checked ? "Ativo" : "Off"}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-admin-fg">{label}</p>
                    </button>
                  </div>
                );
              })}

              {/* Fixed: Concluído */}
              <div className="flex items-center gap-2">
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-admin-fg-faint/50" />
                <div className="flex flex-col items-center justify-center rounded-ds-lg border border-admin-border-strong bg-admin-elevated px-4 py-3 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-admin-fg-faint">Fixo</p>
                  <p className="mt-1 text-sm font-semibold text-admin-fg">Concluído</p>
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs text-admin-fg-faint">
              Clique nas etapas opcionais para ativar ou desativar. Novo e Concluído são fixos.
            </p>
          </SectionShell>

          {/* ── 3. Alerta sonoro ─────────────────────────────────────────────── */}
          <SectionShell
            icon={<Bell className="h-4 w-4" />}
            eyebrow="Resposta do painel"
            title="Alerta sonoro"
            badge={
              <DSBadge variant={form.notificationsEnabled ? "success" : "secondary"}>
                {form.notificationsEnabled ? `${form.alertVolume}%` : "Off"}
              </DSBadge>
            }
            action={
              <DSButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => playAlertPreview(form.alertSound, form.alertVolume)}
              >
                <Volume2 className="h-3.5 w-3.5" />
                Ouvir
              </DSButton>
            }
          >
            <div className="space-y-4">

              {/* Enable toggle row */}
              <div className="flex items-center justify-between gap-4 rounded-ds-lg border border-admin-border bg-admin-elevated px-4 py-3.5">
                <div>
                  <p className="text-sm font-semibold text-admin-fg">Alertas de novos pedidos</p>
                  <p className="mt-0.5 text-xs text-admin-fg-muted">Liga ou desliga o som do fluxo de pedidos.</p>
                </div>
                <Toggle
                  checked={form.notificationsEnabled}
                  onChange={(v) => setForm((c) => ({ ...c, notificationsEnabled: v }))}
                />
              </div>

              {/* Tone + Volume */}
              <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">

                {/* Tone selector */}
                <div className="rounded-ds-xl border border-admin-border bg-admin-elevated p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-admin-fg">Toque do alerta</p>
                      <p className="mt-0.5 text-xs text-admin-fg-muted">{selectedAlertTone.hint}</p>
                    </div>
                    <DSBadge variant="admin">{selectedAlertTone.profile}</DSBadge>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {alertOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setForm((c) => ({ ...c, alertSound: option }))}
                        className={[
                          "rounded-ds-md border py-2 text-center text-xs font-medium transition-all duration-motion-fast",
                          form.alertSound === option
                            ? "border-brand-purple bg-brand-purple-bg text-status-new-fg ring-1 ring-brand-purple/20"
                            : "border-admin-border bg-admin-surface text-admin-fg-muted hover:border-admin-border-strong hover:text-admin-fg",
                        ].join(" ")}
                      >
                        {option.replace("Alerta ", "")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Volume */}
                <div className="rounded-ds-xl border border-admin-border bg-admin-elevated p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-admin-fg">Volume</p>
                    <DSBadge variant="secondary">{form.alertVolume}%</DSBadge>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={form.alertVolume}
                    onChange={(e) => setForm((c) => ({ ...c, alertVolume: Number(e.target.value) }))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-admin-border via-admin-border-strong to-brand-purple accent-brand-purple"
                  />
                  <p className="mt-3 text-xs text-admin-fg-muted">
                    Ajuste para o ruído do salão.
                  </p>
                </div>
              </div>

              {/* Frequency */}
              <div className="grid gap-2 sm:grid-cols-3">
                {alertFrequencies.map((option) => (
                  <label
                    key={option.value}
                    className={[
                      "flex cursor-pointer items-start gap-3 rounded-ds-lg border px-4 py-3.5 text-sm transition-all duration-motion-fast",
                      form.alertFrequency === option.value
                        ? "border-brand-purple bg-brand-purple-bg ring-1 ring-brand-purple/20"
                        : "border-admin-border bg-admin-elevated hover:border-admin-border-strong hover:bg-admin-overlay",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name="alert-frequency"
                      checked={form.alertFrequency === option.value}
                      onChange={() => setForm((c) => ({ ...c, alertFrequency: option.value }))}
                      className="mt-0.5 h-4 w-4 shrink-0 appearance-none rounded-full border border-admin-fg-faint bg-admin-surface transition checked:border-2 checked:border-brand-purple checked:bg-transparent checked:ring-4 checked:ring-brand-purple/15"
                    />
                    <span>
                      <span className="block font-semibold text-admin-fg">{option.label}</span>
                      <span className="mt-0.5 block text-xs text-admin-fg-muted">{option.hint}</span>
                    </span>
                  </label>
                ))}
              </div>

            </div>
          </SectionShell>

          {/* ── 4. Impressão automática ──────────────────────────────────────── */}
          <SectionShell
            icon={<Printer className="h-4 w-4" />}
            eyebrow="Automação"
            title="Impressão automática"
            badge={
              <DSBadge variant={form.autoPrintEnabled ? "success" : "secondary"}>
                {form.autoPrintEnabled ? "Ativa" : "Manual"}
              </DSBadge>
            }
          >
            <div className="space-y-4">

              {/* Bobina + Enable toggle — same row */}
              <div className="grid gap-4 sm:grid-cols-2">

                <div className="rounded-ds-lg border border-admin-border bg-admin-elevated p-4">
                  <label className="mb-1.5 block text-sm font-semibold text-admin-fg">
                    Tamanho da impressao
                  </label>
                  <p className="mb-3 text-xs text-admin-fg-muted">Folha inteira para impressora comum; bobina para termica.</p>
                  <select
                    className={selectClass(false)}
                    value={receiptPaperWidth}
                    onChange={(e) => handleReceiptPaperWidthChange(e.target.value as ReceiptPaperWidth)}
                  >
                    <option value="a4">Folha A4 inteira</option>
                    <option value="80mm">80mm — bobina grande</option>
                    <option value="58mm">58mm — bobina compacta</option>
                  </select>
                </div>

                <div className="flex items-start justify-between gap-4 rounded-ds-lg border border-admin-border bg-admin-elevated px-4 py-4">
                  <div>
                    <p className="text-sm font-semibold text-admin-fg">Impressão automática</p>
                    <p className="mt-1 text-xs leading-5 text-admin-fg-muted">
                      Quando desligada, a impressão manual continua disponível.
                    </p>
                  </div>
                  <Toggle
                    checked={form.autoPrintEnabled}
                    onChange={(v) => setForm((c) => ({ ...c, autoPrintEnabled: v }))}
                  />
                </div>
              </div>

              {/* Warning when disabled */}
              {autoPrintControlsDisabled && (
                <div className="flex items-start gap-3 rounded-ds-lg border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-status-warning-fg">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Ative a impressão automática para configurar modo, impressora e disparo.</p>
                </div>
              )}

              {/* Mode + Trigger — disabled overlay when print is off */}
              <div className={`grid gap-4 xl:grid-cols-[1.2fr_0.8fr] ${autoPrintControlsDisabled ? "pointer-events-none opacity-40" : ""}`}>

                {/* Mode */}
                <div className="rounded-ds-xl border border-admin-border bg-admin-elevated p-4">
                  <p className="mb-3 text-sm font-semibold text-admin-fg">Modo de envio</p>
                  <div className="grid gap-2">
                    {autoPrintModes.map((option) => (
                      <label
                        key={option.value}
                        className={[
                          "flex cursor-pointer items-start gap-3 rounded-ds-lg border px-4 py-3 text-sm transition-all duration-motion-fast",
                          form.autoPrintMode === option.value
                            ? "border-brand-purple bg-brand-purple-bg ring-1 ring-brand-purple/20"
                            : "border-admin-border bg-admin-surface hover:border-admin-border-strong",
                          autoPrintControlsDisabled ? "cursor-not-allowed" : "",
                        ].join(" ")}
                      >
                        <input
                          type="radio"
                          name="auto-print-mode"
                          checked={form.autoPrintMode === option.value}
                          disabled={autoPrintControlsDisabled}
                          onChange={() => setForm((c) => ({ ...c, autoPrintMode: option.value }))}
                          className="mt-0.5 h-4 w-4 shrink-0 appearance-none rounded-full border border-admin-fg-faint bg-admin-surface transition checked:border-2 checked:border-brand-purple checked:bg-transparent checked:ring-4 checked:ring-brand-purple/15"
                        />
                        <span>
                          <span className="block font-medium text-admin-fg">{option.label}</span>
                          <span className="mt-0.5 block text-xs text-admin-fg-muted">{option.hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Trigger + Printer */}
                <div className="space-y-3 rounded-ds-xl border border-admin-border bg-admin-elevated p-4">
                  <p className="text-sm font-semibold text-admin-fg">Regra de disparo</p>

                  <div className={singlePrinterMode ? "" : "opacity-50"}>
                    <label className="mb-1.5 block text-xs font-medium text-admin-fg-secondary">
                      Impressora principal
                    </label>
                    <select
                      disabled={autoPrintControlsDisabled || !singlePrinterMode}
                      className={selectClass(autoPrintControlsDisabled || !singlePrinterMode)}
                      value={form.defaultAutoPrintPrinterId ?? ""}
                      onChange={(e) =>
                        setForm((c) => ({ ...c, defaultAutoPrintPrinterId: e.target.value || null }))
                      }
                    >
                      <option value="">
                        {printerOptions.length ? "Selecione uma impressora" : "Nenhuma impressora ativa"}
                      </option>
                      {printerOptions.map((printer) => (
                        <option key={printer.id} value={printer.id}>
                          {printer.name} — {printer.destination}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-admin-fg-secondary">
                      Imprimir quando em
                    </label>
                    <select
                      disabled={autoPrintControlsDisabled}
                      className={selectClass(autoPrintControlsDisabled)}
                      value={form.autoPrintTriggerStatus}
                      onChange={(e) =>
                        setForm((c) => ({
                          ...c,
                          autoPrintTriggerStatus: e.target.value as OrderSettingsRecord["autoPrintTriggerStatus"],
                        }))
                      }
                    >
                      <option value="novo">novo</option>
                      <option value="aceito">aceito</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Destination assignments — only in by_destination + enabled */}
              {form.autoPrintEnabled && form.autoPrintMode === "by_destination" && (
                <div className="rounded-ds-xl border border-admin-border-strong bg-admin-elevated p-4 shadow-soft">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-admin-fg">Destinos operacionais</p>
                      <p className="mt-0.5 text-xs text-admin-fg-muted">
                        Encaminhamento pelas impressoras ativas por área.
                      </p>
                    </div>
                    <DSBadge variant="admin">{destinationAssignments.length} destinos</DSBadge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {destinationAssignments.map((item) => (
                      <div key={item.destination} className="rounded-ds-lg border border-admin-border bg-admin-surface p-3">
                        <label className="mb-1.5 block text-xs font-medium text-admin-fg-secondary">
                          {item.label}
                        </label>
                        <select disabled className={selectClass(true)} value={item.selectedId}>
                          <option value="">
                            {item.options.length
                              ? "Seleção automática pelo destino"
                              : "Nenhuma impressora para este destino"}
                          </option>
                          {item.options.map((printer) => (
                            <option key={printer.id} value={printer.id}>
                              {printer.name} — {printer.destination}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1.5 text-xs text-admin-fg-muted">
                          {item.options.length
                            ? "Definido pelas impressoras ativas."
                            : "Ative uma impressora para este destino."}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SectionShell>

          {/* ── 5. Advanced: Audio local ─────────────────────────────────────── */}
          <div className="rounded-ds-xl border border-admin-border-faint bg-admin-surface/60 p-1">
            <div className="px-4 pb-3 pt-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-admin-fg-faint">
                Avançado
              </p>
              <p className="mt-1 text-sm font-semibold text-admin-fg">Audio local do navegador</p>
              <p className="mt-0.5 text-xs text-admin-fg-muted">
                Ganho, desbloqueio e repetição — configurações de baixo nível do motor de som.
              </p>
            </div>
            <AlertSoundSettings />
          </div>

        </div>

        {/* ── Right: Sticky sidebar ───────────────────────────────────────── */}
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">

          {/* Operational digest */}
          <div className="overflow-hidden rounded-ds-xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] shadow-soft">
            <div className="border-b border-[var(--admin-panel-header-border)] bg-[var(--admin-panel-header-bg)] px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-admin-fg-faint">
                Leitura rápida
              </p>
              <p className="mt-0.5 text-sm font-semibold text-admin-fg">Operação atual</p>
            </div>
            <div className="divide-y divide-admin-border-faint p-4">
              {[
                { label: "Canais",   value: enabledOrigins.length ? enabledOrigins.join(", ") : "Nenhum ativo" },
                { label: "Etapas",   value: enabledSteps.length ? `Novo, ${enabledSteps.join(", ")}, Concluído` : "Novo e Concluído" },
                { label: "Alerta",   value: form.notificationsEnabled ? `${selectedAlertTone.profile} — ${form.alertVolume}%` : "Silenciado" },
                { label: "Impressão",value: form.autoPrintEnabled ? `${autoPrintModeLabel} / ${triggerStatusLabel}` : "Manual" },
              ].map(({ label, value }) => (
                <div key={label} className="py-3 first:pt-0 last:pb-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-admin-fg-faint">{label}</p>
                  <p className="mt-1 text-sm text-admin-fg-secondary">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Checklist */}
          <div className="overflow-hidden rounded-ds-xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] shadow-soft">
            <div className="border-b border-[var(--admin-panel-header-border)] bg-[var(--admin-panel-header-bg)] px-5 py-4">
              <p className="text-sm font-semibold text-admin-fg">Checklist do operador</p>
            </div>
            <div className="divide-y divide-admin-border-faint">
              {[
                { label: "Canais definidos",  ok: enabledOrigins.length > 0 },
                { label: "Som audível",       ok: form.notificationsEnabled },
                { label: "Impressoras ativas",ok: printerOptions.length > 0 },
                { label: "Print configurado", ok: form.autoPrintEnabled },
              ].map(({ label, ok }) => (
                <div key={label} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="text-sm text-admin-fg-secondary">{label}</span>
                  {ok ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-status-success-fg" />
                  ) : (
                    <CircleDot className="h-4 w-4 shrink-0 text-admin-fg-faint" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Save CTA */}
          <div className="rounded-ds-xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] p-5 shadow-soft">
            <p className="text-sm font-semibold text-admin-fg">Aplicar mudanças</p>
            <p className="mt-1.5 text-xs leading-5 text-admin-fg-muted">
              As alterações só entram no fluxo depois de salvar.
            </p>
            <DSButton type="submit" variant="admin" className="mt-4 w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Salvando..." : "Salvar configurações"}
            </DSButton>
          </div>

        </aside>
      </div>
    </form>
  );
}
