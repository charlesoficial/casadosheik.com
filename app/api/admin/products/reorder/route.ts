import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/auth/server";
import { reorderProducts } from "@/lib/data";

export async function PATCH(request: Request) {
  try {
    await requireAdminUser();
    const body = (await request.json()) as { categoryId?: unknown; ids?: unknown };
    const categoryId = typeof body.categoryId === "string" ? body.categoryId : "";
    const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === "string") : [];

    if (!categoryId || !ids.length) {
      return NextResponse.json({ error: "Lista de produtos invalida" }, { status: 422 });
    }

    const result = await reorderProducts(categoryId, ids);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Erro ao reordenar produtos";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
