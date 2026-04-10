import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getOrderDetail, updateOrderStatus } from "@/lib/data";
import { requireAdminUser } from "@/lib/auth/server";
import { formatZodError, orderStatusUpdateSchema } from "@/lib/validators";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    try {
      await requireAdminUser();
      const order = await getOrderDetail(params.id);
      return NextResponse.json(order);
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "UNAUTHORIZED") {
        throw error;
      }
    }

    const token = new URL(request.url).searchParams.get("token");
    const order = await getOrderDetail(params.id, { publicToken: token, requirePublicToken: true });
    return NextResponse.json(order);
  } catch (error) {
    if (error instanceof Error && error.message === "Pedido nao encontrado") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Erro ao buscar pedido" }, { status: 400 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdminUser();
    const body = orderStatusUpdateSchema.parse(await request.json());
    const order = await updateOrderStatus(params.id, body.status);
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
    const message = error instanceof Error ? error.message : "Erro ao atualizar pedido";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
