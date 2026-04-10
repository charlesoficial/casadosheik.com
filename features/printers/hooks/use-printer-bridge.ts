"use client";

import { useMemo } from "react";

import { linesToEscPos } from "@/lib/escpos";
import { useQzTray } from "@/features/printers/hooks/use-qz-tray";
import type { PrintDispatchResult, PrinterRecord } from "@/lib/types";

// Ponte entre a camada de impressao do painel e os providers reais do navegador/desktop.
// Hoje a impressao USB depende de QZ Tray; rede ainda esta preparada para evolucao futura.
export function usePrinterBridge() {
  const qzTray = useQzTray();

  async function printToPrinter(printer: PrinterRecord, lines: string[]): Promise<PrintDispatchResult> {
    if (printer.type === "usb") {
      if (!printer.printerName) {
        return {
          printerId: printer.id,
          printerName: printer.name,
          destination: printer.destination,
          type: printer.type,
          success: false,
          mode: "usb",
          message: "printer_name nao configurado."
        };
      }

      try {
        // O payload vai em ESC/POS para manter compatibilidade com impressoras termicas.
        await qzTray.print(printer.printerName, [linesToEscPos(lines)]);
        return {
          printerId: printer.id,
          printerName: printer.name,
          destination: printer.destination,
          type: printer.type,
          success: true,
          mode: "usb",
          message: "Impressao enviada via QZ Tray."
        };
      } catch (error) {
        return {
          printerId: printer.id,
          printerName: printer.name,
          destination: printer.destination,
          type: printer.type,
          success: false,
          mode: "usb",
          message: error instanceof Error ? error.message : "Falha na impressao USB."
        };
      }
    }

    try {
      const response = await fetch(`/api/admin/printers/${printer.id}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines })
      });
      const data = (await response.json().catch(() => ({}))) as { message?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Falha na impressao por rede.");
      }

      return {
        printerId: printer.id,
        printerName: printer.name,
        destination: printer.destination,
        type: printer.type,
        success: true,
        mode: "network",
        message: data.message || "Impressao enviada para a impressora de rede."
      };
    } catch (error) {
      return {
        printerId: printer.id,
        printerName: printer.name,
        destination: printer.destination,
        type: printer.type,
        success: false,
        mode: "network",
        message: error instanceof Error ? error.message : "Falha na impressao por rede."
      };
    }
  }

  return useMemo(
    () => ({
      automaticPrintingAvailable: qzTray.connected,
      provider: qzTray.connected ? ("qz-tray" as const) : ("manual" as const),
      connectQzTray: qzTray.connect,
      availableUsbPrinters: qzTray.installedPrinters,
      qzAvailable: qzTray.available,
      qzSecurityMode: qzTray.securityMode,
      qzStatusMessage: qzTray.statusMessage,
      refreshUsbPrinters: qzTray.refreshInstalledPrinters,
      printToPrinter
    }),
    [qzTray]
  );
}
