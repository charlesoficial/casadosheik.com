import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { deleteCategory, updateCategory } from "@/lib/data";
import { requireAdminUser } from "@/lib/auth/server";
import { categoryUpdateSchema, formatZodError } from "@/lib/validators";

// Atualiza ou remove uma categoria específica do cardápio.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const payload = categoryUpdateSchema.parse(await request.json());
    const category = await updateCategory(id, payload);
    return NextResponse.json(category);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: formatZodError(error) }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "Erro ao atualizar categoria";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const result = await deleteCategory(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Erro ao excluir categoria";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
