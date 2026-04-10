import {
  createPrinter,
  deletePrinter,
  getPrintersForDispatch,
  listPrinters,
  resolveDestinationsForOrder,
  updatePrinter
} from "@/features/printers/repositories/printer.repository";

export const printerService = {
  createPrinter,
  deletePrinter,
  getPrintersForDispatch,
  listPrinters,
  resolveDestinationsForOrder,
  updatePrinter
};
