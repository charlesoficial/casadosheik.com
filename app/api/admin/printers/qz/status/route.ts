import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/auth/server";
import { getQzSigningStatus } from "@/lib/printing/qz-signing";

export const runtime = "nodejs";

// Expõe apenas um resumo operacional do QZ Tray para a tela de impressoras.
export async function GET() {
  try {
    await requireAdminUser();
    return NextResponse.json(await getQzSigningStatus());
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    return NextResponse.json({ error: "Erro ao verificar configuracao do QZ Tray." }, { status: 400 });
  }
}
