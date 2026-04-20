"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, Loader2, Printer, ShoppingBag, Truck, Volume2, VolumeX } from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/realtime/client";
import { getOrderWorkflow } from "@/lib/order-settings";
import { printReceiptFromDom } from "@/lib/receipt/print";
import { OrderPrintSheet } from "@/features/orders/components/order-print-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { usePrinterBridge } from "@/features/printers/hooks/use-printer-bridge";
import { useAdminSoundPreference } from "@/features/orders/hooks/use-order-sound";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  AdminOrder,
  CloseDirectOrderPayload,
  CloseDirectOrderResult,
  CloseTableAccountPayload,
  CloseTableAccountResult,
  OrderDetail,
  OrderSettingsRecord,
  OrderStatus,
  PrintDispatchResult,
  PrintJobRecord,
  PrinterRecord
} from "@/lib/types";

// Este board e o centro operacional do restaurante.
// Ele concentra fila de pedidos, impressao, fechamento e atualizacao em tempo real.
const statusMeta = {
  novo: {
    label: "Novos",
    color: "bg-status-new-bg text-status-new-fg border-status-new-border",
    description: "Pedidos que acabaram de chegar do QR Code, delivery ou lancamento manual."
  },
  aceito: {
    label: "Aceitos",
    color: "bg-status-info-bg text-status-info-fg border-status-info-border",
    description: "Pedidos validados pelo caixa. Aqui a comanda pode ser impressa no caixa e levada para a cozinha."
  },
  preparo: {
    label: "Em preparo",
    color: "bg-status-warning-bg text-status-warning-fg border-status-warning-border",
    description: "A cozinha ja recebeu a comanda e iniciou o preparo do pedido."
  },
  pronto: {
    label: "Prontos",
    color: "bg-status-warning-bg text-status-warning-fg border-status-warning-border",
    description: "Pedidos prontos para servir na mesa, retirar no balcao ou despachar."
  },
  concluido: {
    label: "Concluidos",
    color: "bg-status-success-bg text-status-success-fg border-status-success-border",
    description: "Pedido operacional encerrado. Para mesas, a conta ainda pode ser fechada separadamente no caixa."
  }
} as const;

type ConcludedTableGroup = {
  kind: "table-group";
  id: string;
  representativeId: string;
  table: string;
  type: string;
  customer: string;
  status: "concluido";
  total: number;
  items: string[];
  minutesAgo: number;
  orderCount: number;
  orderNumbers: number[];
  orders: AdminOrder[];
};

type BoardEntry = AdminOrder | ConcludedTableGroup;

function isConcludedTableGroup(entry: BoardEntry): entry is ConcludedTableGroup {
  return "kind" in entry && entry.kind === "table-group";
}

function shallowArrayEqual(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function sameAdminOrder(left: AdminOrder, right: AdminOrder) {
  return (
    left.id === right.id &&
    left.number === right.number &&
    left.type === right.type &&
    left.customer === right.customer &&
    left.status === right.status &&
    left.total === right.total &&
    left.minutesAgo === right.minutesAgo &&
    shallowArrayEqual(left.items, right.items)
  );
}

function reconcileOrders(current: AdminOrder[], incoming: AdminOrder[]) {
  // Reaproveita objetos inalterados para evitar rerenders desnecessarios
  // quando o polling ou o realtime devolvem a mesma fila.
  const currentById = new Map(current.map((order) => [order.id, order]));
  let changed = current.length !== incoming.length;

  const next = incoming.map((order, index) => {
    const existing = currentById.get(order.id);
    if (!existing) {
      changed = true;
      return order;
    }

    if (current[index]?.id !== order.id || !sameAdminOrder(existing, order)) {
      changed = true;
      return order;
    }

    return existing;
  });

  return changed ? next : current;
}

function formatTableCode(table?: string | null) {
  const numeric = Number(table);
  if (Number.isFinite(numeric) && numeric > 0) {
    return String(numeric);
  }
  return table ?? "---";
}

function formatOrderCode(number: number) {
  return String(number).padStart(3, "0");
}

function getOrderTypeLabel(order: Pick<OrderDetail, "kind" | "table" | "type"> | Pick<AdminOrder, "type">) {
  const isTableOrder = "kind" in order ? order.kind === "mesa" : order.type.includes("Mesa");
  if (!isTableOrder) {
    return order.type;
  }
  const table = "table" in order ? order.table : order.type.replace("Mesa ", "");
  return `Mesa ${formatTableCode(table)}`;
}

function getDisplayCode(order: Pick<OrderDetail, "kind" | "table" | "number"> | Pick<AdminOrder, "type" | "number">) {
  return `#${formatOrderCode(order.number)}`;
}

function extractTableNumber(typeLabel: string) {
  const match = typeLabel.match(/^Mesa\s+0*(\d+)$/i);
  return match?.[1] ?? null;
}

function parseOrderItemLine(item: string) {
  const match = item.match(/^(\d+)x\s+(.+)$/i);
  if (!match) {
    return { qty: 1, name: item.trim() };
  }

  return {
    qty: Number(match[1]),
    name: match[2].trim()
  };
}

function aggregateOrderItemLines(items: string[]) {
  const totals = new Map<string, number>();

  for (const item of items) {
    const parsed = parseOrderItemLine(item);
    totals.set(parsed.name, (totals.get(parsed.name) ?? 0) + parsed.qty);
  }

  return Array.from(totals.entries()).map(([name, qty]) => `${qty}x ${name}`);
}

function getNextStatus(status: OrderStatus, settings: OrderSettingsRecord) {
  if (status === "cancelado" || status === "concluido") return null;
  const workflow = getOrderWorkflow(settings);
  const index = workflow.indexOf(status as (typeof workflow)[number]);
  if (index === -1 || index === workflow.length - 1) {
    return null;
  }
  return workflow[index + 1] as OrderStatus;
}

function getPrimaryAction(status: AdminOrder["status"], settings: OrderSettingsRecord) {
  // O rótulo da acao principal segue o workflow configurado no admin,
  // evitando botao fixo que desrespeite a operacao do restaurante.
  const nextStatus = getNextStatus(status, settings);
  if (!nextStatus) return null;
  if (nextStatus === "aceito") return { label: "Aceitar e imprimir", targetStatus: nextStatus };
  if (nextStatus === "preparo") return { label: "Iniciar preparo", targetStatus: nextStatus };
  if (nextStatus === "pronto") return { label: "Marcar pronto", targetStatus: nextStatus };
  return { label: "Concluir pedido", targetStatus: nextStatus };
}

function getPrintButtonLabel(status: AdminOrder["status"]) {
  if (status === "novo" || status === "aceito") return "Imprimir comanda";
  if (status === "concluido") return "Reimprimir";
  return "Imprimir";
}

function isTableOrder(order: Pick<OrderDetail, "kind" | "table" | "status"> | Pick<AdminOrder, "type" | "status">) {
  if ("type" in order) {
    return order.type.includes("Mesa");
  }

  return order.kind === "mesa" && Boolean(order.table);
}

function canCloseTable(order: Pick<OrderDetail, "kind" | "table" | "status" | "tableAccountClosed"> | Pick<AdminOrder, "type" | "status">) {
  const alreadyClosed = "tableAccountClosed" in order ? order.tableAccountClosed : false;
  return isTableOrder(order) && order.status === "concluido" && !alreadyClosed;
}

function canCloseDirectOrder(
  order: Pick<OrderDetail, "kind" | "status" | "financialClosed"> | Pick<AdminOrder, "type" | "status">
) {
  const alreadyClosed = "financialClosed" in order ? order.financialClosed : false;
  return !isTableOrder(order) && order.status === "concluido" && !alreadyClosed;
}

async function readApiJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  const text = await response.text().catch(() => "");
  const isHtml = text.trimStart().startsWith("<");
  const loginRedirect = response.redirected || response.url.includes("/login");

  if (loginRedirect) {
    throw new Error("Sessao expirada. Entre novamente no admin e tente imprimir de novo.");
  }

  if (isHtml) {
    throw new Error(`${fallbackMessage} O servidor devolveu uma pagina HTML em vez de JSON.`);
  }

  throw new Error(fallbackMessage);
}

function useBeepLoop({
  active,
  enabled,
  frequency,
  volume,
  sound,
  triggerSignal
}: {
  active: boolean;
  enabled: boolean;
  frequency: OrderSettingsRecord["alertFrequency"];
  volume: number;
  sound: OrderSettingsRecord["alertSound"];
  triggerSignal: number;
}) {
  // O som do painel precisa ser resiliente a politicas do navegador.
  // Por isso o audio so toca depois do primeiro gesto do operador.
  const intervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const unlockedRef = useRef(false);
  const playRef = useRef<() => void>(() => {});

  playRef.current = () => {
    if (!enabled || frequency === "none" || !audioContextRef.current || !unlockedRef.current) return;

    const audioContext = audioContextRef.current;
const soundMap: Record<OrderSettingsRecord["alertSound"], number[]> = {
  "Alerta 1": [880, 880, 880],
  "Alerta 2": [720, 960, 720],
  "Alerta 3": [1040, 880, 720],
  "Alerta 4": [920, 920, 1180, 1180],
  "Alerta 5": [640, 760, 640],
  "Alerta 6": [1180, 1320, 1180],
  "Alerta 7": [760, 960, 760, 1120],
  "Alerta 8": [860, 1080, 1280]
};
    const gainValue = Math.max(0.0001, volume / 100);
    let startAt = audioContext.currentTime;

    for (const tone of soundMap[sound]) {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.frequency.value = tone;
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(gainValue * 0.2, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.3);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.3);
      startAt += 0.45;
    }
  };

  useEffect(() => {
    function unlock() {
      const AudioContextCtor = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextCtor();
      }
      void audioContextRef.current.resume?.();
      unlockedRef.current = true;
      if (active && enabled) {
        playRef.current();
      }
    }

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [active, enabled]);

  useEffect(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (enabled && frequency === "repeat_while_pending" && active) {
      intervalRef.current = window.setInterval(() => playRef.current(), 1600);
    }

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [active, enabled, frequency]);

  useEffect(() => {
    if (!triggerSignal || !enabled || !active || frequency === "none") {
      return;
    }

    playRef.current();
  }, [active, enabled, frequency, triggerSignal]);
}

export function OrderBoard({
  initialOrders,
  initialSettings,
  activePrinters
}: {
  initialOrders: AdminOrder[];
  initialSettings: OrderSettingsRecord;
  activePrinters: PrinterRecord[];
}) {
  // O componente mistura UI e regra operacional por necessidade:
  // atualiza fila, imprime, acompanha status e reage ao realtime do Supabase.
  const printerBridge = usePrinterBridge();
  const { soundEnabled, toggleSound } = useAdminSoundPreference();
  const [orders, setOrders] = useState(initialOrders);
  const [settings] = useState(initialSettings);
  const [selectedId, setSelectedId] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [printSheetOrder, setPrintSheetOrder] = useState<OrderDetail | null>(null);
  const [printJobs, setPrintJobs] = useState<PrintJobRecord[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeStatus, setActiveStatus] = useState<OrderStatus>("novo");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [closeTableOrderId, setCloseTableOrderId] = useState<string | null>(null);
  const [closeTablePaymentMethod, setCloseTablePaymentMethod] =
    useState<CloseTableAccountPayload["paymentMethod"]>("dinheiro");
  const [closeDirectOrderId, setCloseDirectOrderId] = useState<string | null>(null);
  const [closeDirectPaymentMethod, setCloseDirectPaymentMethod] =
    useState<CloseDirectOrderPayload["paymentMethod"]>("dinheiro");
  const refreshInFlightRef = useRef(false);
  const detailInFlightRef = useRef<string | null>(null);
  const printJobsInFlightRef = useRef<string | null>(null);
  const selectedIdRef = useRef("");
  const autoPrintAttemptedRef = useRef<Set<string>>(new Set());
  const seenOrderIdsRef = useRef<Set<string>>(new Set(initialOrders.map((order) => order.id)));
  const workflowStatuses = useMemo(() => getOrderWorkflow(settings), [settings]);
  const hasUsbAutoPrintPrinters = useMemo(
    () => activePrinters.some((printer) => printer.type === "usb" && printer.autoPrintOnAccept),
    [activePrinters]
  );
  const visibleStatuses = useMemo(
    () => workflowStatuses.filter((status) => status !== "novo" && status !== "concluido"),
    [workflowStatuses]
  );
  const filteredOrders = useMemo(() => orders.filter((order) => order.status === activeStatus), [activeStatus, orders]);
  const boardEntries = useMemo<BoardEntry[]>(() => {
    if (activeStatus !== "concluido") {
      return filteredOrders;
    }

    const entries: BoardEntry[] = [];
    const tableGroups = new Map<string, AdminOrder[]>();

    for (const order of filteredOrders) {
      const table = extractTableNumber(order.type);
      if (!table) {
        entries.push(order);
        continue;
      }

      const key = String(Number(table));
      tableGroups.set(key, [...(tableGroups.get(key) ?? []), order]);
    }

    for (const [table, tableOrders] of tableGroups.entries()) {
      const representative = [...tableOrders].sort((left, right) => right.number - left.number)[0];
      const orderNumbers = tableOrders.map((order) => order.number).sort((left, right) => left - right);
      const mergedItems = aggregateOrderItemLines(tableOrders.flatMap((order) => order.items));

      entries.push({
        kind: "table-group",
        id: `table-group-${table}`,
        representativeId: representative.id,
        table,
        type: `Mesa ${formatTableCode(table)}`,
        customer: representative.customer,
        status: "concluido",
        total: tableOrders.reduce((sum, order) => sum + order.total, 0),
        items: mergedItems,
        minutesAgo: Math.min(...tableOrders.map((order) => order.minutesAgo)),
        orderCount: tableOrders.length,
        orderNumbers,
        orders: [...tableOrders].sort((left, right) => right.number - left.number)
      });
    }

    return entries.sort((left, right) => {
      const leftMinutes = isConcludedTableGroup(left) ? left.minutesAgo : left.minutesAgo;
      const rightMinutes = isConcludedTableGroup(right) ? right.minutesAgo : right.minutesAgo;
      return leftMinutes - rightMinutes;
    });
  }, [activeStatus, filteredOrders]);
  const selectedEntry = useMemo(() => {
    return boardEntries.find((entry) => (isConcludedTableGroup(entry) ? entry.representativeId : entry.id) === selectedId) ?? null;
  }, [boardEntries, selectedId]);
  const selectedTableGroup = useMemo(() => {
    return selectedEntry && isConcludedTableGroup(selectedEntry) ? selectedEntry : null;
  }, [selectedEntry]);
  const activeTabMeta = statusMeta[activeStatus as keyof typeof statusMeta];
  const closeTableOrder = useMemo(() => {
    if (!closeTableOrderId) return null;
    if (selectedOrder?.id === closeTableOrderId) {
      return selectedOrder;
    }
    return null;
  }, [closeTableOrderId, selectedOrder]);
  const closeTableLabel = useMemo(() => {
    const table =
      closeTableOrder?.table ??
      orders.find((order) => order.id === closeTableOrderId)?.type.replace("Mesa ", "") ??
      null;
    return table ? `Mesa ${formatTableCode(table)}` : "Mesa";
  }, [closeTableOrder?.table, closeTableOrderId, orders]);
  const closeTableSummary = useMemo(() => {
    const table =
      closeTableOrder?.table ??
      extractTableNumber(orders.find((order) => order.id === closeTableOrderId)?.type ?? "") ??
      null;

    if (!table) {
      return { total: 0, orderCount: 0, pendingCount: 0 };
    }

    const sameTableOrders = orders.filter((order) => extractTableNumber(order.type) === String(Number(table)));
    const closableOrders = sameTableOrders.filter((order) => order.status === "concluido");
    const pendingOrders = sameTableOrders.filter((order) => !["concluido", "cancelado"].includes(order.status));

    return {
      total: closableOrders.reduce((sum, order) => sum + order.total, 0),
      orderCount: closableOrders.length,
      pendingCount: pendingOrders.length
    };
  }, [closeTableOrder?.table, closeTableOrderId, orders]);
  const closeDirectOrder = useMemo<OrderDetail | AdminOrder | null>(() => {
    if (!closeDirectOrderId) return null;
    if (selectedOrder?.id === closeDirectOrderId) {
      return selectedOrder;
    }
    return orders.find((order) => order.id === closeDirectOrderId) ?? null;
  }, [closeDirectOrderId, orders, selectedOrder]);
  async function refreshOrders() {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    try {
      const response = await fetch("/api/admin/orders", { cache: "no-store" });
      if (!response.ok) return;
      const nextOrders = await readApiJson<AdminOrder[]>(response, "Nao foi possivel atualizar pedidos.");
      setOrders((current) => reconcileOrders(current, nextOrders));
    } catch {
      // Evita erro uncaught quando o servidor local reinicia ou cai temporariamente.
    } finally {
      refreshInFlightRef.current = false;
    }
  }

  async function loadOrderDetail(orderId: string, options?: { silent?: boolean }) {
    if (detailInFlightRef.current === orderId) return;
    detailInFlightRef.current = orderId;
    if (!options?.silent) {
      setDetailLoading(true);
    }
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, { cache: "no-store" });
      if (!response.ok) return;
      const detail = await readApiJson<OrderDetail>(response, "Nao foi possivel carregar o pedido.");
      if (selectedIdRef.current === orderId) {
        setSelectedOrder((current) => {
          const currentSerialized = current ? JSON.stringify(current) : "";
          const nextSerialized = JSON.stringify(detail);
          return currentSerialized === nextSerialized ? current : detail;
        });
      }
    } catch {
      // Mantem o drawer estavel durante oscilacoes de rede.
    } finally {
      detailInFlightRef.current = null;
      if (!options?.silent) {
        setDetailLoading(false);
      }
    }
  }

  async function loadPrintJobs(orderId: string, options?: { silent?: boolean }) {
    if (printJobsInFlightRef.current === orderId) return;
    printJobsInFlightRef.current = orderId;
    try {
      const response = await fetch(`/api/admin/print-jobs?orderId=${orderId}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = await readApiJson<PrintJobRecord[]>(response, "Nao foi possivel carregar logs de impressao.");
      if (selectedIdRef.current === orderId) {
        setPrintJobs((current) => {
          const currentSerialized = JSON.stringify(current);
          const nextSerialized = JSON.stringify(data);
          return currentSerialized === nextSerialized ? current : data;
        });
      }
    } catch {
      // Nao polui o console do operador quando houver falha temporaria.
    } finally {
      printJobsInFlightRef.current = null;
    }
  }

  async function updatePrintJobStatus(printJobId: string, success: boolean, message?: string) {
    try {
      await fetch(`/api/admin/print-jobs/${printJobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: success ? "success" : "failed",
          errorMessage: success ? null : message ?? "Falha na impressao."
        })
      });
    } catch {
      // Nao bloqueia o fluxo operacional se o log falhar.
    }
  }

  async function createManualFallbackJob(orderId: string, lines: string[]) {
    const response = await fetch("/api/admin/print-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        destination: "geral",
        transportType: "manual",
        triggerSource: "manual_reprint",
        payloadPreview: lines.slice(0, 16).join("\n")
      })
    });

    if (!response.ok) return null;
    return await readApiJson<PrintJobRecord>(response, "Nao foi possivel criar fallback de impressao.");
  }

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    if (!workflowStatuses.some((status) => status === activeStatus)) {
      setActiveStatus(workflowStatuses[0] ?? "novo");
    }
  }, [activeStatus, workflowStatuses]);

  useEffect(() => {
    if (!settings.autoPrintEnabled || !hasUsbAutoPrintPrinters) return;
    void printerBridge.connectQzTray().catch(() => {
      // A tentativa real acontece novamente no clique/impressao.
    });
  }, [hasUsbAutoPrintPrinters, printerBridge, settings.autoPrintEnabled]);

  useEffect(() => {
    if (!selectedId) return;
    void loadOrderDetail(selectedId);
    void loadPrintJobs(selectedId);
  }, [selectedId]);

  useEffect(() => {
    void refreshOrders();

    const interval = window.setInterval(() => {
      void refreshOrders();
      const currentSelectedId = selectedIdRef.current;
      if (currentSelectedId) {
        void loadOrderDetail(currentSelectedId, { silent: true });
        void loadPrintJobs(currentSelectedId, { silent: true });
      }
    }, 30000);

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      ?.channel("admin-orders")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "pedidos" }, async () => {
        await refreshOrders();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pedidos" }, async () => {
        await refreshOrders();
        const currentSelectedId = selectedIdRef.current;
        if (currentSelectedId) {
          await loadOrderDetail(currentSelectedId, { silent: true });
          await loadPrintJobs(currentSelectedId, { silent: true });
        }
      })
      .subscribe();

    return () => {
      window.clearInterval(interval);
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, []);

  async function updateStatus(
    orderId: string,
    status?: OrderStatus,
    options?: { printAfterStatusUpdate?: boolean }
  ) {
    try {
      setError(null);
      setMessage(null);
      setPendingId(orderId);
      const currentStatus = orders.find((order) => order.id === orderId)?.status ?? selectedOrder?.status ?? "novo";
      const targetStatus = status ?? getNextStatus(currentStatus, settings);
      if (!targetStatus) {
        return;
      }
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus })
      });
      const updated = await readApiJson<OrderDetail & { error?: string }>(
        response,
        "Nao foi possivel atualizar status."
      );
      if (!response.ok) {
        throw new Error(updated.error || "Nao foi possivel atualizar status");
      }

      setOrders((current) =>
        current.map((order) =>
          order.id === orderId ? { ...order, status: updated.status as AdminOrder["status"] } : order
        )
      );
      if (selectedId === orderId) {
        setSelectedOrder(updated as OrderDetail);
      }

      const updatedStatus = (updated.status as OrderStatus) || targetStatus;
      if (options?.printAfterStatusUpdate && updatedStatus === "aceito") {
        await handleManualPrint(orderId, updated as OrderDetail);
      } else if (settings.autoPrintEnabled && updatedStatus === settings.autoPrintTriggerStatus) {
        await dispatchAutoPrintOnce(orderId, updatedStatus);
      }
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Erro ao atualizar status");
    } finally {
      setPendingId(null);
    }
  }

  async function dispatchPreparedJobs(orderId: string, triggerSource: "auto_accept" | "manual_reprint") {
    const printerId =
      triggerSource === "auto_accept" && settings.autoPrintMode === "single_printer"
        ? settings.defaultAutoPrintPrinterId ?? undefined
        : undefined;
    const response = await fetch(`/api/admin/orders/${orderId}/print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destination: "all", triggerSource, printerId })
    });
    const data = await readApiJson<{
      error?: string;
      order: OrderDetail;
      jobs: Array<{ printer: PrinterRecord; lines: string[]; printJob: PrintJobRecord }>;
      message: string;
    }>(response, "Falha ao preparar impressao.");
    if (!response.ok) {
      throw new Error(data.error || "Falha ao preparar impressao.");
    }

    return data as {
      order: OrderDetail;
      jobs: Array<{ printer: PrinterRecord; lines: string[]; printJob: PrintJobRecord }>;
      message: string;
    };
  }

  async function dispatchAutoPrintOnce(orderId: string, status: OrderStatus) {
    const key = `${status}:${orderId}`;
    if (autoPrintAttemptedRef.current.has(key)) return;
    autoPrintAttemptedRef.current.add(key);
    await dispatchAutoPrint(orderId);
  }

  async function dispatchAutoPrint(orderId: string) {
    try {
      const prepared = await dispatchPreparedJobs(orderId, "auto_accept");
      if (!prepared.jobs.length) {
        setMessage(prepared.message);
        return;
      }

      const results: PrintDispatchResult[] = [];
      for (const job of prepared.jobs) {
        const copies = Math.max(1, job.printer.copies || 1);
        let hasFailure = false;
        let lastMessage = "Impressao enviada.";
        for (let index = 0; index < copies; index += 1) {
          const result = await printerBridge.printToPrinter(job.printer, job.lines);
          hasFailure = hasFailure || !result.success;
          lastMessage = result.message;
          results.push(result);
        }
        await updatePrintJobStatus(job.printJob.id, !hasFailure, hasFailure ? lastMessage : undefined);
      }

      await loadPrintJobs(orderId);
      const failures = results.filter((result) => !result.success);
      if (failures.length) {
        setError(
          `Impressao parcial: ${failures.map((item) => `${item.printerName} (${item.message})`).join(", ")}`
        );
      } else {
        setMessage("Impressao automatica enviada com sucesso.");
      }
    } catch (dispatchError) {
      setError(dispatchError instanceof Error ? dispatchError.message : "Falha na impressao automatica.");
    }
  }

  useEffect(() => {
    const newlySeenOrders: AdminOrder[] = [];

    for (const order of orders) {
      if (seenOrderIdsRef.current.has(order.id)) continue;
      seenOrderIdsRef.current.add(order.id);
      newlySeenOrders.push(order);
    }

    if (!settings.autoPrintEnabled || settings.autoPrintTriggerStatus !== "novo") return;

    for (const order of newlySeenOrders) {
      if (order.status === "novo") {
        void dispatchAutoPrintOnce(order.id, "novo");
      }
    }
  }, [orders, settings.autoPrintEnabled, settings.autoPrintTriggerStatus]);

  async function handleManualPrint(orderId: string, orderForFallback?: OrderDetail | null) {
    try {
      setError(null);
      setMessage(null);
      const prepared = await dispatchPreparedJobs(orderId, "manual_reprint");
      if (!prepared.jobs.length) {
        setMessage("Nenhuma impressora ativa encontrada. Usando fallback manual.");
        await handlePrint(orderId, orderForFallback ?? prepared.order);
        return;
      }

      const results: PrintDispatchResult[] = [];
      for (const job of prepared.jobs) {
        const copies = Math.max(1, job.printer.copies || 1);
        let hasFailure = false;
        let lastMessage = "Impressao enviada.";
        for (let index = 0; index < copies; index += 1) {
          const result = await printerBridge.printToPrinter(job.printer, job.lines);
          hasFailure = hasFailure || !result.success;
          lastMessage = result.message;
          results.push(result);
        }
        await updatePrintJobStatus(job.printJob.id, !hasFailure, hasFailure ? lastMessage : undefined);
      }

      await loadPrintJobs(orderId);
      const failures = results.filter((result) => !result.success);
      if (failures.length) {
        setError("Uma ou mais impressoras falharam. Abrindo fallback manual.");
        await handlePrint(orderId, orderForFallback ?? prepared.order);
      } else {
        setMessage("Pedido impresso com sucesso.");
      }
    } catch (printError) {
      setError(printError instanceof Error ? printError.message : "Falha ao imprimir. Abrindo fallback manual.");
      await handlePrint(orderId, orderForFallback ?? selectedOrder);
    }
  }

  async function handlePrint(orderId: string, order?: OrderDetail | null) {
    const orderToPrint = order ?? selectedOrder;
    setPrintSheetOrder(orderToPrint ?? null);
    const fallbackLines =
      orderToPrint?.items?.length
        ? [
            `Pedido #${String(orderToPrint.number).padStart(4, "0")}`,
            ...orderToPrint.items.map((item) => `${item.qty}x ${item.name}`)
          ]
        : ["Fallback manual"];
    const job = await createManualFallbackJob(orderId, fallbackLines);
    if (job) {
      await updatePrintJobStatus(job.id, true);
    }
    window.setTimeout(() => {
      printReceiptFromDom().catch((printError: unknown) => {
        setError(printError instanceof Error ? printError.message : "Erro ao imprimir cupom.");
      });
    }, 50);
    if (selectedId === orderId) {
      await loadPrintJobs(orderId);
    }
  }

  function openCloseTableModal(orderId: string) {
    setError(null);
    setMessage(null);
    setCloseTablePaymentMethod("dinheiro");
    setCloseTableOrderId(orderId);
  }

  function closeCloseTableModal() {
    if (pendingId === closeTableOrderId) return;
    setCloseTableOrderId(null);
    setCloseTablePaymentMethod("dinheiro");
  }

  function openCloseDirectModal(orderId: string, payment?: string | null) {
    setError(null);
    setMessage(null);
    setCloseDirectPaymentMethod(
      ["dinheiro", "pix", "cartao", "credito", "debito"].includes((payment ?? "").toLowerCase())
        ? ((payment ?? "").toLowerCase() as CloseDirectOrderPayload["paymentMethod"])
        : "dinheiro"
    );
    setCloseDirectOrderId(orderId);
  }

  function closeCloseDirectModal() {
    if (pendingId === closeDirectOrderId) return;
    setCloseDirectOrderId(null);
    setCloseDirectPaymentMethod("dinheiro");
  }

  async function handleCloseTable(orderId: string, paymentMethod: CloseTableAccountPayload["paymentMethod"]) {
    try {
      setError(null);
      setMessage(null);
      setPendingId(orderId);

      const response = await fetch(`/api/admin/orders/${orderId}/close-table`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod })
      });
      const data = await readApiJson<CloseTableAccountResult & { error?: string }>(
        response,
        "Nao foi possivel fechar a mesa."
      );

      if (!response.ok) {
        throw new Error(data.error || "Nao foi possivel fechar a mesa.");
      }

      setOrders((current) => current.filter((order) => !data.orderIds.includes(order.id)));
      if (selectedIdRef.current && data.orderIds.includes(selectedIdRef.current)) {
        setSelectedId("");
        selectedIdRef.current = "";
        setSelectedOrder(null);
        setPrintJobs([]);
      }
      closeCloseTableModal();

      setMessage(
        `Mesa ${data.table} fechada com sucesso em ${paymentMethod}. Total final ${formatCurrency(Number(data.total ?? 0))}.`
      );
    } catch (closeError) {
      setError(closeError instanceof Error ? closeError.message : "Erro ao fechar mesa.");
    } finally {
      setPendingId(null);
    }
  }

  async function handleCloseDirectOrder(
    orderId: string,
    paymentMethod: CloseDirectOrderPayload["paymentMethod"]
  ) {
    try {
      setError(null);
      setMessage(null);
      setPendingId(orderId);

      const response = await fetch(`/api/admin/orders/${orderId}/close-direct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod })
      });
      const data = await readApiJson<CloseDirectOrderResult & { error?: string }>(
        response,
        "Nao foi possivel fechar o pedido."
      );

      if (!response.ok) {
        throw new Error(data.error || "Nao foi possivel fechar o pedido.");
      }

      setOrders((current) => current.filter((order) => order.id !== orderId));
      if (selectedIdRef.current === orderId) {
        setSelectedId("");
        selectedIdRef.current = "";
        setSelectedOrder(null);
        setPrintJobs([]);
      }
      closeCloseDirectModal();
      setMessage(`Pedido fechado no caixa em ${paymentMethod}.`);
    } catch (closeError) {
      setError(closeError instanceof Error ? closeError.message : "Erro ao fechar pedido.");
    } finally {
      setPendingId(null);
    }
  }

  const tabs = (Object.entries(statusMeta) as Array<[keyof typeof statusMeta, (typeof statusMeta)[keyof typeof statusMeta]]>).filter(
    ([key]) => workflowStatuses.includes(key)
  );

  useEffect(() => {
    const firstBoardEntry = boardEntries[0];
    if (!firstBoardEntry) {
      if (selectedId) {
        setSelectedId("");
        selectedIdRef.current = "";
      }
      if (selectedOrder) {
        setSelectedOrder(null);
      }
      if (printJobs.length) {
        setPrintJobs([]);
      }
      return;
    }

    const selectedStillVisible = boardEntries.some((entry) =>
      (isConcludedTableGroup(entry) ? entry.representativeId : entry.id) === selectedId
    );
    if (!selectedStillVisible) {
      setSelectedId(isConcludedTableGroup(firstBoardEntry) ? firstBoardEntry.representativeId : firstBoardEntry.id);
    }
  }, [boardEntries, selectedId, selectedOrder, printJobs.length]);

  return (
    <div className="space-y-4 2xl:space-y-5">

      {/* ── Barra de controles ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Tabs em controle segmentado */}
        <div className="flex items-center gap-0.5 rounded-2xl border border-admin-border bg-admin-surface p-1">
          {tabs.map(([key, meta]) => {
            const count = orders.filter((o) => o.status === key).length;
            const isActive = activeStatus === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveStatus(key)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "bg-admin-overlay text-admin-fg shadow-sm"
                    : "text-admin-fg-faint hover:text-admin-fg-muted"
                )}
              >
                {meta.label}
                <span
                  className={cn(
                    "min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums transition-colors",
                    isActive && count > 0 ? "bg-brand-purple text-admin-fg" : "bg-white/8 text-admin-fg-faint"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Botão de som */}
        <button
          type="button"
          onClick={toggleSound}
          className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
            soundEnabled
              ? "border-status-success-border bg-status-success-bg text-status-success-fg"
              : "border-admin-border bg-transparent text-admin-fg-faint hover:bg-admin-elevated"
          )}
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          {soundEnabled ? "Som ativo" : "Som off"}
        </button>
      </div>

      {/* ── Feedback ───────────────────────────────────────────── */}
      {message ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-status-success-border bg-status-success-bg px-4 py-3 text-sm text-status-success-fg">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-status-success-fg" />
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-status-danger-border bg-status-danger-bg px-4 py-3 text-sm text-status-danger-fg">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-status-danger-text" />
          {error}
        </div>
      ) : null}
      {!activePrinters.length ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-status-warning-text">
          <span>
            Nenhuma impressora esta cadastrada. O botao Aceitar e imprimir abre a impressao do navegador como fallback.
          </span>
        </div>
      ) : null}
      {settings.autoPrintEnabled && hasUsbAutoPrintPrinters && !printerBridge.automaticPrintingAvailable ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-status-warning-text">
          <span>QZ Tray ainda nao esta conectado nesta maquina. Conecte antes do rush para a USB imprimir sem susto.</span>
          <Button
            type="button"
            variant="outline"
            className="h-8 border-status-warning-border bg-transparent text-status-warning-fg hover:bg-status-warning-bg"
            onClick={() => void printerBridge.connectQzTray()}
          >
            Conectar QZ
          </Button>
        </div>
      ) : null}

      {/* ── Grid principal ─────────────────────────────────────── */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">

        {/* Lista de pedidos */}
        <div className="space-y-3">
          {boardEntries.length ? boardEntries.map((entry) => {
            const order = isConcludedTableGroup(entry)
              ? {
                  id: entry.representativeId,
                  number: entry.orderNumbers[entry.orderNumbers.length - 1] ?? 0,
                  type: entry.type,
                  customer: entry.customer,
                  status: entry.status,
                  total: entry.total,
                  items: entry.items,
                  minutesAgo: entry.minutesAgo
                }
              : entry;
            const primaryAction = isConcludedTableGroup(entry) ? null : getPrimaryAction(order.status, settings);
            const entryKey = isConcludedTableGroup(entry) ? entry.representativeId : order.id;
            const isSelected = selectedId === entryKey;
            const accentColor = ({
              novo: "bg-status-new-fg",
              aceito: "bg-status-info-fg",
              preparo: "bg-status-warning-fg",
              pronto: "bg-status-warning-fg",
              concluido: "bg-status-success-fg",
            } as Record<string, string>)[order.status] ?? "bg-status-success-fg";

            return (
              <div
                key={isConcludedTableGroup(entry) ? entry.id : order.id}
                onClick={() => setSelectedId(entryKey)}
                className={cn(
                  "admin-orders-shell-card group relative cursor-pointer overflow-hidden rounded-2xl border transition-all",
                  "bg-[var(--admin-panel-bg)]",
                  isSelected
                    ? "border-brand-purple ring-1 ring-brand-purple/15"
                    : "border-[var(--admin-panel-border)] hover:border-admin-border-strong"
                )}
              >
                {/* Faixa de cor lateral */}
                <div className={cn("absolute left-0 top-0 h-full w-[3px] rounded-l-2xl", accentColor)} />

                <div className="pl-5 pr-5 pt-4 pb-4">
                  {/* Linha 1: número + badge + tempo + total */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="admin-orders-card-title text-xl font-bold tracking-tight text-[var(--admin-title)]">
                        {isConcludedTableGroup(entry) ? `Mesa ${formatTableCode(entry.table)}` : getDisplayCode(order)}
                      </span>
                      <Badge
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-xs",
                          order.type.includes("Mesa")
                            ? "border-status-warning-border bg-status-warning-bg text-status-warning-fg"
                            : order.type === "Delivery"
                              ? "border-status-info-border bg-status-info-bg text-status-info-text"
                              : "border-status-success-border bg-status-success-bg text-status-success-fg"
                        )}
                      >
                        {order.type.includes("Mesa") ? <ShoppingBag className="mr-1 h-3 w-3" /> : <Truck className="mr-1 h-3 w-3" />}
                        {getOrderTypeLabel(order)}
                      </Badge>
                      {isConcludedTableGroup(entry) ? (
                        <Badge className="rounded-full border border-admin-border bg-admin-overlay px-2.5 py-0.5 text-xs text-admin-fg-muted">
                          {entry.orderCount} {entry.orderCount === 1 ? "pedido" : "pedidos"}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold text-status-warning-fg">{formatCurrency(order.total)}</p>
                      <p className="admin-orders-card-submeta mt-0.5 flex items-center justify-end gap-1 text-xs text-[var(--admin-subtle)]">
                        <Clock3 className="h-3 w-3" />
                        {order.minutesAgo} min
                      </p>
                    </div>
                  </div>

                  {/* Linha 2: cliente */}
                  <p className="admin-orders-card-meta mt-1.5 text-sm text-[var(--admin-subtle)]">
                    {order.customer}
                    {isConcludedTableGroup(entry)
                      ? ` · ${entry.orderNumbers.map((n) => `#${formatOrderCode(n)}`).join(", ")}`
                      : null}
                  </p>

                  {/* Itens */}
                  {order.items.length > 0 ? (
                    <div className="mt-3 space-y-0.5 border-t border-[var(--admin-panel-border)] pt-3">
                      {order.items.map((item) => (
                        <p key={item} className="text-sm text-[var(--admin-title)]">{item}</p>
                      ))}
                    </div>
                  ) : null}

                  {/* Ações */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {primaryAction ? (
                      <Button
                        type="button"
                        variant="admin"
                        className="h-9 rounded-xl text-sm"
                        disabled={pendingId === order.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          void updateStatus(order.id, primaryAction.targetStatus, {
                            printAfterStatusUpdate: primaryAction.targetStatus === "aceito"
                          });
                        }}
                      >
                        {pendingId === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        {primaryAction.label}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-xl border-[var(--admin-control-border)] bg-transparent text-sm text-[var(--admin-title)] hover:bg-[var(--admin-control-hover-bg)]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(entryKey);
                        void handleManualPrint(order.id);
                      }}
                    >
                      <Printer className="h-3.5 w-3.5" />
                      {getPrintButtonLabel(order.status)}
                    </Button>
                    {canCloseTable(order) ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-xl border-status-warning-border bg-status-warning-bg text-sm text-status-warning-fg hover:bg-status-warning-bg"
                        disabled={pendingId === order.id}
                        onClick={(e) => { e.stopPropagation(); openCloseTableModal(entryKey); }}
                      >
                        Fechar mesa
                      </Button>
                    ) : null}
                    {canCloseDirectOrder(order) ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-xl border-status-info-border bg-status-info-bg text-sm text-status-info-text hover:bg-status-info-bg"
                        disabled={pendingId === order.id}
                        onClick={(e) => { e.stopPropagation(); setSelectedId(entryKey); openCloseDirectModal(order.id); }}
                      >
                        Fechar pedido
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          }) : (
            /* Empty state da lista */
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-admin-border py-20 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-admin-border bg-admin-surface text-admin-fg-faint">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-admin-fg-faint">
                  Nenhum pedido em {activeTabMeta.label.toLowerCase()} no momento
                </p>
                <p className="mt-1 text-xs text-admin-fg-faint">{activeTabMeta.description}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Painel de detalhes ─────────────────────────────── */}
        <div className="admin-orders-shell-card sticky top-4 overflow-hidden rounded-2xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)]">
          {detailLoading ? (
            <div className="flex items-center justify-center py-24 text-[var(--admin-subtle)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : !selectedOrder && !selectedTableGroup ? (
            /* Empty state do detalhe */
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-24 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-admin-border bg-admin-surface text-admin-fg-faint">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <p className="text-sm text-admin-fg-faint">Selecione um pedido para ver os detalhes</p>
            </div>
          ) : (
            <>
              {/* Cabeçalho do detalhe */}
              <div className="border-b border-[var(--admin-panel-border)] bg-[var(--admin-panel-header-bg)] px-5 pt-5 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="admin-orders-detail-label text-xs uppercase tracking-[0.18em] text-[var(--admin-subtle)]">
                      Detalhes do pedido
                    </p>
                    <h2 className="admin-orders-detail-title mt-1 text-xl font-bold text-[var(--admin-title)]">
                      {selectedTableGroup
                        ? `Mesa ${formatTableCode(selectedTableGroup.table)} — Conta aberta`
                        : `${getDisplayCode(selectedOrder!)} · ${selectedOrder!.type ?? "Pedido"}`}
                    </h2>
                    <p className="admin-orders-detail-meta mt-0.5 text-xs text-[var(--admin-subtle)]">
                      {selectedTableGroup
                        ? `${selectedTableGroup.orderCount} pedidos vinculados`
                        : selectedOrder?.createdAt
                          ? new Date(selectedOrder.createdAt).toLocaleString("pt-BR")
                          : ""}
                    </p>
                  </div>
                  <Badge className="shrink-0 rounded-full border-status-warning-border bg-status-warning-bg px-3 py-1 text-status-warning-fg">
                    {selectedOrder?.status ?? "novo"}
                  </Badge>
                </div>

                {/* Stepper de workflow */}
                {visibleStatuses.length > 0 ? (
                  <div className="mt-4 flex items-center gap-1">
                    {visibleStatuses.map((status, idx) => {
                      const currentIndex = selectedOrder
                        ? workflowStatuses.indexOf(selectedOrder.status as (typeof workflowStatuses)[number])
                        : -1;
                      const statusIndex = workflowStatuses.indexOf(status as (typeof workflowStatuses)[number]);
                      const isCurrent = selectedOrder?.status === status;
                      const isCompleted = currentIndex > -1 && statusIndex > -1 && statusIndex < currentIndex;
                      return (
                        <div key={status} className="flex flex-1 items-center gap-1">
                          <div
                            data-state={isCurrent ? "current" : isCompleted ? "completed" : "idle"}
                            className={cn(
                              "admin-orders-workflow-chip flex-1 rounded-lg px-2 py-1.5 text-center text-xs font-medium uppercase tracking-[0.06em] transition-all",
                              isCurrent
                                ? "bg-status-new-bg text-status-new-fg ring-1 ring-brand-purple"
                                : isCompleted
                                  ? "bg-status-success-bg text-status-success-fg"
                                  : "bg-admin-elevated text-admin-fg-faint"
                            )}
                          >
                            {status}
                          </div>
                          {idx < visibleStatuses.length - 1 ? (
                            <div className={cn("h-px w-2 shrink-0", isCompleted ? "bg-status-success-fg" : "bg-admin-overlay")} />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {/* Mensagem de status operacional */}
                {selectedOrder ? (
                  <p className="mt-3 text-xs leading-5 text-[var(--admin-subtle)]">
                    {selectedOrder.status === "novo" && "Aguardando validacao do caixa."}
                    {selectedOrder.status === "aceito" && "Comanda pode ser impressa e levada para a cozinha."}
                    {selectedOrder.status === "preparo" && "Cozinha em producao."}
                    {selectedOrder.status === "pronto" && "Pronto para servir ou despachar."}
                    {selectedOrder.status === "concluido" &&
                      (selectedOrder.kind === "mesa"
                        ? "Entregue. Conta da mesa pode continuar aberta."
                        : "Concluido. Pronto para fechamento financeiro.")}
                    {selectedOrder.tableAccountClosed
                      ? ` Conta fechada em ${selectedOrder.tableClosedPayment ?? "—"}.`
                      : null}
                  </p>
                ) : null}
              </div>

              {/* Corpo do detalhe: seções divididas */}
              <div className="divide-y divide-[var(--admin-panel-border)]">

                {/* Itens */}
                <div className="space-y-2 p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--admin-subtle)]">Itens</p>
                  {selectedTableGroup
                    ? selectedTableGroup.items.map((item) => (
                        <div
                          key={item}
                          className="flex items-center rounded-xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-header-bg)] px-4 py-2.5"
                        >
                          <span className="text-sm text-[var(--admin-title)]">{item}</span>
                        </div>
                      ))
                    : selectedOrder?.items.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-header-bg)] px-4 py-2.5"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm text-[var(--admin-title)]">
                              {item.qty}x {item.name}
                            </span>
                            <span className="text-sm font-medium text-status-warning-fg">
                              {formatCurrency(item.qty * item.price)}
                            </span>
                          </div>
                          {item.note ? (
                            <p className="mt-1 text-xs text-[var(--admin-subtle)]">Obs: {item.note}</p>
                          ) : null}
                        </div>
                      ))}
                </div>

                {/* Cliente */}
                <div className="space-y-1.5 p-5 text-sm">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--admin-subtle)]">Cliente</p>
                  <p className="text-[var(--admin-title)]">
                    {selectedTableGroup
                      ? `Mesa ${formatTableCode(selectedTableGroup.table)}`
                      : selectedOrder?.table
                        ? `Mesa ${formatTableCode(selectedOrder.table)}`
                        : selectedOrder?.customer || "Cliente"}
                  </p>
                  {selectedOrder?.phone ? (
                    <p className="text-[var(--admin-subtle)]">Tel: {selectedOrder.phone}</p>
                  ) : null}
                  {selectedOrder?.address ? (
                    <p className="text-[var(--admin-subtle)]">
                      {selectedOrder.address.rua}, {selectedOrder.address.numero} — {selectedOrder.address.bairro}
                      {selectedOrder.address.referencia ? ` (${selectedOrder.address.referencia})` : ""}
                    </p>
                  ) : null}
                  <p className="text-[var(--admin-subtle)]">
                    Pagamento:{" "}
                    {selectedTableGroup
                      ? "Definir no fechamento"
                      : selectedOrder?.payment || "—"}
                  </p>
                  {selectedOrder?.changeFor ? (
                    <p className="text-[var(--admin-subtle)]">Troco para: {formatCurrency(selectedOrder.changeFor)}</p>
                  ) : null}
                  {selectedOrder?.notes ? (
                    <p className="text-[var(--admin-subtle)]">Obs: {selectedOrder.notes}</p>
                  ) : null}
                </div>

                {/* Pedidos vinculados (mesa) */}
                {selectedTableGroup ? (
                  <div className="space-y-2 p-5">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--admin-subtle)]">
                      Pedidos vinculados
                    </p>
                    {selectedTableGroup.orders.map((o) => (
                      <div
                        key={o.id}
                        className="rounded-xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-header-bg)] px-4 py-2.5"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-[var(--admin-title)]">#{formatOrderCode(o.number)}</span>
                          <span className="text-sm text-status-warning-fg">{formatCurrency(o.total)}</span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--admin-subtle)]">{o.items.join(" · ")}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* Impressões */}
                {!selectedTableGroup ? (
                  <div className="space-y-2 p-5">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--admin-subtle)]">Impressoes</p>
                    {printJobs.length ? (
                      printJobs.map((job) => (
                        <div
                          key={job.id}
                          className="rounded-xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-header-bg)] px-4 py-2.5"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm text-[var(--admin-title)]">
                              {job.printerName || "Fallback manual"}
                            </span>
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-xs font-medium uppercase",
                                job.status === "success"
                                  ? "bg-status-success-bg text-status-success-fg"
                                  : job.status === "failed"
                                    ? "bg-status-danger-bg text-status-danger-fg"
                                    : "bg-status-warning-bg text-status-warning-fg"
                              )}
                            >
                              {job.status}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[var(--admin-subtle)]">
                            {job.triggerSource} · {job.transportType} ·{" "}
                            {new Date(job.createdAt).toLocaleString("pt-BR")}
                          </p>
                          {job.errorMessage ? (
                            <p className="mt-1 text-xs text-status-danger-fg">Erro: {job.errorMessage}</p>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[var(--admin-subtle)]">Nenhum log ainda.</p>
                    )}
                  </div>
                ) : null}

                {/* Total */}
                <div className="flex items-center justify-between px-5 py-4">
                  <span className="text-sm text-[var(--admin-subtle)]">Total</span>
                  <span className="text-2xl font-bold text-status-warning-fg">
                    {formatCurrency(selectedTableGroup?.total ?? selectedOrder?.total ?? 0)}
                  </span>
                </div>
              </div>

              {/* Ações do detalhe */}
              <div className="space-y-2 border-t border-[var(--admin-panel-border)] p-5">
                {selectedOrder && !selectedTableGroup && getPrimaryAction(selectedOrder.status, settings) ? (
                  <Button
                    type="button"
                    variant="admin"
                    className="h-11 w-full rounded-xl"
                    disabled={pendingId === selectedOrder.id}
                    onClick={() => {
                      const action = getPrimaryAction(selectedOrder.status, settings);
                      if (action) {
                        void updateStatus(selectedOrder.id, action.targetStatus, {
                          printAfterStatusUpdate: action.targetStatus === "aceito"
                        });
                      }
                    }}
                  >
                    {pendingId === selectedOrder.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {getPrimaryAction(selectedOrder.status, settings)?.label}
                  </Button>
                ) : null}

                {(selectedOrder || selectedTableGroup) ? (
                  <Button
                    type="button"
                    variant="default"
                    className="h-11 w-full rounded-xl"
                    onClick={() => {
                      if (!selectedOrder) return;
                      void handleManualPrint(selectedTableGroup?.representativeId ?? selectedOrder.id);
                    }}
                  >
                    <Printer className="h-4 w-4" />
                    {selectedTableGroup
                      ? "Reimprimir ultimo pedido"
                      : getPrintButtonLabel(selectedOrder!.status)}
                  </Button>
                ) : null}

                {(selectedTableGroup || (selectedOrder && canCloseTable(selectedOrder))) ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full rounded-xl border-status-warning-border bg-status-warning-bg text-status-warning-fg hover:bg-status-warning-bg"
                    disabled={pendingId === (selectedTableGroup?.representativeId ?? selectedOrder?.id ?? "")}
                    onClick={() =>
                      openCloseTableModal(selectedTableGroup?.representativeId ?? selectedOrder?.id ?? "")
                    }
                  >
                    Fechar mesa
                  </Button>
                ) : null}

                {selectedOrder && canCloseDirectOrder(selectedOrder) ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full rounded-xl border-status-info-border bg-status-info-bg text-status-info-text hover:bg-status-info-bg"
                    disabled={pendingId === selectedOrder.id}
                    onClick={() => openCloseDirectModal(selectedOrder.id, selectedOrder.payment)}
                  >
                    Fechar pedido
                  </Button>
                ) : null}

                {selectedOrder ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 w-full rounded-xl text-sm font-medium text-status-danger-fg hover:bg-status-danger-bg hover:text-status-danger-text"
                    onClick={() => void updateStatus(selectedOrder.id, "cancelado")}
                  >
                    Cancelar pedido
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>

      <OrderPrintSheet order={printSheetOrder ?? selectedOrder} />

      {closeTableOrderId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={closeCloseTableModal}
        >
          <div
            className="w-full max-w-xl rounded-ds-2xl border border-admin-border bg-admin-elevated shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-5 p-6">
              <div className="space-y-2">
                <p className="text-sm uppercase tracking-[0.2em] text-admin-fg-muted">Fechamento de mesa</p>
                <h3 className="text-2xl font-semibold text-admin-fg">{closeTableLabel}</h3>
                <p className="text-sm text-admin-fg-secondary">
                  Feche a conta total da mesa quando os clientes forem embora. A comanda operacional ja foi concluida.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-admin-border bg-admin-surface p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-admin-fg-muted">Pedidos</p>
                  <p className="mt-2 text-2xl font-semibold text-admin-fg">{closeTableSummary.orderCount}</p>
                </div>
                <div className="rounded-2xl border border-admin-border bg-admin-surface p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-admin-fg-muted">Total</p>
                  <p className="mt-2 text-2xl font-semibold text-status-warning-fg">
                    {formatCurrency(closeTableSummary.total)}
                  </p>
                </div>
                <div className="rounded-2xl border border-admin-border bg-admin-surface p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-admin-fg-muted">Ainda em aberto</p>
                  <p className="mt-2 text-2xl font-semibold text-admin-fg">{closeTableSummary.pendingCount}</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-admin-fg">Forma de pagamento</p>
                <div className="flex flex-wrap gap-2">
                  {([
                    ["dinheiro", "Dinheiro"],
                    ["pix", "Pix"],
                    ["cartao", "Cartao"],
                    ["credito", "Credito"],
                    ["debito", "Debito"]
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCloseTablePaymentMethod(value)}
                      className={cn(
                        "rounded-2xl border px-4 py-2 text-sm font-medium transition-colors",
                        closeTablePaymentMethod === value
                          ? "border-status-warning-border bg-status-warning-bg text-status-warning-fg"
                          : "border-admin-border bg-admin-surface text-admin-fg-secondary hover:bg-admin-overlay"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {closeTableSummary.pendingCount > 0 ? (
                <div className="rounded-2xl border border-status-danger-border bg-status-danger-bg px-4 py-3 text-sm text-status-danger-fg">
                  Ainda existem pedidos dessa mesa em andamento. Conclua todos antes de fechar a conta.
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-admin-border bg-transparent text-admin-fg-secondary hover:bg-admin-overlay"
                  onClick={closeCloseTableModal}
                  disabled={pendingId === closeTableOrderId}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="admin"
                  disabled={
                    !closeTableOrderId ||
                    closeTableSummary.orderCount === 0 ||
                    closeTableSummary.pendingCount > 0 ||
                    pendingId === closeTableOrderId
                  }
                  onClick={() =>
                    closeTableOrderId && void handleCloseTable(closeTableOrderId, closeTablePaymentMethod)
                  }
                >
                  {pendingId === closeTableOrderId ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Confirmar fechamento
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog
        open={!!closeDirectOrderId}
        onOpenChange={(open) => { if (!open && pendingId !== closeDirectOrderId) closeCloseDirectModal(); }}
      >
        <DialogContent className="overflow-hidden rounded-3xl border-admin-border bg-admin-surface p-0 shadow-panel sm:max-w-lg [&>button]:text-admin-fg-muted [&>button]:hover:text-admin-fg [&>button]:top-5 [&>button]:right-5">
          <DialogHeader className="px-7 pt-7 pb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-admin-fg-muted">Fechamento de pedido</p>
            <DialogTitle className="mt-1 text-3xl font-bold text-admin-fg">
              {closeDirectOrder
                ? `${getDisplayCode(closeDirectOrder)} · ${closeDirectOrder.type.charAt(0).toUpperCase() + closeDirectOrder.type.slice(1).toLowerCase()}`
                : "Pedido"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 border-t border-admin-border-faint">
            <div className="px-7 py-5 border-r border-admin-border-faint">
              <p className="text-xs uppercase tracking-[0.18em] text-admin-fg-muted">Cliente</p>
              <p className="mt-2 text-lg font-bold text-admin-fg">{closeDirectOrder?.customer ?? "—"}</p>
            </div>
            <div className="px-7 py-5">
              <p className="text-xs uppercase tracking-[0.18em] text-admin-fg-muted">Total</p>
              <p className="mt-2 text-3xl font-bold text-status-warning-fg">
                {formatCurrency(closeDirectOrder?.total ?? 0)}
              </p>
            </div>
          </div>

          <div className="border-t border-admin-border-faint px-7 py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-admin-fg-muted">Forma de pagamento</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {([
                ["dinheiro", "Dinheiro"],
                ["pix", "Pix"],
                ["cartao", "Cartao"],
                ["credito", "Credito"],
                ["debito", "Debito"]
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCloseDirectPaymentMethod(value)}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-semibold transition-all",
                    closeDirectPaymentMethod === value
                      ? "border-status-warning-border bg-status-warning-bg text-status-warning-fg ring-1 ring-status-warning-border"
                      : "border-admin-border bg-admin-elevated text-admin-fg-secondary hover:border-admin-border-strong hover:bg-admin-overlay hover:text-admin-fg"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="flex-row items-center justify-between border-t border-admin-border-faint px-7 py-5 sm:justify-between">
            <button
              type="button"
              className="text-sm font-medium text-admin-fg-muted transition-colors hover:text-admin-fg disabled:opacity-40"
              onClick={closeCloseDirectModal}
              disabled={pendingId === closeDirectOrderId}
            >
              Cancelar
            </button>
            <Button
              type="button"
              variant="admin"
              className="h-11 rounded-xl px-6 text-sm font-semibold"
              disabled={!closeDirectOrderId || pendingId === closeDirectOrderId}
              onClick={() =>
                closeDirectOrderId && void handleCloseDirectOrder(closeDirectOrderId, closeDirectPaymentMethod)
              }
            >
              {pendingId === closeDirectOrderId ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirmar fechamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}
