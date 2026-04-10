import {
  getSupabaseServerClient,
  isSupabaseConfigured,
  isSupabasePermissionError,
  isSupabaseSchemaMissingError
} from "@/lib/db/client";
import type { TableRecord } from "@/features/tables/types";

// Consulta as mesas ativas usadas na geração de QR Codes do salão.
const fallbackTables: TableRecord[] = Array.from({ length: 15 }, (_, index) => ({
  id: `fallback-${index + 1}`,
  number: index + 1,
  active: true
}));

export async function listActiveTables(): Promise<TableRecord[]> {
  // O fallback mantém a tela útil em demonstração local ou em banco incompleto.
  if (!isSupabaseConfigured()) {
    return fallbackTables;
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase!
      .from("mesas")
      .select("id, numero, ativa")
      .eq("ativa", true)
      .order("numero", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    if (!data?.length) {
      return fallbackTables;
    }

    return data.map((table) => ({
      id: table.id,
      number: table.numero,
      active: table.ativa
    }));
  } catch (error) {
    if (isSupabaseSchemaMissingError(error, "mesas") || isSupabasePermissionError(error, "mesas")) {
      return fallbackTables;
    }
    throw error;
  }
}
