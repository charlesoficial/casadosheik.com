"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Info, Layers3, Printer, Wifi } from "lucide-react";

import { DSBadge, DSButton, DSCard, DSFeedback, DSInput } from "@/components/system";
import type { PrinterPayload, PrinterRecord } from "@/lib/types";

const destinations: PrinterPayload["destination"][] = ["caixa", "cozinha", "bar", "delivery", "geral"];

function selectClass() {
  return "h-11 w-full rounded-ds-md border border-admin-border-strong bg-admin-surface px-4 text-sm text-admin-fg transition-colors duration-motion-fast hover:border-brand-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/40";
}

function switchField({
  checked,
  label,
  hint,
  onChange
}: {
  checked: boolean;
  label: string;
  hint: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-ds-lg border border-admin-border bg-admin-elevated px-4 py-4 text-sm transition-colors duration-motion-fast hover:border-admin-border-strong">
      <span>
        <span className="block font-semibold text-admin-fg">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-admin-fg-muted">{hint}</span>
      </span>
      <span
        aria-hidden="true"
        className={[
          "relative mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition-all duration-motion-fast",
          checked ? "border-brand-purple bg-brand-purple shadow-soft" : "border-admin-border-strong bg-admin-surface"
        ].join(" ")}
      >
        <span
          className={[
            "h-5 w-5 rounded-full bg-admin-fg transition-transform duration-motion-fast",
            checked ? "translate-x-5" : "translate-x-0"
          ].join(" ")}
        />
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />
    </label>
  );
}

export function PrinterForm({
  initialValue,
  availableUsbPrinters = [],
  onSubmit,
  onCancel
}: {
  initialValue?: PrinterRecord | null;
  availableUsbPrinters?: string[];
  onSubmit: (payload: PrinterPayload) => Promise<void>;
  onCancel?: () => void;
}) {
  const createInitialForm = (printer?: PrinterRecord | null): PrinterPayload => ({
    name: printer?.name || "",
    type: printer?.type || "usb",
    destination: printer?.destination || "caixa",
    printerName: printer?.printerName || "",
    ipAddress: printer?.ipAddress || "",
    port: printer?.port || 9100,
    copies: printer?.copies || 1,
    autoPrintOnAccept: printer?.autoPrintOnAccept ?? true,
    isActive: printer?.isActive ?? true
  });

  const [form, setForm] = useState<PrinterPayload>(createInitialForm(initialValue));
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Mantem o formulario sincronizado com o card selecionado para edicao.
  useEffect(() => {
    setForm(createInitialForm(initialValue));
  }, [initialValue]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setFormError(null);

    const normalizedPayload: PrinterPayload = {
      ...form,
      name: form.name.trim(),
      printerName: form.printerName?.trim() || "",
      ipAddress: form.ipAddress?.trim() || ""
    };

    if (!normalizedPayload.name) {
      setFormError("Informe o nome interno da impressora.");
      setLoading(false);
      return;
    }

    if (normalizedPayload.type === "usb" && !normalizedPayload.printerName) {
      setFormError("Selecione ou informe o nome da impressora visto pelo QZ Tray.");
      setLoading(false);
      return;
    }

    if (normalizedPayload.type === "network" && !normalizedPayload.ipAddress) {
      setFormError("Informe o IP da impressora de rede.");
      setLoading(false);
      return;
    }

    try {
      await onSubmit(normalizedPayload);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar impressora.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DSCard variant="admin-panel" className="overflow-hidden shadow-panel">
      <div className="border-b border-admin-border bg-admin-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-admin-fg-faint">
              {initialValue ? "Editar setup" : "Novo setup"}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-admin-fg">
              {initialValue ? initialValue.name : "Cadastrar impressora"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-admin-fg-muted">
              Vincule destino, conexao e regra de automacao da impressora.
            </p>
          </div>
          <DSBadge variant={form.type === "usb" ? "info" : "warning"}>
            {form.type === "usb" ? "USB" : "Rede"}
          </DSBadge>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 p-5">
        <div className="rounded-ds-xl border border-admin-border bg-admin-elevated p-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-admin-fg-faint">
            Nome da impressora
          </label>
          <DSInput
            placeholder="Ex.: Caixa USB - frente"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
          <p className="mt-2 text-xs text-admin-fg-muted">Nome usado no painel e nos logs.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-ds-xl border border-admin-border bg-admin-elevated p-4">
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-admin-fg-faint">
              {form.type === "usb" ? <Printer className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
              Tipo de conexao
            </label>
            <select
              className={selectClass()}
              value={form.type}
              onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as PrinterPayload["type"] }))}
            >
              <option value="usb">USB via QZ Tray</option>
              <option value="network">Rede - IP + porta TCP</option>
            </select>
            <p className="mt-2 text-xs leading-5 text-admin-fg-muted">
              USB e recomendado para operacao local.
            </p>
          </div>
          <div className="rounded-ds-xl border border-admin-border bg-admin-elevated p-4">
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-admin-fg-faint">
              <Layers3 className="h-3.5 w-3.5" />
              Destino
            </label>
            <select
              className={selectClass()}
              value={form.destination}
              onChange={(event) =>
                setForm((current) => ({ ...current, destination: event.target.value as PrinterPayload["destination"] }))
              }
            >
              {destinations.map((destination) => (
                <option key={destination} value={destination}>
                  {destination}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs leading-5 text-admin-fg-muted">
              Define o roteamento da comanda.
            </p>
          </div>
        </div>

        {form.type === "usb" ? (
          <div className="rounded-ds-xl border border-admin-border bg-admin-elevated p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-admin-fg-faint">
                Nome no QZ Tray
              </label>
              <DSBadge variant={availableUsbPrinters.length ? "success" : "secondary"}>
                {availableUsbPrinters.length ? `${availableUsbPrinters.length} detectadas` : "Manual"}
              </DSBadge>
            </div>
            {availableUsbPrinters.length ? (
              <select
                className={selectClass()}
                value={form.printerName}
                onChange={(event) => setForm((current) => ({ ...current, printerName: event.target.value }))}
              >
                <option value="">Selecione uma impressora USB detectada</option>
                {availableUsbPrinters.map((printerName) => (
                  <option key={printerName} value={printerName}>
                    {printerName}
                  </option>
                ))}
              </select>
            ) : (
              <DSInput
                placeholder="printer_name no QZ Tray"
                value={form.printerName}
                onChange={(event) => setForm((current) => ({ ...current, printerName: event.target.value }))}
              />
            )}
            <p className="mt-2 text-xs leading-5 text-admin-fg-muted">
              O nome precisa bater com o QZ Tray.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-ds-xl border border-admin-border bg-admin-elevated p-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-admin-fg-faint">
                Endereco IP
              </label>
              <DSInput
                placeholder="192.168.0.50"
                value={form.ipAddress}
                onChange={(event) => setForm((current) => ({ ...current, ipAddress: event.target.value }))}
              />
            </div>
            <div className="rounded-ds-xl border border-admin-border bg-admin-elevated p-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-admin-fg-faint">
                Porta TCP
              </label>
              <DSInput
                placeholder="9100"
                value={String(form.port ?? 9100)}
                onChange={(event) => setForm((current) => ({ ...current, port: Number(event.target.value) || 9100 }))}
              />
            </div>
          </div>
        )}

        {form.type === "network" ? (
          <div className="flex items-start gap-3 rounded-ds-lg border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-status-warning-fg">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Confirme ESC/POS via TCP no manual da impressora, geralmente porta 9100.</p>
          </div>
        ) : null}

        <div className="grid gap-3">
          <div className="rounded-ds-xl border border-admin-border bg-admin-elevated p-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-admin-fg-faint">
              Copias por impressao
            </label>
            <DSInput
              placeholder="1"
              value={String(form.copies ?? 1)}
              onChange={(event) => setForm((current) => ({ ...current, copies: Number(event.target.value) || 1 }))}
            />
          </div>

          {switchField({
            checked: form.autoPrintOnAccept ?? true,
            label: "Auto print no aceite",
            hint: "Dispara automaticamente quando o pedido for aceito.",
            onChange: (checked) => setForm((current) => ({ ...current, autoPrintOnAccept: checked }))
          })}
          {switchField({
            checked: form.isActive ?? true,
            label: "Impressora ativa",
            hint: "Permite uso manual, testes e automacao.",
            onChange: (checked) => setForm((current) => ({ ...current, isActive: checked }))
          })}
        </div>

        {formError ? (
          <DSFeedback variant="error" title={formError} />
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <DSButton type="submit" variant="admin" disabled={loading} className="w-full sm:w-auto">
            {loading ? "Salvando..." : initialValue ? "Salvar impressora" : "Cadastrar impressora"}
          </DSButton>
          {onCancel ? (
            <DSButton type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
              Cancelar edicao
            </DSButton>
          ) : null}
        </div>
      </form>
    </DSCard>
  );
}
