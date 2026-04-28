import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { deletePrinter, updatePrinter } from "@/lib/printers";
import { requireAdminUser } from "@/lib/auth/server";
import { formatZodError, printerPayloadSchema } from "@/lib/validators";

// Atualiza ou remove uma impressora cadastrada.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const payload = printerPayloadSchema.parse(await request.json());
    const printer = await updatePrinter(id, payload);
    return NextResponse.json(printer);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: formatZodError(error) }, { status: 422 });
    }
    return NextResponse.json({ error: "Erro ao atualizar impressora." }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const result = await deletePrinter(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro ao excluir impressora." }, { status: 500 });
  }
}
