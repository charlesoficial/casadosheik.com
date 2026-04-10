import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getOrderDetail } from "@/lib/data";
import { createPrintJob } from "@/lib/print-jobs";
import { buildOrderPrintLines } from "@/lib/print-templates";
import { getPrintersForDispatch, listPrinters, resolveDestinationsForOrder } from "@/lib/printers";
import { requireAdminUser } from "@/lib/auth/server";
import { formatZodError, orderPrintRequestSchema } from "@/lib/validators";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdminUser();
    const body = orderPrintRequestSchema.parse(await request.json().catch(() => ({})));
    const order = await getOrderDetail(params.id);
    const triggerSource = body.triggerSource ?? "manual_reprint";
    const printers = body.printerId
      ? (await listPrinters()).filter(
          (printer) =>
            printer.id === body.printerId &&
            printer.isActive &&
            (triggerSource !== "auto_accept" || printer.autoPrintOnAccept)
        )
      : (
          await Promise.all(
            (
              body.destination && body.destination !== "all"
                ? [body.destination]
                : resolveDestinationsForOrder(order)
            ).map((destination) => getPrintersForDispatch(destination))
          )
        )
          .flat()
          .filter((printer, index, current) => current.findIndex((item) => item.id === printer.id) === index)
          .filter((printer) => triggerSource !== "auto_accept" || printer.autoPrintOnAccept);

    const jobs = await Promise.all(
      printers.map(async (printer) => {
        const lines = buildOrderPrintLines(order, printer.destination);
        const printJob = await createPrintJob({
          orderId: order.id,
          printerId: printer.id,
          printerName: printer.name,
          destination: printer.destination,
          transportType: printer.type,
          triggerSource,
          attemptCount: Math.max(1, printer.copies || 1),
          payloadPreview: lines.slice(0, 16).join("\n")
        });

        return {
          printer,
          lines,
          printJob
        };
      })
    );

    return NextResponse.json({
      order,
      jobs,
      message: jobs.length
        ? "Impressao preparada para dispatch."
        : "Nenhuma impressora ativa encontrada. Use o fallback manual."
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Pedido nao encontrado") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: formatZodError(error) }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "Erro ao preparar impressao.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
