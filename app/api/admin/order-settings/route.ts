import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getOrderSettings, updateOrderSettings } from "@/lib/order-settings";
import { listPrinters } from "@/lib/printers";
import { requireAdminUser } from "@/lib/auth/server";
import { formatZodError, orderSettingsUpdateSchema } from "@/lib/validators";

export async function GET() {
  try {
    await requireAdminUser();
    const printers = await listPrinters();
    const activePrinters = printers.filter((printer) => printer.isActive);
    const settings = await getOrderSettings(activePrinters);
    return NextResponse.json({
      settings,
      activePrinters
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro ao buscar configuracoes de pedidos." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminUser();
    const payload = orderSettingsUpdateSchema.parse(await request.json());
    const printers = await listPrinters();
    const activePrinters = printers.filter((printer) => printer.isActive);
    const settings = await updateOrderSettings(payload, activePrinters);
    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: formatZodError(error) }, { status: 422 });
    }
    return NextResponse.json({ error: "Erro ao salvar configuracoes de pedidos." }, { status: 500 });
  }
}
