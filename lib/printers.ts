import {
  getSupabaseAdminClient,
  isSupabaseConfigured,
  isSupabasePermissionError,
  isSupabaseSchemaMissingError
} from "@/lib/supabase/client";
import type {
  OrderDetail,
  PrinterDestination,
  PrinterPayload,
  PrinterRecord
} from "@/lib/types";

const demoPrinters = new Map<string, PrinterRecord>([
  [
    "printer-demo-caixa",
    {
      id: "printer-demo-caixa",
      name: "Caixa USB",
      type: "usb",
      destination: "caixa",
      printerName: "EPSON-TM-T20",
      isActive: true,
      autoPrintOnAccept: true,
      copies: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  [
    "printer-demo-cozinha",
    {
      id: "printer-demo-cozinha",
      name: "Cozinha Rede",
      type: "network",
      destination: "cozinha",
      ipAddress: "192.168.0.55",
      port: 9100,
      isActive: true,
      autoPrintOnAccept: true,
      copies: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
]);

function mapPrinterRow(row: {
  id: string;
  name: string;
  type: "usb" | "network";
  destination: PrinterDestination;
  printer_name: string | null;
  ip_address: string | null;
  port: number | null;
  is_active: boolean | null;
  auto_print_on_accept: boolean | null;
  copies: number | null;
  created_at: string | null;
  updated_at: string | null;
}): PrinterRecord {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    destination: row.destination,
    printerName: row.printer_name,
    ipAddress: row.ip_address,
    port: row.port,
    isActive: row.is_active ?? true,
    autoPrintOnAccept: row.auto_print_on_accept ?? true,
    copies: row.copies ?? 1,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined
  };
}

function validatePrinterPayload(payload: PrinterPayload) {
  if (!payload.name.trim()) throw new Error("Nome da impressora e obrigatorio.");
  if (payload.type === "usb" && !payload.printerName?.trim()) {
    throw new Error("Selecione ou informe o printer_name da impressora USB.");
  }
  if (payload.type === "network" && !payload.ipAddress?.trim()) {
    throw new Error("Informe o IP da impressora de rede.");
  }
}

export async function listPrinters() {
  if (!isSupabaseConfigured()) {
    return Array.from(demoPrinters.values());
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase!
      .from("printers")
      .select(
        "id, name, type, destination, printer_name, ip_address, port, is_active, auto_print_on_accept, copies, created_at, updated_at"
      )
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data?.map(mapPrinterRow) ?? [];
  } catch (error) {
    if (isSupabaseSchemaMissingError(error, "printers") || isSupabasePermissionError(error, "printers")) {
      return [];
    }
    throw error;
  }
}

export async function createPrinter(payload: PrinterPayload) {
  validatePrinterPayload(payload);

  if (!isSupabaseConfigured()) {
    const printer: PrinterRecord = {
      id: `printer-${Date.now()}`,
      name: payload.name.trim(),
      type: payload.type,
      destination: payload.destination,
      printerName: payload.printerName ?? null,
      ipAddress: payload.ipAddress ?? null,
      port: payload.port ?? 9100,
      isActive: payload.isActive ?? true,
      autoPrintOnAccept: payload.autoPrintOnAccept ?? true,
      copies: payload.copies ?? 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    demoPrinters.set(printer.id, printer);
    return printer;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase!
    .from("printers")
    .insert({
      name: payload.name.trim(),
      type: payload.type,
      destination: payload.destination,
      printer_name: payload.printerName ?? null,
      ip_address: payload.ipAddress ?? null,
      port: payload.port ?? 9100,
      is_active: payload.isActive ?? true,
      auto_print_on_accept: payload.autoPrintOnAccept ?? true,
      copies: payload.copies ?? 1,
      updated_at: new Date().toISOString()
    })
    .select(
      "id, name, type, destination, printer_name, ip_address, port, is_active, auto_print_on_accept, copies, created_at, updated_at"
    )
    .single();

  if (error || !data) throw new Error(error?.message ?? "Nao foi possivel criar impressora.");
  return mapPrinterRow(data);
}

export async function updatePrinter(id: string, payload: PrinterPayload) {
  validatePrinterPayload(payload);

  if (!isSupabaseConfigured()) {
    const current = demoPrinters.get(id);
    const printer = {
      ...(current || {}),
      id,
      name: payload.name.trim(),
      type: payload.type,
      destination: payload.destination,
      printerName: payload.printerName ?? null,
      ipAddress: payload.ipAddress ?? null,
      port: payload.port ?? 9100,
      isActive: payload.isActive ?? true,
      autoPrintOnAccept: payload.autoPrintOnAccept ?? true,
      copies: payload.copies ?? 1,
      updatedAt: new Date().toISOString()
    } as PrinterRecord;
    demoPrinters.set(id, printer);
    return printer;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase!
    .from("printers")
    .update({
      name: payload.name.trim(),
      type: payload.type,
      destination: payload.destination,
      printer_name: payload.printerName ?? null,
      ip_address: payload.ipAddress ?? null,
      port: payload.port ?? 9100,
      is_active: payload.isActive ?? true,
      auto_print_on_accept: payload.autoPrintOnAccept ?? true,
      copies: payload.copies ?? 1,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select(
      "id, name, type, destination, printer_name, ip_address, port, is_active, auto_print_on_accept, copies, created_at, updated_at"
    )
    .single();

  if (error || !data) throw new Error(error?.message ?? "Nao foi possivel atualizar impressora.");
  return mapPrinterRow(data);
}

export async function deletePrinter(id: string) {
  if (!isSupabaseConfigured()) {
    demoPrinters.delete(id);
    return { success: true };
  }
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase!.from("printers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function getPrintersForDispatch(destination?: PrinterDestination | "all") {
  const printers = await listPrinters();
  return printers.filter(
    (printer) =>
      printer.isActive &&
      (destination === "all" || !destination || printer.destination === destination || printer.destination === "geral")
  );
}

export function resolveDestinationsForOrder(order: OrderDetail): PrinterDestination[] {
  const destinations: PrinterDestination[] = ["geral"];
  if (order.kind === "delivery") destinations.push("delivery", "caixa");
  if (order.kind === "mesa") destinations.push("cozinha", "caixa");
  if (order.kind === "retirada") destinations.push("caixa");
  return Array.from(new Set(destinations));
}
