import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAdminUser } from "@/lib/auth/server";
import { getOrderDetail, updateOrderStatus } from "@/lib/data";
import { formatZodError, orderStatusUpdateSchema } from "@/lib/validators";

// Rota administrativa dedicada para detalhe e transicao de status do pedido.
// Aqui nao existe fallback publico: sem sessao valida, a API deve falhar fechada.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const order = await getOrderDetail(id);
    return NextResponse.json(order);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Pedido nao encontrado") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao buscar pedido" }, { status: 400 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const body = orderStatusUpdateSchema.parse(await request.json());
    const order = await updateOrderStatus(id, body.status);
    return NextResponse.json(order);
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
    return NextResponse.json({ error: "Erro ao atualizar pedido" }, { status: 400 });
  }
}
