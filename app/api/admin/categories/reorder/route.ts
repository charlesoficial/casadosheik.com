import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/auth/server";
import { reorderCategories } from "@/lib/data";

export async function PATCH(request: Request) {
  try {
    await requireAdminUser();
    const body = (await request.json()) as { ids?: unknown };
    const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === "string") : [];
    if (!ids.length) {
      return NextResponse.json({ error: "Lista de categorias invalida" }, { status: 422 });
    }

    const result = await reorderCategories(ids);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Erro ao reordenar categorias";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
