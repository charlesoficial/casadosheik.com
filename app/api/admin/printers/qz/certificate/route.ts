import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/auth/server";
import { getQzCertificate } from "@/lib/printing/qz-signing";

export const runtime = "nodejs";

// Entrega o certificado publico usado pelo QZ Tray para validar a origem da assinatura.
export async function GET() {
  try {
    await requireAdminUser();

    const certificate = await getQzCertificate();
    if (!certificate) {
      return NextResponse.json({ error: "Certificado do QZ Tray nao configurado." }, { status: 404 });
    }

    return new NextResponse(certificate, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }

    return NextResponse.json({ error: "Erro ao carregar certificado do QZ Tray." }, { status: 400 });
  }
}
