import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { closeDirectOrder } from "@/lib/data";
import { requireAdminUser } from "@/lib/auth/server";
import { closeDirectOrderSchema, formatZodError } from "@/lib/validators";

// Fecha financeiramente pedidos que não passam por mesa, como delivery e retirada.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAdminUser();
    const payload = closeDirectOrderSchema.parse(await request.json());
    const closedBy =
      user?.user_metadata?.name ||
      user?.user_metadata?.full_name ||
      user?.email ||
      null;
    const result = await closeDirectOrder(params.id, payload.paymentMethod, closedBy);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: formatZodError(error) }, { status: 422 });
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : "Erro ao fechar pedido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
