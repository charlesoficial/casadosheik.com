"use client";

import { useState } from "react";

import { usePrinterBridge } from "@/features/printers/hooks/use-printer-bridge";
import { DSButton } from "@/components/system";
import type { PrinterRecord } from "@/lib/types";

export function PrinterTestButton({
  printer,
  onFeedback,
  onCompleted
}: {
  printer: PrinterRecord;
  onFeedback: (message: string, isError?: boolean) => void;
  onCompleted?: () => void;
}) {
  const bridge = usePrinterBridge();
  const [loading, setLoading] = useState(false);

  async function handleTest() {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/printers/${printer.id}/test`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha no teste.");

      const result = await bridge.printToPrinter(printer, data.lines);
      if (data.printJob?.id) {
        try {
          await fetch(`/api/admin/print-jobs/${data.printJob.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: result.success ? "success" : "failed",
              errorMessage: result.success ? null : result.message
            })
          });
        } catch {
          // Mantem o teste operacional mesmo se o log falhar.
        }
      }
      onFeedback(result.message, !result.success);
    } catch (error) {
      onFeedback(error instanceof Error ? error.message : "Falha no teste.", true);
    } finally {
      onCompleted?.();
      setLoading(false);
    }
  }

  return (
    <DSButton
      type="button"
      variant="outline"
      size="sm"
      onClick={handleTest}
      disabled={loading}
      title="Enviar ticket de teste"
    >
      {loading ? "Testando..." : "Testar"}
    </DSButton>
  );
}
