import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { updatePrintJob } from "@/lib/print-jobs";
import { requireAdminUser } from "@/lib/auth/server";
import { formatZodError, updatePrintJobSchema } from "@/lib/validators";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdminUser();
    const payload = updatePrintJobSchema.parse(await request.json());
    const job = await updatePrintJob(params.id, payload);
    return NextResponse.json(job);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: formatZodError(error) }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "Erro ao atualizar print job.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
