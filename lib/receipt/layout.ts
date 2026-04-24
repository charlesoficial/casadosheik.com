import { RECEIPT_FOOTER_TEXT, RECEIPT_PAPER, RECEIPT_STORE_NAME } from "@/lib/receipt/constants";
import {
  formatReceiptCurrency,
  formatReceiptDateTime,
  formatReceiptOrderNumber,
  normalizeReceiptText
} from "@/lib/receipt/formatters";
import type { ReceiptBuildOptions, ReceiptData, ReceiptItem } from "@/lib/receipt/types";
import type { CashClosingSummary, FinancialHistoryDetail, OrderDetail, PrinterDestination, PrinterRecord } from "@/lib/types";

function destinationTitle(destination?: PrinterDestination) {
  if (destination === "cozinha") return "Cozinha";
  if (destination === "bar") return "Bar";
  if (destination === "caixa") return "Caixa";
  if (destination === "delivery") return "Delivery";
  return "Pedido";
}

function shouldShowPrices(destination?: PrinterDestination) {
  return !["cozinha", "bar"].includes(destination ?? "");
}

function orderItemsToReceiptItems(order: OrderDetail, showPrices: boolean): ReceiptItem[] {
  return order.items.map((item) => ({
    id: item.id,
    quantity: item.qty,
    name: item.name,
    note: item.note,
    unitPrice: showPrices ? item.price : null,
    total: showPrices ? item.qty * item.price : null
  }));
}

export function mapOrderToReceipt(order: OrderDetail, options: ReceiptBuildOptions = {}): ReceiptData {
  const destination = options.destination ?? "geral";
  const showPrices = shouldShowPrices(destination);
  const isKitchenLike = !showPrices;
  const meta = [
    { label: "Pedido", value: formatReceiptOrderNumber(order.number), strong: true },
    { label: "Tipo", value: normalizeReceiptText(order.type || destinationTitle(destination)).toUpperCase(), strong: true },
    order.table ? { label: "Mesa", value: normalizeReceiptText(order.table), strong: true } : null,
    { label: "Data", value: formatReceiptDateTime(order.createdAt) }
  ].filter(Boolean) as ReceiptData["meta"];

  const notes = [
    order.notes ? { title: "Observacao geral", body: order.notes } : null,
    order.kind === "delivery" && order.address
      ? {
          title: "Entrega",
          body: [
            order.customer,
            order.phone ? `Tel: ${order.phone}` : null,
            [order.address.rua, order.address.numero].filter(Boolean).join(", "),
            order.address.bairro ? `Bairro: ${order.address.bairro}` : null,
            order.address.referencia ? `Ref: ${order.address.referencia}` : null
          ]
            .filter(Boolean)
            .join(" | ")
        }
      : null
  ].filter(Boolean) as ReceiptData["notes"];

  return {
    kind: isKitchenLike ? destination === "bar" ? "bar" : "kitchen" : "order",
    paperWidth: options.paperWidth,
    storeName: RECEIPT_STORE_NAME,
    title: isKitchenLike ? `Comprovante ${destinationTitle(destination)}` : "Comprovante",
    subtitle: destinationTitle(destination),
    destination,
    createdAt: order.createdAt,
    meta,
    items: orderItemsToReceiptItems(order, showPrices),
    totals: showPrices ? [{ label: "Total", value: formatReceiptCurrency(order.total), strong: true }] : [],
    payment: showPrices
      ? [
          { label: "Pagamento", value: order.payment || "-" },
          ...(order.changeFor ? [{ label: "Troco para", value: formatReceiptCurrency(order.changeFor) }] : [])
        ]
      : [],
    notes,
    footer: RECEIPT_FOOTER_TEXT,
    showPrices
  };
}

export function mapPrinterTestToReceipt(printer?: PrinterRecord, options: ReceiptBuildOptions = {}): ReceiptData {
  return {
    kind: "test",
    paperWidth: options.paperWidth,
    storeName: RECEIPT_STORE_NAME,
    title: "Teste de impressao",
    subtitle: printer?.destination ? destinationTitle(printer.destination) : "Diagnostico",
    destination: printer?.destination ?? "teste",
    createdAt: new Date().toISOString(),
    meta: [
      { label: "Data", value: formatReceiptDateTime() },
      { label: "Status", value: "OK", strong: true },
      ...(printer
        ? [
            { label: "Nome", value: printer.name },
            { label: "Tipo", value: printer.type === "usb" ? "USB / QZ Tray" : "Rede / TCP" },
            printer.type === "usb" && printer.printerName ? { label: "QZ", value: printer.printerName } : null,
            printer.type === "network" ? { label: "IP", value: printer.ipAddress || "-" } : null,
            printer.type === "network" ? { label: "Porta", value: String(printer.port || 9100) } : null
          ].filter(Boolean) as ReceiptData["meta"]
        : [])
    ],
    items: [
      { id: "accent-test", name: "Teste de acentos: cafe, acai, pao de queijo, file" },
      { id: "wrap-test", name: "Observacao longa para validar quebra de linha sem cortar texto na bobina termica" }
    ],
    totals: [],
    footer: "Teste concluido com sucesso",
    showPrices: false
  };
}

export function mapCashClosingToReceipt(summary: CashClosingSummary, options: ReceiptBuildOptions = {}): ReceiptData {
  return {
    kind: "cashier",
    paperWidth: options.paperWidth,
    storeName: RECEIPT_STORE_NAME,
    title: `Caixa ${summary.referenceDate}`,
    subtitle: summary.alreadyClosed ? "Fechamento consolidado" : "Resumo parcial",
    destination: "caixa",
    createdAt: summary.lastUpdatedAt ?? new Date().toISOString(),
    meta: [
      { label: "Lancamentos", value: String(summary.ordersCount), strong: true },
      { label: "Mesas", value: String(summary.tablesCount), strong: true },
      { label: "Horario", value: formatReceiptDateTime(summary.lastUpdatedAt) }
    ],
    items: [
      ...summary.payments.map((payment) => ({
        id: `payment-${payment.method}`,
        quantity: payment.count,
        name: payment.method.replaceAll("_", " "),
        total: payment.total
      })),
      ...summary.movements.map((movement) => ({
        id: `movement-${movement.id}`,
        name: movement.type === "sangria" ? "Sangria" : "Suprimento",
        note: movement.note,
        total: movement.type === "sangria" ? -movement.amount : movement.amount
      }))
    ],
    totals: [
      { label: "Total", value: formatReceiptCurrency(summary.total), strong: true },
      { label: "Dinheiro esperado", value: formatReceiptCurrency(summary.expectedCashBalance), strong: true }
    ],
    notes: summary.origins.map((origin) => ({
      title: origin.label,
      body: `${origin.count} fechamentos - ${formatReceiptCurrency(origin.total)}`
    })),
    footer: RECEIPT_FOOTER_TEXT,
    showPrices: true
  };
}

export function mapFinancialHistoryToReceipt(detail: FinancialHistoryDetail, options: ReceiptBuildOptions = {}): ReceiptData {
  return {
    kind: detail.kind === "caixa" ? "cashier" : "payment",
    paperWidth: options.paperWidth,
    storeName: RECEIPT_STORE_NAME,
    title: detail.label,
    subtitle: detail.details,
    destination: detail.kind === "caixa" ? "caixa" : "pagamento",
    createdAt: detail.occurredAt,
    meta: [
      { label: "Tipo", value: detail.kind.toUpperCase(), strong: true },
      { label: "Status", value: detail.status, strong: true },
      { label: "Horario", value: formatReceiptDateTime(detail.occurredAt) },
      ...(detail.closedBy ? [{ label: "Resp.", value: detail.closedBy }] : [])
    ],
    items: detail.items.map((item, index) => ({
      id: `${item.label}-${index}`,
      quantity: item.quantity,
      name: item.label,
      note: item.note,
      total: item.total
    })),
    totals: [{ label: "Total", value: formatReceiptCurrency(detail.total), strong: true }],
    payment: [{ label: "Pagamento", value: detail.paymentMethod.replaceAll("_", " ") }],
    notes: detail.note ? [{ title: "Observacao", body: detail.note }] : [],
    footer: RECEIPT_FOOTER_TEXT,
    showPrices: true
  };
}

function centerText(text: string, width: number) {
  const value = normalizeReceiptText(text);
  if (value.length >= width) return value.slice(0, width);
  const left = Math.floor((width - value.length) / 2);
  return `${" ".repeat(left)}${value}`;
}

function separator(width: number, char = "-") {
  return char.repeat(width);
}

function pairLine(left: string, right: string, width: number) {
  const leftText = normalizeReceiptText(left);
  const rightText = normalizeReceiptText(right);
  const maxLeft = Math.max(1, width - rightText.length - 1);
  const clippedLeft = leftText.length > maxLeft ? `${leftText.slice(0, Math.max(1, maxLeft - 1))}.` : leftText;
  return `${clippedLeft}${" ".repeat(Math.max(1, width - clippedLeft.length - rightText.length))}${rightText}`;
}

function wrapText(text: string, width: number, indent = "") {
  const normalized = normalizeReceiptText(text);
  if (!normalized) return [];
  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const limit = lines.length ? width - indent.length : width;
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= limit) {
      current = candidate;
      continue;
    }
    if (current) {
      lines.push(lines.length ? `${indent}${current}` : current);
      current = word;
      continue;
    }
    lines.push(lines.length ? `${indent}${word.slice(0, limit)}` : word.slice(0, limit));
    current = word.slice(limit);
  }

  if (current) lines.push(lines.length ? `${indent}${current}` : current);
  return lines;
}

export function buildReceiptTextLines(receipt: ReceiptData) {
  const paper = RECEIPT_PAPER[receipt.paperWidth ?? "80mm"];
  const width = paper.escPosColumns;
  const lines: string[] = [];

  lines.push(centerText(receipt.storeName, width));
  lines.push(centerText(receipt.title, width));
  if (receipt.subtitle) lines.push(centerText(receipt.subtitle, width));
  lines.push(separator(width, "="));

  for (const row of receipt.meta) {
    lines.push(pairLine(row.label, row.value, width));
  }

  if (receipt.items.length) {
    lines.push(separator(width));
    lines.push("ITENS");
    for (const item of receipt.items) {
      const prefix = item.quantity ? `${item.quantity}x ` : "";
      const price = typeof item.total === "number" && receipt.showPrices ? formatReceiptCurrency(item.total) : "";
      const itemText = `${prefix}${item.name}`;
      if (price) {
        lines.push(pairLine(itemText, price, width));
      } else {
        lines.push(...wrapText(itemText, width));
      }
      if (item.note) {
        lines.push(...wrapText(`obs: ${item.note}`, width, "  "));
      }
    }
  }

  if (receipt.totals.length || receipt.payment?.length) {
    lines.push(separator(width));
    for (const total of receipt.totals) {
      lines.push(pairLine(total.label.toUpperCase(), total.value, width));
    }
    for (const payment of receipt.payment ?? []) {
      lines.push(pairLine(payment.label, payment.value, width));
    }
  }

  for (const note of receipt.notes ?? []) {
    lines.push(separator(width));
    lines.push(...wrapText(note.title.toUpperCase(), width));
    lines.push(...wrapText(note.body, width));
  }

  lines.push(separator(width));
  lines.push(centerText(receipt.footer ?? RECEIPT_FOOTER_TEXT, width));
  lines.push(centerText(formatReceiptDateTime(receipt.createdAt), width));

  return lines;
}
