"use client";

import { useMemo, useState } from "react";
import { Bell, ClipboardList, GitBranch, Info, Loader2, Printer, Volume2, WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { OrderSettingsPayload, OrderSettingsRecord, PrinterRecord } from "@/lib/types";

// Configuracoes operacionais do fluxo de pedidos, alertas e impressao automatica.
const alertOptions: Array<OrderSettingsRecord["alertSound"]> = [
  "Alerta 1",
  "Alerta 2",
  "Alerta 3",
  "Alerta 4",
  "Alerta 5",
  "Alerta 6",
  "Alerta 7",
  "Alerta 8"
];
const alertToneMeta: Record<OrderSettingsRecord["alertSound"], { profile: string; hint: string }> = {
  "Alerta 1": { profile: "Classico", hint: "Curto, direto e facil de reconhecer no caixa." },
  "Alerta 2": { profile: "Elevado", hint: "Comeca grave e sobe para chamar atencao com clareza." },
  "Alerta 3": { profile: "Descendente", hint: "Mais expressivo, bom para ambientes com movimento." },
  "Alerta 4": { profile: "Duplo pulso", hint: "Dois pulsos fortes, rapido para operacao intensa." },
  "Alerta 5": { profile: "Toque suave", hint: "Mais discreto, adequado para salao com som ativo." },
  "Alerta 6": { profile: "Urgencia leve", hint: "Frequencias mais altas para destacar novos pedidos." },
  "Alerta 7": { profile: "Marcacao ritmica", hint: "Sequencia ritmica que prende a atencao sem exagero." },
  "Alerta 8": { profile: "Premium", hint: "Mais encorpado, com sensacao moderna e sofisticada." }
};
const alertFrequencies: Array<{ value: OrderSettingsRecord["alertFrequency"]; label: string }> = [
  { value: "none", label: "Nao tocar o alerta sonoro" },
  { value: "once_per_order", label: "Tocar uma vez a cada novo pedido" },
  { value: "repeat_while_pending", label: "Repetir enquanto houver pedidos pendentes" }
];

const autoPrintModes: Array<{ value: OrderSettingsRecord["autoPrintMode"]; label: string }> = [
  { value: "single_printer", label: "Imprimir pedidos inteiros em uma unica impressora" },
  { value: "by_destination", label: "Separar impressoes por destino operacional" }
];

const destinationLabels = {
  caixa: "Caixa",
  cozinha: "Cozinha",
  bar: "Bar",
  delivery: "Delivery"
} as const;

function sectionDescription(text: string) {
  return <p className="text-sm leading-6 text-[var(--admin-subtle)]">{text}</p>;
}

function statCard({
  icon,
  eyebrow,
  value,
  hint
}: {
  icon: React.ReactNode;
  eyebrow: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[22px] border border-[var(--admin-panel-border)] bg-[var(--admin-panel-header-bg)] p-4">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--admin-subtle)]">{eyebrow}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--admin-icon-wrap-border)] bg-[var(--admin-icon-wrap-bg)] text-[var(--admin-icon-wrap-fg)]">
          {icon}
        </span>
      </div>
      <p className="text-xl font-semibold text-[var(--admin-title)]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--admin-subtle)]">{hint}</p>
    </div>
  );
}

function toggleCard({
  checked,
  label,
  description,
  onChange
}: {
  checked: boolean;
  label: string;
  description?: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-header-bg)] px-4 py-4 text-sm text-[var(--admin-title)] transition-colors hover:border-[var(--admin-control-border)] hover:bg-[var(--admin-control-hover-bg)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 appearance-none rounded-full border border-[#6f685d] bg-[#f4f0e8] transition checked:border-2 checked:border-[#7a58ff] checked:bg-transparent checked:shadow-[0_0_0_4px_rgba(122,88,255,0.12)]"
      />
      <span className="space-y-1">
        <span className="block font-medium text-[var(--admin-title)]">{label}</span>
        {description ? <span className="block text-xs leading-5 text-[var(--admin-subtle)]">{description}</span> : null}
      </span>
    </label>
  );
}

function radioCard({
  checked,
  disabled,
  name,
  label,
  description,
  onChange
}: {
  checked: boolean;
  disabled?: boolean;
  name: string;
  label: string;
  description?: string;
  onChange: () => void;
}) {
  return (
    <label
      className={[
        "flex items-start gap-3 rounded-2xl border px-4 py-4 text-sm transition-all",
        checked
          ? "border-[#5b34ff] bg-[#181327] text-white shadow-[0_0_0_1px_rgba(91,52,255,0.18)]"
          : "border-[var(--admin-panel-border)] bg-[var(--admin-panel-header-bg)] text-[var(--admin-title)] hover:border-[var(--admin-control-border)] hover:bg-[var(--admin-control-hover-bg)]",
        disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"
      ].join(" ")}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-1 h-4 w-4 appearance-none rounded-full border border-[#6f685d] bg-[#f4f0e8] transition checked:border-2 checked:border-[#7a58ff] checked:bg-transparent checked:shadow-[0_0_0_4px_rgba(122,88,255,0.12)]"
      />
      <span className="space-y-1">
        <span className="block font-medium">{label}</span>
        {description ? <span className="block text-xs leading-5 text-[var(--admin-subtle)]">{description}</span> : null}
      </span>
    </label>
  );
}

function selectClass(disabled?: boolean) {
  return [
    "h-11 rounded-xl border px-4 text-sm transition-colors",
    disabled
      ? "cursor-not-allowed border-[var(--admin-panel-border)] bg-[var(--admin-panel-header-bg)] text-[var(--admin-subtle)]"
      : "border-[var(--admin-control-border)] bg-[var(--ui-input-bg)] text-[var(--ui-input-fg)] hover:border-[var(--admin-control-border)]"
  ].join(" ");
}

function playAlertPreview(sound: OrderSettingsRecord["alertSound"], volume: number) {
  // O preview de audio ajuda a calibrar o painel sem disparar um pedido real.
  if (typeof window === "undefined") return;
  const AudioContextCtor =
    window.AudioContext ||
    (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;

  const context = new AudioContextCtor();
  const profiles: Record<OrderSettingsRecord["alertSound"], number[]> = {
    "Alerta 1": [880, 880, 880],
    "Alerta 2": [720, 960, 720],
    "Alerta 3": [1040, 880, 720],
    "Alerta 4": [920, 920, 1180, 1180],
    "Alerta 5": [640, 760, 640],
    "Alerta 6": [1180, 1320, 1180],
    "Alerta 7": [760, 960, 760, 1120],
    "Alerta 8": [860, 1080, 1280]
  };
  const gainValue = Math.max(0.0001, volume / 100);
  let startAt = context.currentTime;

  for (const frequency of profiles[sound]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(gainValue * 0.2, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.3);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + 0.3);
    startAt += 0.45;
  }

  window.setTimeout(() => {
    void context.close();
  }, 1800);
}

export function PrintSettings({
  initialSettings,
  activePrinters
}: {
  initialSettings: OrderSettingsRecord;
  activePrinters: PrinterRecord[];
}) {
  // O estado local espelha o registro salvo e so persiste no submit,
  // evitando alterar a operacao enquanto o operador ainda esta configurando.
  const [form, setForm] = useState<OrderSettingsPayload>({
    enableTableOrders: initialSettings.enableTableOrders,
    enableDeliveryOrders: initialSettings.enableDeliveryOrders,
    enableManualOrders: initialSettings.enableManualOrders,
    enableStepAccepted: initialSettings.enableStepAccepted,
    enableStepPreparing: initialSettings.enableStepPreparing,
    enableStepDelivery: initialSettings.enableStepDelivery,
    notificationsEnabled: initialSettings.notificationsEnabled,
    alertSound: initialSettings.alertSound,
    alertFrequency: initialSettings.alertFrequency,
    alertVolume: initialSettings.alertVolume,
    autoPrintEnabled: initialSettings.autoPrintEnabled,
    autoPrintMode: initialSettings.autoPrintMode,
    defaultAutoPrintPrinterId: initialSettings.defaultAutoPrintPrinterId ?? null,
    autoPrintTriggerStatus: initialSettings.autoPrintTriggerStatus
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const printerOptions = useMemo(() => activePrinters, [activePrinters]);
  const autoPrintControlsDisabled = !form.autoPrintEnabled;
  const singlePrinterMode = form.autoPrintMode === "single_printer";
  const selectedAlertTone = alertToneMeta[form.alertSound];
  const enabledOrigins = [
    form.enableTableOrders ? "Mesa" : null,
    form.enableDeliveryOrders ? "Delivery" : null,
    form.enableManualOrders ? "Manual" : null
  ].filter(Boolean) as string[];
  const enabledSteps = [
    form.enableStepAccepted ? "Aceite" : null,
    form.enableStepPreparing ? "Preparo" : null,
    form.enableStepDelivery ? "Entrega" : null
  ].filter(Boolean) as string[];
  const autoPrintModeLabel =
    form.autoPrintMode === "single_printer" ? "Impressora unica" : "Distribuicao por destino";
  const triggerStatusLabel = form.autoPrintTriggerStatus === "aceito" ? "No aceite" : "Ao entrar como novo";
  const destinationAssignments = useMemo(
    () =>
      (Object.keys(destinationLabels) as Array<keyof typeof destinationLabels>).map((destination) => {
        const options = printerOptions.filter(
          (printer) => printer.destination === destination || printer.destination === "geral"
        );
        return {
          destination,
          label: destinationLabels[destination],
          options,
          selectedId: options[0]?.id ?? ""
        };
      }),
    [printerOptions]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/order-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Nao foi possivel salvar configuracoes.");
      }
      setForm({
        enableTableOrders: data.enableTableOrders,
        enableDeliveryOrders: data.enableDeliveryOrders,
        enableManualOrders: data.enableManualOrders,
        enableStepAccepted: data.enableStepAccepted,
        enableStepPreparing: data.enableStepPreparing,
        enableStepDelivery: data.enableStepDelivery,
        notificationsEnabled: data.notificationsEnabled,
        alertSound: data.alertSound,
        alertFrequency: data.alertFrequency,
        alertVolume: data.alertVolume,
        autoPrintEnabled: data.autoPrintEnabled,
        autoPrintMode: data.autoPrintMode,
        defaultAutoPrintPrinterId: data.defaultAutoPrintPrinterId ?? null,
        autoPrintTriggerStatus: data.autoPrintTriggerStatus
      });
      setMessage("Configuracoes de pedidos salvas com sucesso.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erro ao salvar configuracoes.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="admin-print-settings-shell-card overflow-hidden border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)]">
      <CardContent className="space-y-6 p-6">
        <section className="overflow-hidden rounded-[28px] border border-[var(--admin-panel-header-border)] bg-[var(--admin-panel-header-bg)]">
          <div className="grid gap-8 p-6 xl:grid-cols-[1.2fr_0.8fr] xl:p-7">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#5b34ff]/30 bg-[#5b34ff]/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#8b5cf6]">
                <WandSparkles className="h-3.5 w-3.5" />
                Configuracao operacional
              </div>
              <div className="max-w-3xl space-y-3">
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[var(--admin-title)] sm:text-4xl">
                  Central de pedidos, alertas e impressao automatica.
                </h1>
                <p className="text-sm leading-7 text-[var(--admin-subtle)] sm:text-base">
                  Organize o fluxo do operador, defina em que etapa os pedidos avancam e escolha exatamente como o sistema reage quando um novo pedido entra no painel.
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--admin-title)]">Leitura rapida</h2>
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-header-bg)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--admin-subtle)]">Canais ativos</p>
                  <p className="mt-2 text-sm font-medium text-[var(--admin-title)]">
                    {enabledOrigins.length ? enabledOrigins.join(" • ") : "Nenhum canal habilitado"}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-header-bg)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--admin-subtle)]">Etapas variaveis</p>
                  <p className="mt-2 text-sm font-medium text-[var(--admin-title)]">
                    {enabledSteps.length ? enabledSteps.join(" • ") : "Somente etapas fixas"}
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-header-bg)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--admin-subtle)]">Impressao automatica</p>
                  <p className="mt-2 text-sm font-medium text-[var(--admin-title)]">
                    {form.autoPrintEnabled ? `${autoPrintModeLabel} • ${triggerStatusLabel}` : "Desligada no momento"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 border-t border-[#262626] bg-[#121212]/80 p-4 sm:grid-cols-2 xl:grid-cols-4 xl:p-5">
            {statCard({
              icon: <ClipboardList className="h-4 w-4" />,
              eyebrow: "Canais",
              value: `${enabledOrigins.length}/3 ativos`,
              hint: "Mesa, delivery e lancamento manual."
            })}
            {statCard({
              icon: <GitBranch className="h-4 w-4" />,
              eyebrow: "Fluxo",
              value: `${enabledSteps.length + 2} etapas`,
              hint: "Novo e concluido seguem fixos no processo."
            })}
            {statCard({
              icon: <Bell className="h-4 w-4" />,
              eyebrow: "Alerta",
              value: form.notificationsEnabled ? form.alertSound : "Silenciado",
              hint: form.notificationsEnabled ? `${form.alertVolume}% de volume configurado` : "Som desativado no painel"
            })}
            {statCard({
              icon: <Printer className="h-4 w-4" />,
              eyebrow: "Impressoras",
              value: `${printerOptions.length} ativas`,
              hint: printerOptions.length ? "Prontas para uso automatico ou manual" : "Cadastre ao menos uma para automacao"
            })}
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-[26px] border border-[#2a2a2a] bg-[#111111] p-5 admin-print-settings-dark-block">
              <div className="mb-5 flex items-start gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#2f2f2f] bg-[#171717] text-[#f2eadf]">
                  <ClipboardList className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-white">Origem do pedido</h2>
                  {sectionDescription("Defina quais canais podem gerar pedidos dentro da operacao do painel.")}
                </div>
              </div>
              <div className="grid gap-3">
                {[
                  ["enableTableOrders", "Mesa / QR Code", "Pedidos feitos pela mesa via QR Code."],
                  ["enableDeliveryOrders", "Delivery / Retirada", "Pedidos vindos do menu publico para entrega ou retirada."],
                  ["enableManualOrders", "Pedido manual do operador", "Lancamentos feitos pelo atendente no painel."]
                ].map(([key, label, description]) => (
                  <div key={key}>
                    {toggleCard({
                      checked: form[key as keyof OrderSettingsPayload] as boolean,
                      label,
                      description,
                      onChange: (checked) =>
                        setForm((current) => ({
                          ...current,
                          [key]: checked
                        }))
                    })}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[26px] border border-[#2a2a2a] bg-[#111111] p-5 admin-print-settings-dark-block">
              <div className="mb-5 flex items-start gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#2f2f2f] bg-[#171717] text-[#f2eadf]">
                  <GitBranch className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-white">Etapas do pedido</h2>
                  {sectionDescription("Novo e concluido sao fixos. As demais etapas podem ser ativadas conforme o fluxo operacional do restaurante.")}
                </div>
              </div>
              <div className="grid gap-3">
                {[
                  ["enableStepAccepted", "Aceito", "Etapa de confirmacao inicial do pedido."],
                  ["enableStepPreparing", "Preparo", "Etapa de producao na cozinha."],
                  ["enableStepDelivery", "Entrega", "Etapa final operacional antes da conclusao."]
                ].map(([key, label, description]) => (
                  <div key={key}>
                    {toggleCard({
                      checked: form[key as keyof OrderSettingsPayload] as boolean,
                      label,
                      description,
                      onChange: (checked) =>
                        setForm((current) => ({
                          ...current,
                          [key]: checked
                        }))
                    })}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="rounded-[24px] border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] p-5">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#2f2f2f] bg-[#171717] text-[#f2eadf]">
                  <Bell className="h-5 w-5" />
                </span>
                <div>
                <h2 className="text-lg font-semibold text-white">Alerta sonoro</h2>
                {sectionDescription("Controle o comportamento do alerta de novos pedidos no gestor.")}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-10 border-[#343434] bg-transparent px-4 text-[#ddd7cb] hover:bg-[#1d1d1d]"
                onClick={() => playAlertPreview(form.alertSound, form.alertVolume)}
              >
                <Volume2 className="h-4 w-4" />
                Ouvir alerta
              </Button>
            </div>

            <div className="grid gap-4">
              {toggleCard({
                checked: form.notificationsEnabled,
                label: "Notificacoes de pedidos",
                description: "Ativa os alertas sonoros para novos pedidos no painel.",
                onChange: (checked) => setForm((current) => ({ ...current, notificationsEnabled: checked }))
              })}

              <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-2xl border border-[#343434] bg-[#151515] px-4 py-4 text-white">
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="text-[#ddd7cb]">Som selecionado</span>
                    <span className="rounded-full border border-[#393939] bg-[#101010] px-2.5 py-1 text-xs font-medium text-[#f2ede4]">
                      {selectedAlertTone.profile}
                    </span>
                  </div>
                  <select
                    className={`${selectClass()} w-full`}
                    value={form.alertSound}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, alertSound: event.target.value as OrderSettingsRecord["alertSound"] }))
                    }
                  >
                    {alertOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <p className="mt-3 text-xs leading-5 text-[#9f988b]">
                    {selectedAlertTone.hint}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {alertOptions.slice(0, 4).map((option) => (
                      <span
                        key={option}
                        className={[
                          "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                          form.alertSound === option
                            ? "border-[#5b34ff] bg-[#22193f] text-[#efe8ff]"
                            : "border-[#2f2f2f] bg-[#111111] text-[#9d968a]"
                        ].join(" ")}
                      >
                        {option}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#343434] bg-[#151515] px-4 py-4 text-white">
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="text-[#ddd7cb]">Volume do toque</span>
                    <span className="rounded-full border border-[#393939] bg-[#101010] px-2.5 py-1 text-xs font-medium text-[#f2ede4]">
                      {form.alertVolume}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={form.alertVolume}
                    onChange={(event) => setForm((current) => ({ ...current, alertVolume: Number(event.target.value) }))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-[#2a2a2a] via-[#4a4a4a] to-[#5b34ff] accent-[#5b34ff]"
                  />
                  <p className="mt-3 text-xs leading-5 text-[#9f988b]">
                    Ajuste o volume do alerta para equilibrar rapidez na resposta e conforto no salao.
                  </p>
                </div>
              </div>

              <div className="grid gap-3.5">
                {alertFrequencies.map((option) => (
                  <div key={option.value}>
                    {radioCard({
                      checked: form.alertFrequency === option.value,
                      name: "alert-frequency",
                      label: option.label,
                      description:
                        option.value === "none"
                          ? "Silencia completamente novos pedidos."
                          : option.value === "once_per_order"
                            ? "Toca uma vez sempre que um novo pedido entrar."
                            : "Mantem o alerta recorrente enquanto houver pedidos novos.",
                      onChange: () => setForm((current) => ({ ...current, alertFrequency: option.value }))
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-[#2a2a2a] bg-[#111111] p-5 admin-print-settings-dark-block">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white">Impressao automatica</h2>
              {sectionDescription("Defina quando e como o sistema deve imprimir automaticamente os pedidos.")}
            </div>

            <div className="grid gap-5">
              <div className="rounded-[22px] border border-[var(--admin-panel-border)] bg-[var(--admin-panel-header-bg)] p-4">
                {toggleCard({
                  checked: form.autoPrintEnabled,
                  label: "Ativar impressao automatica",
                  description: "Quando desligada, o painel continua permitindo impressao manual normalmente.",
                  onChange: (checked) => setForm((current) => ({ ...current, autoPrintEnabled: checked }))
                })}
              </div>

              {autoPrintControlsDisabled ? (
                <div className="flex items-start gap-3 rounded-2xl border border-[#3a3021] bg-[#19150d] px-4 py-3 text-sm text-[#d5c29a]">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Ative a impressao automatica para configurar o modo de envio, a impressora principal e o momento do disparo.</p>
                </div>
              ) : null}

              <div className={`grid gap-4 xl:grid-cols-[1.2fr_0.8fr] ${autoPrintControlsDisabled ? "pointer-events-none opacity-45" : ""}`}>
                <div className="rounded-[22px] border border-[var(--admin-panel-border)] bg-[var(--admin-panel-header-bg)] p-4">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--admin-title)]">Modo de envio</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--admin-subtle)]">
                      Escolha se a comanda deve sair inteira em uma impressora ou ser distribuida conforme o destino operacional.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {autoPrintModes.map((option) => (
                      <div key={option.value}>
                        {radioCard({
                          checked: form.autoPrintMode === option.value,
                          disabled: autoPrintControlsDisabled,
                          name: "auto-print-mode",
                          label: option.label,
                          description:
                            option.value === "single_printer"
                              ? "Usa uma unica impressora para a comanda completa."
                              : "Organiza o envio conforme o destino operacional das impressoras.",
                          onChange: () => setForm((current) => ({ ...current, autoPrintMode: option.value }))
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[22px] border border-[var(--admin-panel-border)] bg-[var(--admin-panel-header-bg)] p-4">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--admin-title)]">Regra de disparo</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--admin-subtle)]">
                      Defina em que etapa o sistema tenta imprimir e, quando necessario, qual impressora deve ser usada.
                    </p>
                  </div>

                  <div className="grid gap-4">
                    <div className={singlePrinterMode ? "" : "opacity-60"}>
                      <label className="mb-2 block text-sm font-medium text-[var(--admin-title)]">
                        Impressora principal
                      </label>
                      <p className="mb-3 text-xs leading-5 text-[var(--admin-subtle)]">
                        Usada somente quando o modo estiver em impressao unica.
                      </p>
                      <select
                        disabled={autoPrintControlsDisabled || !singlePrinterMode}
                        className={selectClass(autoPrintControlsDisabled || !singlePrinterMode)}
                        value={form.defaultAutoPrintPrinterId ?? ""}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            defaultAutoPrintPrinterId: event.target.value || null
                          }))
                        }
                      >
                        <option value="">
                          {printerOptions.length ? "Selecione uma impressora" : "Nenhuma impressora ativa disponivel"}
                        </option>
                        {printerOptions.map((printer) => (
                          <option key={printer.id} value={printer.id}>
                            {printer.name} - {printer.destination}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-[var(--admin-title)]">Imprimir quando o pedido estiver em</label>
                      <p className="mb-3 text-xs leading-5 text-[var(--admin-subtle)]">
                        O disparo automatico costuma funcionar melhor quando o pedido entra em aceite.
                      </p>
                      <select
                        disabled={autoPrintControlsDisabled}
                        className={selectClass(autoPrintControlsDisabled)}
                        value={form.autoPrintTriggerStatus}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            autoPrintTriggerStatus: event.target.value as OrderSettingsRecord["autoPrintTriggerStatus"]
                          }))
                        }
                      >
                        <option value="novo">novo</option>
                        <option value="aceito">aceito</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {form.autoPrintEnabled && form.autoPrintMode === "by_destination" ? (
                <div className="rounded-[24px] border border-[#343434] bg-[#151515] p-4">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#d9d3c7]">
                        Destinos operacionais
                      </h3>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#a9a396]">
                        No modo por destino, o sistema distribui automaticamente a impressao conforme as impressoras ativas cadastradas para cada area.
                      </p>
                    </div>
                    <div className="rounded-full border border-[#333333] bg-[#101010] px-3 py-1 text-xs font-medium text-[#d8d1c4]">
                      {destinationAssignments.length} destinos monitorados
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {destinationAssignments.map((item) => (
                      <div key={item.destination} className="rounded-2xl border border-[#2c2c2c] bg-[#121212] p-4">
                        <label className="mb-2 block text-sm font-medium text-[#ece6db]">{item.label}</label>
                        <select disabled className={selectClass(true)} value={item.selectedId}>
                          <option value="">
                            {item.options.length
                              ? "Selecao automatica pelo destino"
                              : "Nenhuma impressora ativa para este destino"}
                          </option>
                          {item.options.map((printer) => (
                            <option key={printer.id} value={printer.id}>
                              {printer.name} - {printer.destination}
                            </option>
                          ))}
                        </select>
                        <p className="mt-2 text-xs leading-5 text-[#9f998d]">
                          {item.options.length
                            ? "O encaminhamento e definido automaticamente a partir das impressoras ativas com este destino."
                            : "Cadastre ou ative uma impressora com este destino para usar a separacao operacional."}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <div className="admin-print-settings-dark-block flex flex-col gap-3 rounded-[24px] border border-[#2a2a2a] bg-[#111111] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white">Pronto para aplicar as configuracoes?</p>
              <p className="mt-1 text-sm text-[#a9a396]">
                As alteracoes afetam o comportamento do gestor, dos alertas e da impressao automatica.
              </p>
            </div>
            <Button type="submit" variant="admin" className="w-full sm:w-auto" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Salvando..." : "Salvar configuracoes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
