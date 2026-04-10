"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, Loader2, Printer, ShoppingBag, Truck, Volume2, VolumeX } from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/realtime/client";
import { getOrderWorkflow } from "@/lib/order-settings";
import { OrderPrintSheet } from "@/features/orders/components/order-print-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePrinterBridge } from "@/features/printers/hooks/use-printer-bridge";
import { useAdminSoundPreference } from "@/features/orders/hooks/use-order-sound";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  AdminOrder,
  CloseDirectOrderPayload,
  CloseTableAccountPayload,
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
    color: "bg-[#231534] text-[#d8c8ff] border-[#6b46c1]",
    description: "Pedidos que acabaram de chegar do QR Code, delivery ou lancamento manual."
  },
  aceito: {
    label: "Aceitos",
    color: "bg-[#231534] text-[#d8c8ff] border-[#6b46c1]",
    description: "Pedidos validados pelo caixa. Aqui a comanda pode ser impressa no caixa e levada para a cozinha."
  },
  preparo: {
    label: "Em preparo",
    color: "bg-[#231534] text-[#d8c8ff] border-[#6b46c1]",
    description: "A cozinha ja recebeu a comanda e iniciou o preparo do pedido."
  },
  pronto: {
    label: "Prontos",
    color: "bg-[#231534] text-[#d8c8ff] border-[#6b46c1]",
    description: "Pedidos prontos para servir na mesa, retirar no balcao ou despachar."
  },
  concluido: {
    label: "Concluidos",
    color: "bg-[#231534] text-[#d8c8ff] border-[#6b46c1]",
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
  const workflowStatuses = useMemo(() => getOrderWorkflow(settings), [settings]);
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
      const nextOrders = (await response.json()) as AdminOrder[];
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
      const detail = (await response.json()) as OrderDetail;
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
      const data = (await response.json()) as PrintJobRecord[];
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
    return (await response.json()) as PrintJobRecord;
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

  async function updateStatus(orderId: string, status?: OrderStatus) {
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
      const updated = await response.json();
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
      if (settings.autoPrintEnabled && updatedStatus === settings.autoPrintTriggerStatus) {
        await dispatchAutoPrint(orderId);
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
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Falha ao preparar impressao.");
    }

    return data as {
      order: OrderDetail;
      jobs: Array<{ printer: PrinterRecord; lines: string[]; printJob: PrintJobRecord }>;
      message: string;
    };
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

  async function handleManualPrint(orderId: string) {
    try {
      setError(null);
      setMessage(null);
      const prepared = await dispatchPreparedJobs(orderId, "manual_reprint");
      if (!prepared.jobs.length) {
        setMessage("Nenhuma impressora ativa encontrada. Usando fallback manual.");
        await handlePrint(orderId, prepared.order);
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
        await handlePrint(orderId, prepared.order);
      } else {
        setMessage("Pedido impresso com sucesso.");
      }
    } catch (printError) {
      setError(printError instanceof Error ? printError.message : "Falha ao imprimir. Abrindo fallback manual.");
      await handlePrint(orderId, selectedOrder);
    }
  }

  async function handlePrint(orderId: string, order?: OrderDetail | null) {
    const fallbackLines =
      order?.items?.length
        ? [
            `Pedido #${String(order.number).padStart(4, "0")}`,
            ...order.items.map((item) => `${item.qty}x ${item.name}`)
          ]
        : ["Fallback manual"];
    const job = await createManualFallbackJob(orderId, fallbackLines);
    if (job) {
      await updatePrintJobStatus(job.id, true);
    }
    window.setTimeout(() => window.print(), 50);
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
      const data = await response.json();

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
      const data = await response.json();

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          {tabs.map(([key, meta]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveStatus(key)}
              className={cn(
                "flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors",
                activeStatus === key ? meta.color : "border-[#353535] bg-[#1a1a1a] text-[#c8c2b7] hover:bg-[#222222]"
              )}
            >
              <span>{meta.label}</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
                {orders.filter((order) => order.status === key).length}
              </span>
            </button>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          className="border-[#313131] bg-transparent text-[#e5dfd5] hover:bg-[#212121]"
          onClick={toggleSound}
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          {soundEnabled ? "Som ativo" : "Som desligado"}
        </Button>
      </div>

      {message ? <p className="text-sm font-medium text-emerald-400">{message}</p> : null}
      {error ? <p className="text-sm font-medium text-red-400">{error}</p> : null}
      <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] px-4 py-3 text-sm text-[#b8b0a4]">
        <span className="font-medium text-white">{activeTabMeta.label}:</span> {activeTabMeta.description}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_380px] xl:items-start">
        <div className="space-y-4">
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

            return (
            <div key={isConcludedTableGroup(entry) ? entry.id : order.id} className="block w-full text-left">
              <Card
                onClick={() => setSelectedId(entryKey)}
                className={cn(
                    "admin-orders-shell-card cursor-pointer border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] shadow-admin transition-colors",
                  selectedId === entryKey && "border-[#5b34ff]"
                )}
              >
                <CardContent className="space-y-5 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="admin-orders-card-title text-lg font-semibold text-[var(--admin-title)]">
                          {isConcludedTableGroup(entry) ? `Mesa ${formatTableCode(entry.table)}` : getDisplayCode(order)}
                        </p>
                        <Badge
                          className={cn(
                            "w-fit rounded-full border px-3 py-1",
                            order.type.includes("Mesa")
                              ? "border-[#8d6507] bg-[#2d2209] text-[#f4c35a]"
                              : order.type === "Delivery"
                                ? "border-[#22547b] bg-[#10263c] text-[#8fd0ff]"
                                : "border-[#285f45] bg-[#11261d] text-[#91e0b2]"
                          )}
                        >
                          {order.type.includes("Mesa") ? <ShoppingBag className="mr-1 h-3.5 w-3.5" /> : <Truck className="mr-1 h-3.5 w-3.5" />}
                          {getOrderTypeLabel(order)}
                        </Badge>
                        {isConcludedTableGroup(entry) ? (
                          <Badge className="rounded-full border border-[#3a3a3a] bg-[#202020] px-3 py-1 text-[#d8d1c7]">
                            {entry.orderCount} {entry.orderCount === 1 ? "pedido" : "pedidos"}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="admin-orders-card-meta text-sm text-[var(--admin-subtle)]">{order.customer}</p>
                      {isConcludedTableGroup(entry) ? (
                        <p className="admin-orders-card-submeta text-xs text-[var(--admin-subtle)]">
                          Pedidos vinculados: {entry.orderNumbers.map((number) => `#${formatOrderCode(number)}`).join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-[#f4c35a]">{formatCurrency(order.total)}</p>
                      <p className="admin-orders-card-submeta flex items-center justify-end gap-1 text-sm text-[var(--admin-subtle)]">
                        <Clock3 className="h-3.5 w-3.5" />
                        ha {order.minutesAgo} min
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-sm text-[var(--admin-title)]">
                    {order.items.map((item) => (
                      <p key={item}>{item}</p>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {primaryAction ? (
                      <Button
                        type="button"
                        variant="admin"
                        disabled={pendingId === order.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          void updateStatus(order.id, primaryAction.targetStatus);
                        }}
                      >
                        {pendingId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {primaryAction.label}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                        className="border-[var(--admin-control-border)] bg-transparent text-[var(--admin-title)] hover:bg-[var(--admin-control-hover-bg)]"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedId(entryKey);
                        void handleManualPrint(order.id);
                      }}
                    >
                      <Printer className="h-4 w-4" />
                      {getPrintButtonLabel(order.status)}
                    </Button>
                    {canCloseTable(order) ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="border-[#8d6507] bg-[#2d2209] text-[#f4c35a] hover:bg-[#3a2a0a]"
                        disabled={pendingId === order.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          openCloseTableModal(entryKey);
                        }}
                      >
                        Fechar mesa
                      </Button>
                    ) : null}
                    {canCloseDirectOrder(order) ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="border-[#22547b] bg-[#10263c] text-[#8fd0ff] hover:bg-[#153149]"
                        disabled={pendingId === order.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedId(entryKey);
                          openCloseDirectModal(order.id);
                        }}
                      >
                        Fechar pedido
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}) : (
            <Card className="admin-orders-shell-card border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] shadow-admin">
              <CardContent className="p-8 text-center text-sm text-[var(--admin-subtle)]">
                Nenhum pedido em {statusMeta[activeStatus as keyof typeof statusMeta]?.label.toLowerCase()} no momento.
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="admin-orders-shell-card sticky top-4 border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] shadow-admin">
          <CardContent className="space-y-5 p-6">
            {detailLoading ? (
              <div className="flex items-center justify-center py-10 text-[var(--admin-subtle)]">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : !selectedOrder && !selectedTableGroup ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-[var(--admin-subtle)]">
                <ShoppingBag className="h-8 w-8 opacity-30" />
                <p className="text-sm">Selecione um pedido para ver os detalhes.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="admin-orders-detail-label text-sm text-[var(--admin-subtle)]">Detalhes do pedido</p>
                    <h2 className="admin-orders-detail-title text-2xl font-semibold text-[var(--admin-title)]">
                      {selectedTableGroup
                        ? `Mesa ${formatTableCode(selectedTableGroup.table)} - Conta aberta`
                        : `${getDisplayCode(selectedOrder!)} - ${selectedOrder!.type ?? "Pedido"}`}
                    </h2>
                    <p className="admin-orders-detail-meta mt-1 text-sm text-[var(--admin-subtle)]">
                      {selectedTableGroup
                        ? `Pedidos vinculados: ${selectedTableGroup.orderNumbers.map((number) => `#${formatOrderCode(number)}`).join(", ")}`
                        : selectedOrder?.createdAt
                          ? new Date(selectedOrder.createdAt).toLocaleString("pt-BR")
                          : ""}
                    </p>
                  </div>
                  <Badge className="rounded-full border-[#7a5a12] bg-[#3a2a0a] px-3 py-1 text-[#f5c768]">
                    {selectedOrder?.status ?? "novo"}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2">
                  {visibleStatuses.map((status) => {
                    const currentIndex = selectedOrder ? workflowStatuses.indexOf(selectedOrder.status as (typeof workflowStatuses)[number]) : -1;
                    const statusIndex = workflowStatuses.indexOf(status as (typeof workflowStatuses)[number]);
                    const isCurrent = selectedOrder?.status === status;
                    const isCompleted = currentIndex > -1 && statusIndex > -1 && statusIndex < currentIndex;

                    return (
                      <span
                        key={status}
                        data-state={isCurrent ? "current" : isCompleted ? "completed" : "idle"}
                        className={cn(
                          "admin-orders-workflow-chip rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.08em]",
                          isCurrent
                            ? "border-[#5b34ff] bg-[#2a1944] text-[#d4c2ff]"
                            : isCompleted
                              ? "border-[#2d3a30] bg-[#162219] text-[#92d5a9]"
                              : "border-[#313131] bg-transparent text-[#9f988d]"
                        )}
                      >
                        {status}
                      </span>
                    );
                  })}
                </div>

                {selectedOrder ? (
                  <div className="rounded-[24px] border border-[var(--admin-panel-header-border)] bg-[var(--admin-panel-header-bg)] p-4 text-sm text-[var(--admin-title)]">
                    <p className="font-medium uppercase tracking-[0.18em] text-[var(--admin-subtle)]">Fluxo operacional</p>
                    <p className="mt-2 text-[var(--admin-title)]">
                      {selectedOrder.status === "novo" && "Pedido novo aguardando validacao do caixa."}
                      {selectedOrder.status === "aceito" && "Pedido validado. A comanda pode ser impressa no caixa e levada para a cozinha."}
                      {selectedOrder.status === "preparo" && "Cozinha ja iniciou o preparo do pedido."}
                      {selectedOrder.status === "pronto" && "Pedido pronto para servir ou entregar."}
                      {selectedOrder.status === "concluido" &&
                        (selectedOrder.kind === "mesa"
                          ? "Pedido entregue. A conta da mesa pode continuar aberta para novos consumos."
                          : "Pedido operacional concluido e pronto para fechamento financeiro.")}
                    </p>
                    {selectedTableGroup ? (
                      <p className="mt-3 text-[var(--admin-subtle)]">
                        A conta da mesa esta consolidada com {selectedTableGroup.orderCount} pedidos concluidos.
                      </p>
                    ) : null}
                    {selectedOrder.tableAccountClosed ? (
                      <p className="mt-3 text-[#92d5a9]">
                        Conta da mesa fechada em {selectedOrder.tableClosedPayment ?? "-"} em{" "}
                        {selectedOrder.tableClosedAt
                          ? new Date(selectedOrder.tableClosedAt).toLocaleString("pt-BR")
                          : "-"}
                        .
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="space-y-3 rounded-[24px] border border-[var(--admin-panel-header-border)] bg-[var(--admin-panel-header-bg)] p-4">
                  <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--admin-subtle)]">Itens</p>
                  {selectedTableGroup
                    ? selectedTableGroup.items.map((item) => (
                        <div key={item} className="rounded-2xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] px-4 py-3 text-[var(--admin-title)]">
                          <div className="flex items-center justify-between gap-3">
                            <span>{item}</span>
                          </div>
                        </div>
                      ))
                    : selectedOrder?.items.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] px-4 py-3 text-[var(--admin-title)]">
                          <div className="flex items-center justify-between gap-3">
                            <span>
                              {item.qty}x {item.name}
                            </span>
                            <span>{formatCurrency(item.qty * item.price)}</span>
                          </div>
                          {item.note ? <p className="mt-1 text-sm text-[var(--admin-subtle)]">Obs: {item.note}</p> : null}
                        </div>
                      ))}
                </div>

                <div className="space-y-2 rounded-[24px] border border-[var(--admin-panel-header-border)] bg-[var(--admin-panel-header-bg)] p-4 text-sm text-[var(--admin-title)]">
                  <p className="font-medium uppercase tracking-[0.18em] text-[var(--admin-subtle)]">Cliente</p>
                  <p>{selectedTableGroup ? `Mesa ${formatTableCode(selectedTableGroup.table)}` : selectedOrder?.table
                      ? `Mesa ${formatTableCode(selectedOrder.table)}`
                      : selectedOrder?.customer || "Cliente"}</p>
                  {selectedOrder?.phone ? <p>Telefone: {selectedOrder.phone}</p> : null}
                  {selectedOrder?.address ? (
                    <>
                      <p>
                        Endereco: {selectedOrder.address.rua}, {selectedOrder.address.numero}
                      </p>
                      <p>Bairro: {selectedOrder.address.bairro}</p>
                      {selectedOrder.address.referencia ? <p>Referencia: {selectedOrder.address.referencia}</p> : null}
                    </>
                  ) : null}
                  <p>Pagamento: {selectedTableGroup ? "Definir no fechamento da mesa" : selectedOrder?.payment || "-"}</p>
                  {selectedOrder?.changeFor ? <p>Troco para: {formatCurrency(selectedOrder.changeFor)}</p> : null}
                  {selectedOrder?.notes ? <p>Observacao: {selectedOrder.notes}</p> : null}
                </div>

                {selectedTableGroup ? (
                  <div className="space-y-3 rounded-[24px] border border-[var(--admin-panel-header-border)] bg-[var(--admin-panel-header-bg)] p-4 text-sm text-[var(--admin-title)]">
                    <p className="font-medium uppercase tracking-[0.18em] text-[var(--admin-subtle)]">Pedidos vinculados</p>
                    {selectedTableGroup.orders.map((order) => (
                      <div key={order.id} className="rounded-2xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[var(--admin-title)]">#{formatOrderCode(order.number)}</span>
                          <span className="text-[#f4c35a]">{formatCurrency(order.total)}</span>
                        </div>
                    <p className="mt-2 text-xs text-[var(--admin-subtle)]">{order.items.join(" - ")}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {selectedTableGroup ? null : (
                  <div className="space-y-3 rounded-[24px] border border-[var(--admin-panel-header-border)] bg-[var(--admin-panel-header-bg)] p-4 text-sm text-[var(--admin-title)]">
                    <p className="font-medium uppercase tracking-[0.18em] text-[var(--admin-subtle)]">Impressoes</p>
                    {printJobs.length ? (
                      printJobs.map((job) => (
                        <div key={job.id} className="rounded-2xl border border-[var(--admin-panel-border)] bg-[var(--admin-panel-bg)] px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[var(--admin-title)]">
                              {job.printerName || "Fallback manual"} - {job.destination}
                            </span>
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-1 text-xs font-medium uppercase",
                                job.status === "success"
                                  ? "bg-[#173122] text-[#9fe0b9]"
                                  : job.status === "failed"
                                    ? "bg-[#351919] text-[#f4b4b4]"
                                    : "bg-[#292117] text-[#efc36a]"
                              )}
                            >
                              {job.status}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-[#a9a293]">
                            {job.triggerSource} - {job.transportType} -{" "}
                            {new Date(job.createdAt).toLocaleString("pt-BR")}
                          </p>
                          {job.errorMessage ? (
                            <p className="mt-2 text-xs text-[#f0b1b1]">Erro: {job.errorMessage}</p>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <p className="text-[#9d978b]">Nenhum log de impressao para este pedido ainda.</p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-[#292929] pt-4">
                  <span className="text-base text-[#bcb5aa]">Total</span>
                  <span className="text-2xl font-semibold text-[#f4c35a]">
                    {formatCurrency(selectedTableGroup?.total ?? selectedOrder?.total ?? 0)}
                  </span>
                </div>

                <div className="space-y-3">
                  {selectedOrder && !selectedTableGroup && getPrimaryAction(selectedOrder.status, settings) ? (
                    <Button
                      type="button"
                      className="h-12 w-full rounded-2xl"
                      variant="admin"
                      disabled={pendingId === selectedOrder.id}
                      onClick={() => {
                        const action = getPrimaryAction(selectedOrder.status, settings);
                        if (action) {
                          void updateStatus(selectedOrder.id, action.targetStatus);
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
                      className="h-12 w-full rounded-2xl"
                      variant="default"
                      onClick={() => selectedOrder && void handleManualPrint(selectedTableGroup?.representativeId ?? selectedOrder.id)}
                    >
                      <Printer className="h-4 w-4" />
                      {selectedTableGroup ? "Reimprimir ultimo pedido" : getPrintButtonLabel(selectedOrder!.status)}
                    </Button>
                  ) : null}
                  {(selectedTableGroup || (selectedOrder && canCloseTable(selectedOrder))) ? (
                    <Button
                      type="button"
                      className="h-12 w-full rounded-2xl"
                      variant="outline"
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
                      className="h-12 w-full rounded-2xl"
                      variant="outline"
                      disabled={pendingId === selectedOrder.id}
                      onClick={() => openCloseDirectModal(selectedOrder.id, selectedOrder.payment)}
                    >
                      Fechar pedido
                    </Button>
                  ) : null}
                </div>
                {selectedOrder ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-sm font-medium text-[#f08a8a] hover:bg-[#2a1717] hover:text-[#ffb1b1]"
                    onClick={() => void updateStatus(selectedOrder.id, "cancelado")}
                  >
                    Cancelar pedido
                  </Button>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <OrderPrintSheet order={selectedOrder} />

      {closeTableOrderId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={closeCloseTableModal}
        >
          <div
            className="w-full max-w-xl rounded-[28px] border border-[#313131] bg-[#171717] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-5 p-6">
              <div className="space-y-2">
                <p className="text-sm uppercase tracking-[0.2em] text-[#8f8a82]">Fechamento de mesa</p>
                <h3 className="text-2xl font-semibold text-white">{closeTableLabel}</h3>
                <p className="text-sm text-[#bcb5aa]">
                  Feche a conta total da mesa quando os clientes forem embora. A comanda operacional ja foi concluida.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8d877b]">Pedidos</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{closeTableSummary.orderCount}</p>
                </div>
                <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8d877b]">Total</p>
                  <p className="mt-2 text-2xl font-semibold text-[#f4c35a]">
                    {formatCurrency(closeTableSummary.total)}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8d877b]">Ainda em aberto</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{closeTableSummary.pendingCount}</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-white">Forma de pagamento</p>
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
                          ? "border-[#8d6507] bg-[#2d2209] text-[#f4c35a]"
                          : "border-[#2f2f2f] bg-[#121212] text-[#d7d0c5] hover:bg-[#1a1a1a]"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {closeTableSummary.pendingCount > 0 ? (
                <div className="rounded-2xl border border-[#4a1f1f] bg-[#251313] px-4 py-3 text-sm text-[#f0b1b1]">
                  Ainda existem pedidos dessa mesa em andamento. Conclua todos antes de fechar a conta.
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#313131] bg-transparent text-[#e5dfd5] hover:bg-[#212121]"
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

      {closeDirectOrderId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={closeCloseDirectModal}
        >
          <div
            className="w-full max-w-xl rounded-[28px] border border-[#313131] bg-[#171717] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-5 p-6">
              <div className="space-y-2">
                <p className="text-sm uppercase tracking-[0.2em] text-[#8f8a82]">Fechamento de pedido</p>
                <h3 className="text-2xl font-semibold text-white">
                  {closeDirectOrder ? `${getDisplayCode(closeDirectOrder)} - ${closeDirectOrder.type}` : "Pedido"}
                </h3>
                <p className="text-sm text-[#bcb5aa]">
                  Use esse fechamento para delivery e retirada depois da entrega, registrando a forma final de pagamento no caixa.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8d877b]">Cliente</p>
                  <p className="mt-2 text-lg font-semibold text-white">{closeDirectOrder?.customer ?? "Cliente"}</p>
                </div>
                <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8d877b]">Total</p>
                  <p className="mt-2 text-2xl font-semibold text-[#f4c35a]">
                    {formatCurrency(closeDirectOrder?.total ?? 0)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-white">Forma de pagamento</p>
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
                      onClick={() => setCloseDirectPaymentMethod(value)}
                      className={cn(
                        "rounded-2xl border px-4 py-2 text-sm font-medium transition-colors",
                        closeDirectPaymentMethod === value
                          ? "border-[#22547b] bg-[#10263c] text-[#8fd0ff]"
                          : "border-[#2f2f2f] bg-[#121212] text-[#d7d0c5] hover:bg-[#1a1a1a]"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#313131] bg-transparent text-[#e5dfd5] hover:bg-[#212121]"
                  onClick={closeCloseDirectModal}
                  disabled={pendingId === closeDirectOrderId}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="admin"
                  disabled={!closeDirectOrderId || pendingId === closeDirectOrderId}
                  onClick={() =>
                    closeDirectOrderId && void handleCloseDirectOrder(closeDirectOrderId, closeDirectPaymentMethod)
                  }
                >
                  {pendingId === closeDirectOrderId ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Confirmar fechamento
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-[#2a2a2a] bg-[#111111] px-4 py-3 text-sm text-[#9f998e]">
        Impressao atual: {printerBridge.provider}. Auto print {settings.autoPrintEnabled ? "ativo" : "desligado"}.
        {" "}
        {settings.autoPrintMode === "single_printer"
          ? `Principal: ${activePrinters.find((printer) => printer.id === settings.defaultAutoPrintPrinterId)?.name ?? "nao definida"}`
          : "Modo por destino operacional"}
      </div>
    </div>
  );
}
