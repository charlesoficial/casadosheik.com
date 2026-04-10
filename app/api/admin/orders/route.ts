import { NextResponse } from "next/server";

import { getAdminOrders } from "@/lib/data";
import { requireAdminUser } from "@/lib/auth/server";

export async function GET() {
  try {
    await requireAdminUser();
    const orders = await getAdminOrders();
    return NextResponse.json(orders);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro ao buscar pedidos" }, { status: 500 });
  }
}
