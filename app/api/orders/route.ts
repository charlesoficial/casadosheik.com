import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createOrderFromCheckout } from "@/lib/data";
import { rateLimit } from "@/lib/security/rate-limit";
import { checkoutPayloadSchema, formatZodError } from "@/lib/validators";

// Esta rota recebe pedidos publicos do cardapio e valida tudo no servidor
// antes de persistir qualquer dado operacional.
export async function POST(request: Request) {
  try {
    // O checkout fica publico, então limitamos volume por IP para reduzir abuso
    // e disparos acidentais do formulario.
    const ip =
      request.headers
        .get("x-forwarded-for")
        ?.split(",")[0]
        ?.trim() ||
      request.headers.get("x-real-ip") ||
      "anonymous";
    const allowed = rateLimit(ip, 10, 60_000);

    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // A validacao estrutural acontece aqui, antes da regra de negocio buscar
    // produtos e precos reais no servidor.
    const payload = checkoutPayloadSchema.parse(await request.json());
    const order = await createOrderFromCheckout(payload);

    return NextResponse.json(order);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: formatZodError(error) }, { status: 422 });
    }

    const safeMessage =
      error instanceof Error &&
      [
        "Nome e telefone sao obrigatorios para delivery.",
        "Rua e obrigatoria para delivery.",
        "Numero e obrigatorio para delivery.",
        "Bairro e obrigatorio para delivery.",
        "Pedido sem itens",
        "Carrinho com produto invalido.",
        "Produto indisponivel para este pedido.",
        "Produto indisponivel ou inexistente no catalogo.",
        "Mesa invalida para este pedido."
      ].includes(error.message)
        ? error.message
        : "Erro ao criar pedido";

    return NextResponse.json({ error: safeMessage }, { status: 400 });
  }
}
