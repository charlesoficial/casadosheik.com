import {
  buildReceiptTextLines,
  mapOrderToReceipt,
  mapPrinterTestToReceipt
} from "@/lib/receipt/layout";
import type { OrderDetail, PrinterDestination, PrinterRecord } from "@/lib/types";

export function buildTestPrintLines(printer?: PrinterRecord) {
  return buildReceiptTextLines(mapPrinterTestToReceipt(printer));
}

export function buildOrderPrintLines(order: OrderDetail, destination: PrinterDestination) {
  return buildReceiptTextLines(mapOrderToReceipt(order, { destination }));
}
