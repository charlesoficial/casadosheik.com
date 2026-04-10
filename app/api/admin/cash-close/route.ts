import { NextResponse } from "next/server";

import { closeCashRegister, getCashClosingSummary } from "@/lib/data";
import { cashCloseRequestSchema, formatZodError } from "@/lib/validators";
import { requireAdminUser } from "@/lib/auth/server";

export async function GET() {
  try {
    await requireAdminUser();
    const summary = await getCashClosingSummary();
    return NextResponse.json(summary);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Erro ao buscar fechamento de caixa.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAdminUser();
    const body = await request.json().catch(() => ({}));
    const parsed = cashCloseRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }

    const closedBy =
      user?.user_metadata?.name ||
      user?.user_metadata?.full_name ||
      user?.email ||
      null;
    const result = await closeCashRegister(undefined, { note: parsed.data.note ?? null, closedBy });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Erro ao fechar caixa.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
