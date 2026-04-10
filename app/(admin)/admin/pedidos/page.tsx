import { getAdminOrders } from "@/lib/data";
import { getOrderSettings } from "@/lib/order-settings";
import { listPrinters } from "@/lib/printers";
import { OrderBoard } from "@/features/orders/components/order-board";

export default async function AdminOrdersPage() {
  const orders = await getAdminOrders();
  const printers = await listPrinters();
  const activePrinters = printers.filter((printer) => printer.isActive);
  const orderSettings = await getOrderSettings(activePrinters);

  return (
    <div className="space-y-5">
      <OrderBoard initialOrders={orders} initialSettings={orderSettings} activePrinters={activePrinters} />
    </div>
  );
}
