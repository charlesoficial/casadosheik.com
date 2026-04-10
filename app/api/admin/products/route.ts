import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createProduct } from "@/lib/data";
import { requireAdminUser } from "@/lib/auth/server";
import { formatZodError, productCreateSchema } from "@/lib/validators";

// Cria novos produtos do cardápio administrativo.
export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const payload = productCreateSchema.parse(await request.json());
    const product = await createProduct(payload);
    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: formatZodError(error) }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "Erro ao criar produto";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
