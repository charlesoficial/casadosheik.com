import { PrintSettings } from "@/features/orders/components/print-settings";
import { getOrderSettings } from "@/lib/order-settings";
import { listPrinters } from "@/lib/printers";

export default async function AdminPrintSettingsPage() {
  const printers = await listPrinters();
  const activePrinters = printers.filter((printer) => printer.isActive);
  const settings = await getOrderSettings(activePrinters);

  return (
    <div className="space-y-5">
      <PrintSettings initialSettings={settings} activePrinters={activePrinters} />
    </div>
  );
}
