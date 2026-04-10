import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createCategory } from "@/lib/data";
import { requireAdminUser } from "@/lib/auth/server";
import { categoryCreateSchema, formatZodError } from "@/lib/validators";

// Cria novas categorias para o cardápio administrativo.
export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const payload = categoryCreateSchema.parse(await request.json());
    const category = await createCategory(payload);
    return NextResponse.json(category);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: formatZodError(error) }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "Erro ao criar categoria";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
