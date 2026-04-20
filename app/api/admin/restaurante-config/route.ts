import { NextResponse } from "next/server";

import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { requireAdminUser } from "@/lib/auth/server";

export interface RestauranteConfigPayload {
  nome: string;
  telefone: string;
  endereco: string;
  pedidoMinimo: number;
  taxaEntrega: number;
  mensagemBoasVindas: string;
}

export async function GET() {
  try {
    await requireAdminUser();

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        nome: "Casa do Sheik",
        telefone: "",
        endereco: "",
        pedidoMinimo: 0,
        taxaEntrega: 0,
        mensagemBoasVindas: "",
      });
    }

    const supabase = getSupabaseAdminClient()!;
    const { data, error } = await supabase
      .from("restaurante_config")
      .select("id, nome, telefone, endereco, pedido_minimo, taxa_entrega, mensagem_boas_vindas")
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);

    return NextResponse.json({
      id: data?.id ?? null,
      nome: data?.nome ?? "",
      telefone: data?.telefone ?? "",
      endereco: data?.endereco ?? "",
      pedidoMinimo: data?.pedido_minimo ?? 0,
      taxaEntrega: data?.taxa_entrega ?? 0,
      mensagemBoasVindas: data?.mensagem_boas_vindas ?? "",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro ao buscar configuracoes do restaurante." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminUser();

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: true });
    }

    const body = await request.json() as RestauranteConfigPayload & { id?: string };

    const supabase = getSupabaseAdminClient()!;

    const upsertData = {
      ...(body.id ? { id: body.id } : {}),
      nome: String(body.nome ?? "").trim(),
      telefone: String(body.telefone ?? "").trim(),
      endereco: String(body.endereco ?? "").trim(),
      pedido_minimo: Number(body.pedidoMinimo) || 0,
      taxa_entrega: Number(body.taxaEntrega) || 0,
      mensagem_boas_vindas: String(body.mensagemBoasVindas ?? "").trim(),
    };

    const { error } = await supabase
      .from("restaurante_config")
      .upsert(upsertData, { onConflict: "id" });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erro ao salvar configuracoes do restaurante." }, { status: 500 });
  }
}
