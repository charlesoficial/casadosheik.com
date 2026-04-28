import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { requireAdminUser } from "@/lib/auth/server";
import { linesToEscPos } from "@/lib/escpos";
import { sendNetworkPrint } from "@/lib/printing/network-print";
import { listPrinters } from "@/lib/printers";
import { formatZodError } from "@/lib/validators";

const dispatchSchema = z.object({
  lines: z.array(z.string().trim().min(1)).min(1)
});

// Faz o envio server-side para impressoras de rede, sem depender de bridge local no navegador.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;

    const payload = dispatchSchema.parse(await request.json().catch(() => ({})));
    const printers = await listPrinters();
    const printer = printers.find((item) => item.id === id);

    if (!printer) {
      return NextResponse.json({ error: "Impressora nao encontrada." }, { status: 404 });
    }

    if (printer.type !== "network") {
      return NextResponse.json({ error: "Esta rota atende somente impressoras por IP/rede." }, { status: 400 });
    }

    if (!printer.isActive) {
      return NextResponse.json({ error: "A impressora esta desativada." }, { status: 400 });
    }

    await sendNetworkPrint({
      host: printer.ipAddress || "",
      port: printer.port || 9100,
      content: linesToEscPos(payload.lines)
    });

    return NextResponse.json({
      success: true,
      message: "Impressao enviada para a impressora de rede."
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    if (error instanceof ZodError) {
      return NextResponse.json({ error: formatZodError(error) }, { status: 422 });
    }

    const message = error instanceof Error ? error.message : "Erro ao enviar impressao para a rede.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
