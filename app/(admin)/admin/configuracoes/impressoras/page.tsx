import { PrinterManager } from "@/features/printers/components/printer-manager";
import { getOrderSettings } from "@/lib/order-settings";
import { listPrinters } from "@/lib/printers";

export default async function AdminPrintersPage() {
  const printers = await listPrinters();
  const activePrinters = printers.filter((printer) => printer.isActive);
  const settings = await getOrderSettings(activePrinters);

  return <PrinterManager initialPrinters={printers} initialSettings={settings} />;
}
