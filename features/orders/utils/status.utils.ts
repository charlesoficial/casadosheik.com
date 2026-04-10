import type { OrderStatus } from "@/lib/types";

const STATUS_FLOW: OrderStatus[] = ["novo", "aceito", "preparo", "pronto", "concluido", "cancelado"];

const STATUS_LABELS: Record<OrderStatus, string> = {
  novo: "Novo",
  aceito: "Aceito",
  preparo: "Em preparo",
  pronto: "Pronto",
  concluido: "Concluido",
  cancelado: "Cancelado"
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  novo: "amber",
  aceito: "blue",
  preparo: "violet",
  pronto: "green",
  concluido: "zinc",
  cancelado: "red"
};

export function getStatusLabel(status: OrderStatus) {
  return STATUS_LABELS[status];
}

export function getStatusColor(status: OrderStatus) {
  return STATUS_COLORS[status];
}

export function getNextStatus(status: OrderStatus) {
  const index = STATUS_FLOW.indexOf(status);
  return index >= 0 && index < STATUS_FLOW.length - 1 ? STATUS_FLOW[index + 1] : status;
}

export function getPreviousStatus(status: OrderStatus) {
  const index = STATUS_FLOW.indexOf(status);
  return index > 0 ? STATUS_FLOW[index - 1] : status;
}
