import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createPrintJob, listLatestPrintJobsByPrinter, listPrintJobs } from "@/lib/print-jobs";
import { requireAdminUser } from "@/lib/auth/server";
import { createPrintJobSchema, formatZodError } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    await requireAdminUser();
    const url = new URL(request.url);
    const orderId = url.searchParams.get("orderId") ?? undefined;
    const printerId = url.searchParams.get("printerId") ?? undefined;
    const mode = url.searchParams.get("mode");

    if (mode === "printer-summary") {
      const jobs = await listLatestPrintJobsByPrinter();
      return NextResponse.json(jobs);
    }

    const jobs = await listPrintJobs({ orderId, printerId, limit: 20 });
    return NextResponse.json(jobs);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro ao buscar logs de impressao." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminUser();
    const payload = createPrintJobSchema.parse(await request.json());
    const job = await createPrintJob(payload);
    return NextResponse.json(job);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: formatZodError(error) }, { status: 422 });
    }
    return NextResponse.json({ error: "Erro ao criar print job." }, { status: 500 });
  }
}
