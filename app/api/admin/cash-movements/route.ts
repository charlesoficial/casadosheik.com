import { NextResponse } from "next/server";

import { createCashMovement } from "@/lib/data";
import { requireAdminUser } from "@/lib/auth/server";
import { cashMovementRequestSchema, formatZodError } from "@/lib/validators";

// Registra sangria e suprimento do caixa.
// Essas movimentações alteram o saldo esperado em dinheiro, mas não o faturamento bruto.
export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const body = await request.json().catch(() => ({}));
    const parsed = cashMovementRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }

    const movement = await createCashMovement(parsed.data);
    return NextResponse.json(movement);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Erro ao registrar movimentacao de caixa.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
