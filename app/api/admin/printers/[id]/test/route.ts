import { NextResponse } from "next/server";

import { createPrintJob } from "@/lib/print-jobs";
import { buildTestPrintLines } from "@/lib/print-templates";
import { listPrinters } from "@/lib/printers";
import { requireAdminUser } from "@/lib/auth/server";

// Faz um disparo de teste para validar se a impressora cadastrada responde como esperado.
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const printers = await listPrinters();
    const printer = printers.find((item) => item.id === id);
    if (!printer) {
      throw new Error("Impressora nao encontrada.");
    }

    const lines = buildTestPrintLines(printer);
    const printJob = await createPrintJob({
      printerId: printer.id,
      printerName: printer.name,
      destination: printer.destination,
      transportType: printer.type,
      triggerSource: "test",
      payloadPreview: lines.slice(0, 8).join("\n")
    });

    return NextResponse.json({
      printer,
      lines,
      printJob,
      message: "Teste de impressao preparado."
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Erro ao preparar teste.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
