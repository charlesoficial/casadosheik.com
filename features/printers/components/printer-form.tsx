"use client";

import { useEffect, useState } from "react";
import { Info, Layers3, Printer, Wifi } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { PrinterPayload, PrinterRecord } from "@/lib/types";

const destinations: PrinterPayload["destination"][] = ["caixa", "cozinha", "bar", "delivery", "geral"];

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

  // Mantem o formulario sincronizado com o card selecionado para edicao.
  useEffect(() => {
    setForm(createInitialForm(initialValue));
  }, [initialValue]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
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
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  return (
    <Card className="admin-printers-shell-card border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] shadow-[var(--admin-panel-shadow)]">
      <CardContent className="space-y-4 p-4">
        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--admin-subtle)]">
              {initialValue ? "Editar impressora" : "Nova impressora"}
            </p>
            <h2 className="text-2xl font-semibold text-[var(--admin-title)]">
              {initialValue ? initialValue.name : "Cadastrar impressora operacional"}
            </h2>
            <p className="text-sm leading-6 text-[var(--admin-subtle)]">
              Cadastre aqui a impressora usada no caixa, cozinha, bar ou delivery. Para USB, o nome deve bater com o QZ Tray.
            </p>
          </div>

          <div className="admin-panel-block rounded-2xl p-4">
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-[var(--admin-subtle)]">Nome interno</label>
            <Input
              placeholder="Ex.: Caixa USB - frente"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
            <p className="mt-2 text-xs text-[var(--admin-subtle)]">Este nome aparece no painel e nos logs de impressao.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="admin-panel-block rounded-2xl p-4">
              <label className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[var(--admin-subtle)]">
                {form.type === "usb" ? <Printer className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
                Tipo de conexao
              </label>
              <select
                className="h-11 w-full rounded-xl border border-[var(--admin-control-border)] bg-[var(--ui-input-bg)] px-4 text-sm text-[var(--ui-input-fg)]"
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as PrinterPayload["type"] }))}
              >
                <option value="usb">USB + QZ Tray</option>
                <option value="network">Rede (IP + porta)</option>
              </select>
              <p className="mt-2 text-xs text-[var(--admin-subtle)]">
                USB via QZ Tray e o caminho mais simples. Se a sua impressora aceitar ESC/POS por TCP, o modo rede tambem funciona por IP e porta.
              </p>
            </div>
            <div className="admin-panel-block rounded-2xl p-4">
              <label className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[var(--admin-subtle)]">
                <Layers3 className="h-3.5 w-3.5" />
                Destino operacional
              </label>
              <select
                className="h-11 w-full rounded-xl border border-[var(--admin-control-border)] bg-[var(--ui-input-bg)] px-4 text-sm text-[var(--ui-input-fg)]"
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
              <p className="mt-2 text-xs text-[var(--admin-subtle)]">
                Isso define para onde a impressao automatica envia a comanda quando o modo estiver por destino.
              </p>
            </div>
          </div>

          {form.type === "usb" ? (
            <div className="admin-panel-block rounded-2xl p-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-[var(--admin-subtle)]">Nome visto pelo QZ Tray</label>
              {availableUsbPrinters.length ? (
                <select
                  className="h-11 w-full rounded-xl border border-[var(--admin-control-border)] bg-[var(--ui-input-bg)] px-4 text-sm text-[var(--ui-input-fg)]"
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
                <Input
                  placeholder="printer_name no QZ Tray"
                  value={form.printerName}
                  onChange={(event) => setForm((current) => ({ ...current, printerName: event.target.value }))}
                />
              )}
              <p className="mt-2 text-xs text-[var(--admin-subtle)]">
                Se a lista vier vazia, conecte o QZ Tray acima e digite manualmente exatamente o nome mostrado nele.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="admin-panel-block rounded-2xl p-4">
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-[var(--admin-subtle)]">IP da impressora</label>
                <Input
                  placeholder="192.168.0.50"
                  value={form.ipAddress}
                  onChange={(event) => setForm((current) => ({ ...current, ipAddress: event.target.value }))}
                />
              </div>
              <div className="admin-panel-block rounded-2xl p-4">
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-[var(--admin-subtle)]">Porta</label>
                <Input
                  placeholder="9100"
                  value={String(form.port ?? 9100)}
                  onChange={(event) => setForm((current) => ({ ...current, port: Number(event.target.value) || 9100 }))}
                />
              </div>
            </div>
          )}

          {form.type === "network" ? (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-100">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                O modo rede envia ESC/POS bruto por TCP, normalmente na porta 9100. Confirme no manual da sua impressora se esse protocolo esta habilitado.
              </p>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="admin-panel-block rounded-2xl p-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-[var(--admin-subtle)]">Copias</label>
              <Input
                placeholder="1"
                value={String(form.copies ?? 1)}
                onChange={(event) => setForm((current) => ({ ...current, copies: Number(event.target.value) || 1 }))}
              />
            </div>
            <label className="admin-option-card flex items-center gap-2 rounded-2xl px-4 text-sm text-[var(--admin-title)]">
              <input
                type="checkbox"
                checked={form.autoPrintOnAccept ?? true}
                onChange={(event) => setForm((current) => ({ ...current, autoPrintOnAccept: event.target.checked }))}
              />
              Auto print ao aceitar
            </label>
            <label className="admin-option-card flex items-center gap-2 rounded-2xl px-4 text-sm text-[var(--admin-title)]">
              <input
                type="checkbox"
                checked={form.isActive ?? true}
                onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
              />
              Ativa
            </label>
          </div>

          {formError ? (
            <p className="text-sm text-red-400">{formError}</p>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" variant="admin" disabled={loading}>
              {initialValue ? "Salvar impressora" : "Cadastrar impressora"}
            </Button>
            {onCancel ? (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
