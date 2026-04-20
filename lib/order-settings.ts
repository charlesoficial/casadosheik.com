import { getSupabaseAdminClient, isSupabaseConfigured, isSupabasePermissionError, isSupabaseSchemaMissingError } from "@/lib/supabase/client";
import type { OrderSettingsPayload, OrderSettingsRecord, PrinterRecord } from "@/lib/types";

const demoOrderSettings: OrderSettingsRecord = {
  id: "order-settings-demo",
  enableTableOrders: true,
  enableDeliveryOrders: true,
  enableManualOrders: true,
  enableStepAccepted: true,
  enableStepPreparing: true,
  enableStepDelivery: true,
  notificationsEnabled: true,
  alertSound: "Alerta 1",
  alertFrequency: "repeat_while_pending",
  alertVolume: 100,
  autoPrintEnabled: false,
  autoPrintMode: "single_printer",
  defaultAutoPrintPrinterId: null,
  autoPrintTriggerStatus: "aceito",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

function mapRow(row: {
  id: string;
  enable_table_orders: boolean | null;
  enable_delivery_orders: boolean | null;
  enable_manual_orders: boolean | null;
  enable_step_accepted: boolean | null;
  enable_step_preparing: boolean | null;
  enable_step_delivery: boolean | null;
  notifications_enabled: boolean | null;
  alert_sound: string | null;
  alert_frequency: OrderSettingsRecord["alertFrequency"] | null;
  alert_volume: number | null;
  auto_print_enabled: boolean | null;
  auto_print_mode: OrderSettingsRecord["autoPrintMode"] | null;
  default_auto_print_printer_id: string | null;
  auto_print_trigger_status: OrderSettingsRecord["autoPrintTriggerStatus"] | null;
  created_at: string | null;
  updated_at: string | null;
}): OrderSettingsRecord {
  return {
    id: row.id,
    enableTableOrders: row.enable_table_orders ?? true,
    enableDeliveryOrders: row.enable_delivery_orders ?? true,
    enableManualOrders: row.enable_manual_orders ?? true,
    enableStepAccepted: row.enable_step_accepted ?? true,
    enableStepPreparing: row.enable_step_preparing ?? true,
    enableStepDelivery: row.enable_step_delivery ?? true,
    notificationsEnabled: row.notifications_enabled ?? true,
    alertSound: (row.alert_sound as OrderSettingsRecord["alertSound"]) ?? "Alerta 1",
    alertFrequency: row.alert_frequency ?? "repeat_while_pending",
    alertVolume: row.alert_volume ?? 100,
    autoPrintEnabled: row.auto_print_enabled ?? false,
    autoPrintMode: row.auto_print_mode ?? "single_printer",
    defaultAutoPrintPrinterId: row.default_auto_print_printer_id ?? null,
    autoPrintTriggerStatus: row.auto_print_trigger_status ?? "aceito",
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined
  };
}

export function getDefaultOrderSettings(activePrinters: PrinterRecord[] = []): OrderSettingsRecord {
  return {
    ...demoOrderSettings,
    defaultAutoPrintPrinterId: activePrinters[0]?.id ?? null
  };
}

function normalizeOperationalPrintingSettings(
  settings: OrderSettingsRecord,
  activePrinters: PrinterRecord[]
): OrderSettingsRecord {
  const hasActivePrinters = activePrinters.length > 0;
  const resolvedDefaultPrinterId =
    settings.defaultAutoPrintPrinterId &&
    activePrinters.some((printer) => printer.id === settings.defaultAutoPrintPrinterId)
      ? settings.defaultAutoPrintPrinterId
      : activePrinters[0]?.id ?? null;

  if (!hasActivePrinters) {
    return {
      ...settings,
      autoPrintEnabled: false,
      defaultAutoPrintPrinterId: null
    };
  }

  if (settings.autoPrintMode === "single_printer" && !resolvedDefaultPrinterId) {
    return {
      ...settings,
      autoPrintEnabled: false,
      defaultAutoPrintPrinterId: null
    };
  }

  return {
    ...settings,
    defaultAutoPrintPrinterId: resolvedDefaultPrinterId
  };
}

export async function getOrderSettings(activePrinters: PrinterRecord[] = []): Promise<OrderSettingsRecord> {
  if (!isSupabaseConfigured()) {
    return getDefaultOrderSettings(activePrinters);
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase!
      .from("order_settings")
      .select(
        "id, enable_table_orders, enable_delivery_orders, enable_manual_orders, enable_step_accepted, enable_step_preparing, enable_step_delivery, notifications_enabled, alert_sound, alert_frequency, alert_volume, auto_print_enabled, auto_print_mode, default_auto_print_printer_id, auto_print_trigger_status, created_at, updated_at"
      )
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return getDefaultOrderSettings(activePrinters);
    }

    return normalizeOperationalPrintingSettings(mapRow(data), activePrinters);
  } catch (error) {
    if (isSupabaseSchemaMissingError(error, "order_settings") || isSupabasePermissionError(error, "order_settings")) {
      return getDefaultOrderSettings(activePrinters);
    }
    throw error;
  }
}

export async function updateOrderSettings(
  payload: OrderSettingsPayload,
  activePrinters: PrinterRecord[] = []
): Promise<OrderSettingsRecord> {
  if (!isSupabaseConfigured()) {
    return normalizeOperationalPrintingSettings({
      ...getDefaultOrderSettings(activePrinters),
      ...payload,
      updatedAt: new Date().toISOString()
    }, activePrinters);
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data: current, error: currentError } = await supabase!
      .from("order_settings")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (currentError) {
      throw new Error(currentError.message);
    }

    const databasePayload = {
      enable_table_orders: payload.enableTableOrders,
      enable_delivery_orders: payload.enableDeliveryOrders,
      enable_manual_orders: payload.enableManualOrders,
      enable_step_accepted: payload.enableStepAccepted,
      enable_step_preparing: payload.enableStepPreparing,
      enable_step_delivery: payload.enableStepDelivery,
      notifications_enabled: payload.notificationsEnabled,
      alert_sound: payload.alertSound,
      alert_frequency: payload.alertFrequency,
      alert_volume: payload.alertVolume,
      auto_print_enabled: payload.autoPrintEnabled,
      auto_print_mode: payload.autoPrintMode,
      default_auto_print_printer_id: payload.defaultAutoPrintPrinterId ?? null,
      auto_print_trigger_status: payload.autoPrintTriggerStatus,
      updated_at: new Date().toISOString()
    };

    const query = current?.id
      ? supabase!.from("order_settings").update(databasePayload).eq("id", current.id)
      : supabase!.from("order_settings").insert(databasePayload);

    const { data, error } = await query
      .select(
        "id, enable_table_orders, enable_delivery_orders, enable_manual_orders, enable_step_accepted, enable_step_preparing, enable_step_delivery, notifications_enabled, alert_sound, alert_frequency, alert_volume, auto_print_enabled, auto_print_mode, default_auto_print_printer_id, auto_print_trigger_status, created_at, updated_at"
      )
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Nao foi possivel salvar configuracoes de pedidos.");
    }

    return normalizeOperationalPrintingSettings(mapRow(data), activePrinters);
  } catch (error) {
    throw error;
  }
}

export function getOrderWorkflow(settings: OrderSettingsRecord): Array<"novo" | "aceito" | "preparo" | "pronto" | "concluido"> {
  return [
    "novo",
    ...(settings.enableStepAccepted ? (["aceito"] as const) : []),
    ...(settings.enableStepPreparing ? (["preparo"] as const) : []),
    ...(settings.enableStepDelivery ? (["pronto"] as const) : []),
    "concluido"
  ];
}
