import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { deleteProduct, updateProduct } from "@/lib/data";
import { requireAdminUser } from "@/lib/auth/server";
import { formatZodError, productUpdateSchema } from "@/lib/validators";

// Atualiza ou remove um produto específico do cardápio.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const payload = productUpdateSchema.parse(await request.json());
    const product = await updateProduct(id, payload);
    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: formatZodError(error) }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "Erro ao atualizar produto";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
    const { id } = await params;
    const result = await deleteProduct(id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Erro ao excluir produto";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
