import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { closeTableAccount } from "@/lib/data";
import { requireAdminUser } from "@/lib/auth/server";
import { closeTableAccountSchema, formatZodError } from "@/lib/validators";

// Fecha a conta consolidada de uma mesa após os pedidos operacionais estarem concluídos.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAdminUser();
    const payload = closeTableAccountSchema.parse(await request.json());
    const closedBy =
      user?.user_metadata?.name ||
      user?.user_metadata?.full_name ||
      user?.email ||
      null;
    const result = await closeTableAccount(params.id, payload.paymentMethod, closedBy);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: formatZodError(error) }, { status: 422 });
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : "Erro ao fechar mesa";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
