import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createPrinter, listPrinters } from "@/lib/printers";
import { requireAdminUser } from "@/lib/auth/server";
import { formatZodError, printerPayloadSchema } from "@/lib/validators";

// Lista e cria impressoras usadas pela operação.
export async function GET() {
  try {
    await requireAdminUser();
    const printers = await listPrinters();
    return NextResponse.json(printers);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro ao listar impressoras." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const payload = printerPayloadSchema.parse(await request.json());
    const printer = await createPrinter(payload);
    return NextResponse.json(printer);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: formatZodError(error) }, { status: 422 });
    }
    return NextResponse.json({ error: "Erro ao criar impressora." }, { status: 500 });
  }
}
