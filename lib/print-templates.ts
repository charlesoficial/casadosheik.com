import {
  boldLine,
  centeredBoldLine,
  centeredLine,
  pairLine,
  sanitizeThermalText,
  thermalSeparator,
  wrapText
} from "@/lib/escpos";
import type { OrderDetail, PrinterDestination, PrinterRecord } from "@/lib/types";

function formatOrderNumber(number: number) {
  return String(number).padStart(4, "0");
}

function formatDateTime(value?: string | null) {
  return new Date(value ?? new Date().toISOString()).toLocaleString("pt-BR");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

function ticketTitle(destination: PrinterDestination) {
  if (destination === "cozinha") return "TICKET COZINHA";
  if (destination === "bar") return "TICKET BAR";
  if (destination === "caixa") return "TICKET CAIXA";
  if (destination === "delivery") return "TICKET DELIVERY";
  return "TICKET PEDIDO";
}

function pushWrapped(lines: string[], text: string, indent = "") {
  for (const line of wrapText(text, 32, indent)) {
    lines.push(line);
  }
}

function pushItemLines(lines: string[], item: OrderDetail["items"][number], showPrices: boolean) {
  const prefix = `${item.qty}x `;
  const nameLines = wrapText(item.name, 32 - prefix.length, "   ");
  const [firstNameLine = "", ...restNameLines] = nameLines;

  lines.push(`${prefix}${firstNameLine}`);
  for (const line of restNameLines) {
    lines.push(`   ${line.trimStart()}`);
  }

  if (showPrices) {
    lines.push(pairLine("   subtotal", formatCurrency(item.qty * item.price)));
  }

  if (item.note) {
    pushWrapped(lines, `obs: ${sanitizeThermalText(item.note)}`, "   ");
  }
}

function pushHeader(lines: string[], order: OrderDetail, destination: PrinterDestination) {
  lines.push(centeredBoldLine("CASA DO SHEIK"));
  lines.push(centeredLine(ticketTitle(destination)));
  lines.push(thermalSeparator("="));
  lines.push(pairLine("PEDIDO", `#${formatOrderNumber(order.number)}`));
  lines.push(pairLine("DATA", formatDateTime(order.createdAt)));
  lines.push(pairLine("CANAL", sanitizeThermalText(order.type)));

  if (order.table) {
    lines.push(pairLine("MESA", sanitizeThermalText(order.table)));
  } else {
    pushWrapped(lines, `CLIENTE: ${order.customer}`);
  }

  lines.push(thermalSeparator());
}

function pushCustomerBlock(lines: string[], order: OrderDetail) {
  if (order.phone) lines.push(pairLine("TEL", sanitizeThermalText(order.phone)));

  if (order.address) {
    const street = [order.address.rua, order.address.numero].filter(Boolean).join(", ");
    if (street) pushWrapped(lines, `END: ${street}`);
    if (order.address.bairro) pushWrapped(lines, `BAIRRO: ${order.address.bairro}`);
    if (order.address.referencia) pushWrapped(lines, `REF: ${order.address.referencia}`);
  }
}

export function buildTestPrintLines(printer?: PrinterRecord) {
  const lines: string[] = [];

  lines.push(centeredBoldLine("CASA DO SHEIK"));
  lines.push(centeredLine("TESTE DE IMPRESSAO"));
  lines.push(thermalSeparator("="));
  lines.push(pairLine("DATA", formatDateTime()));
  lines.push(pairLine("STATUS", "OK"));

  if (printer) {
    lines.push(pairLine("NOME", sanitizeThermalText(printer.name)));
    lines.push(pairLine("TIPO", printer.type === "usb" ? "USB / QZ TRAY" : "REDE / TCP"));

    if (printer.type === "usb" && printer.printerName) {
      pushWrapped(lines, `QZ: ${printer.printerName}`);
    }

    if (printer.type === "network") {
      lines.push(pairLine("IP", sanitizeThermalText(printer.ipAddress || "-")));
      lines.push(pairLine("PORTA", String(printer.port || 9100)));
    }
  }

  lines.push(thermalSeparator());
  lines.push(boldLine("AMOSTRA DE ACENTOS"));
  pushWrapped(lines, "cafe • café • açaí • pão de queijo • filé");
  pushWrapped(lines, "obs: sem cebola • tirar ketchup • adicionar gelo");
  lines.push(thermalSeparator());
  lines.push(centeredLine("Teste concluido com sucesso"));

  return lines;
}

export function buildOrderPrintLines(order: OrderDetail, destination: PrinterDestination) {
  const lines: string[] = [];
  const showPrices = !["cozinha", "bar"].includes(destination);

  pushHeader(lines, order, destination);
  lines.push(boldLine("ITENS"));
  lines.push(thermalSeparator());

  for (const item of order.items) {
    pushItemLines(lines, item, showPrices);
    lines.push(thermalSeparator());
  }

  if (order.notes) {
    lines.push(boldLine("OBSERVACAO GERAL"));
    pushWrapped(lines, order.notes, "  ");
    lines.push(thermalSeparator());
  }

  if (showPrices) {
    lines.push(boldLine("RESUMO"));
    lines.push(pairLine("TOTAL", formatCurrency(order.total)));
    if (order.payment) lines.push(pairLine("PAGTO", sanitizeThermalText(order.payment)));
    if (order.changeFor) lines.push(pairLine("TROCO P/", formatCurrency(order.changeFor)));
    lines.push(thermalSeparator());
  }

  if (["delivery", "geral", "caixa"].includes(destination)) {
    pushCustomerBlock(lines, order);
    if (order.phone || order.address) {
      lines.push(thermalSeparator());
    }
  }

  lines.push(centeredLine("Boa operacao"));
  lines.push(centeredLine(formatDateTime(order.createdAt)));

  return lines;
}
