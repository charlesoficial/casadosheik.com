import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/auth/server";
import { moveProductToCategory } from "@/lib/data";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const body = (await request.json()) as { categoryId?: unknown };
    const categoryId = typeof body.categoryId === "string" ? body.categoryId : "";

    if (!categoryId) {
      return NextResponse.json({ error: "Categoria invalida" }, { status: 422 });
    }

    const product = await moveProductToCategory(id, categoryId);
    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Erro ao mover produto";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
