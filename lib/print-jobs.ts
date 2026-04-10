import {
  getSupabaseAdminClient,
  isSupabaseConfigured,
  isSupabasePermissionError,
  isSupabaseSchemaMissingError
} from "@/lib/supabase/client";
import type {
  CreatePrintJobPayload,
  PrintJobRecord,
  PrinterDestination,
  PrintTransportType,
  UpdatePrintJobPayload
} from "@/lib/types";

const demoPrintJobs = new Map<string, PrintJobRecord>();
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PrintJobRow = {
  id: string;
  order_id: string | null;
  printer_id: string | null;
  destination: PrinterDestination;
  transport_type: PrintTransportType;
  trigger_source: PrintJobRecord["triggerSource"];
  status: PrintJobRecord["status"];
  attempt_count: number | null;
  error_message: string | null;
  payload_preview: string | null;
  created_at: string | null;
  printed_at: string | null;
  printers?: {
    name?: string | null;
  } | null;
};

function mapPrintJobRow(row: PrintJobRow): PrintJobRecord {
  return {
    id: row.id,
    orderId: row.order_id,
    printerId: row.printer_id,
    printerName: row.printers?.name ?? null,
    destination: row.destination,
    transportType: row.transport_type,
    triggerSource: row.trigger_source,
    status: row.status,
    attemptCount: row.attempt_count ?? 1,
    errorMessage: row.error_message,
    payloadPreview: row.payload_preview,
    createdAt: row.created_at ?? new Date().toISOString(),
    printedAt: row.printed_at
  };
}

function sortPrintJobs(jobs: PrintJobRecord[]) {
  return [...jobs].sort((left, right) => {
    const rightTime = new Date(right.createdAt).getTime();
    const leftTime = new Date(left.createdAt).getTime();
    return rightTime - leftTime;
  });
}

function isUuid(value?: string | null) {
  return Boolean(value && uuidRegex.test(value));
}

export async function createPrintJob(payload: CreatePrintJobPayload) {
  if (!isSupabaseConfigured()) {
    const job: PrintJobRecord = {
      id: `print-job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      orderId: payload.orderId ?? null,
      printerId: payload.printerId ?? null,
      printerName: payload.printerName ?? null,
      destination: payload.destination,
      transportType: payload.transportType,
      triggerSource: payload.triggerSource,
      status: payload.status ?? "pending",
      attemptCount: payload.attemptCount ?? 1,
      errorMessage: null,
      payloadPreview: payload.payloadPreview ?? null,
      createdAt: new Date().toISOString(),
      printedAt: null
    };
    demoPrintJobs.set(job.id, job);
    return job;
  }

  if (payload.orderId && !isUuid(payload.orderId)) {
    throw new Error("Pedido invalido para registro de impressao.");
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase!
    .from("print_jobs")
    .insert({
      order_id: payload.orderId ?? null,
      printer_id: payload.printerId ?? null,
      destination: payload.destination,
      transport_type: payload.transportType,
      trigger_source: payload.triggerSource,
      status: payload.status ?? "pending",
      attempt_count: payload.attemptCount ?? 1,
      error_message: null,
      payload_preview: payload.payloadPreview ?? null
    })
    .select(
      "id, order_id, printer_id, destination, transport_type, trigger_source, status, attempt_count, error_message, payload_preview, created_at, printed_at, printers(name)"
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Nao foi possivel registrar o print job.");
  }

  return mapPrintJobRow(data as PrintJobRow);
}

export async function updatePrintJob(id: string, payload: UpdatePrintJobPayload) {
  if (!isSupabaseConfigured()) {
    const current = demoPrintJobs.get(id);
    if (!current) {
      throw new Error("Print job nao encontrado.");
    }

    const updated: PrintJobRecord = {
      ...current,
      status: payload.status,
      errorMessage: payload.errorMessage ?? null,
      printedAt: payload.status === "success" ? payload.printedAt ?? new Date().toISOString() : null
    };
    demoPrintJobs.set(id, updated);
    return updated;
  }

  if (!isUuid(id)) {
    throw new Error("Print job invalido.");
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase!
    .from("print_jobs")
    .update({
      status: payload.status,
      error_message: payload.errorMessage ?? null,
      printed_at: payload.status === "success" ? payload.printedAt ?? new Date().toISOString() : null
    })
    .eq("id", id)
    .select(
      "id, order_id, printer_id, destination, transport_type, trigger_source, status, attempt_count, error_message, payload_preview, created_at, printed_at, printers(name)"
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Nao foi possivel atualizar o print job.");
  }

  return mapPrintJobRow(data as PrintJobRow);
}

export async function listPrintJobs(filters?: { orderId?: string; printerId?: string; limit?: number }) {
  const limit = filters?.limit ?? 20;

  if (!isSupabaseConfigured()) {
    return sortPrintJobs(
      Array.from(demoPrintJobs.values()).filter(
        (job) =>
          (!filters?.orderId || job.orderId === filters.orderId) &&
          (!filters?.printerId || job.printerId === filters.printerId)
      )
    ).slice(0, limit);
  }

  if (filters?.orderId && !isUuid(filters.orderId)) {
    return [];
  }

  try {
    const supabase = getSupabaseAdminClient();
    let query = supabase!
      .from("print_jobs")
      .select(
        "id, order_id, printer_id, destination, transport_type, trigger_source, status, attempt_count, error_message, payload_preview, created_at, printed_at, printers(name)"
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (filters?.orderId) query = query.eq("order_id", filters.orderId);
    if (filters?.printerId) query = query.eq("printer_id", filters.printerId);

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []).map((row) => mapPrintJobRow(row as PrintJobRow));
  } catch (error) {
    if (isSupabaseSchemaMissingError(error, "print_jobs") || isSupabasePermissionError(error, "print_jobs")) {
      return [];
    }
    throw error;
  }
}

export async function listLatestPrintJobsByPrinter() {
  const jobs = await listPrintJobs({ limit: 200 });
  const latestByPrinter = new Map<string, PrintJobRecord>();

  for (const job of jobs) {
    if (!job.printerId || latestByPrinter.has(job.printerId)) continue;
    latestByPrinter.set(job.printerId, job);
  }

  return Array.from(latestByPrinter.values());
}
