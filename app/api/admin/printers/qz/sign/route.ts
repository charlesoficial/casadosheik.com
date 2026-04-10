import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminUser } from "@/lib/auth/server";
import { getQzSigningStatus, signQzPayload } from "@/lib/printing/qz-signing";

export const runtime = "nodejs";

const qzSignSchema = z.object({
  request: z.string().min(1, "Payload da assinatura ausente.")
});

// Assina os payloads do QZ Tray no servidor para liberar impressao confiavel sem expor a chave privada.
export async function POST(request: Request) {
  try {
    await requireAdminUser();

    const { request: payload } = qzSignSchema.parse(await request.json());
    const status = await getQzSigningStatus();

    if (!status.signingConfigured) {
      return NextResponse.json(
        { error: "Assinatura do QZ Tray nao configurada no servidor." },
        { status: 409 }
      );
    }

    const signature = await signQzPayload(payload);
    if (!signature) {
      return NextResponse.json({ error: "Nao foi possivel assinar a solicitacao." }, { status: 400 });
    }

    return NextResponse.json({ signature });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Payload invalido." }, { status: 422 });
    }

    return NextResponse.json({ error: "Erro ao assinar payload do QZ Tray." }, { status: 400 });
  }
}
