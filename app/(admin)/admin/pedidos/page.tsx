import { getAdminOrders } from "@/lib/data";
import { getOrderSettings } from "@/lib/order-settings";
import { listPrinters } from "@/lib/printers";
import { OrderBoard } from "@/features/orders/components/order-board";
import { AdminPage } from "@/components/layout";

export default async function AdminOrdersPage() {
  const [orders, printers] = await Promise.all([getAdminOrders(), listPrinters()]);
  const activePrinters = printers.filter((printer) => printer.isActive);
  const orderSettings = await getOrderSettings(activePrinters);

  return (
    <AdminPage>
      <OrderBoard initialOrders={orders} initialSettings={orderSettings} activePrinters={activePrinters} />
    </AdminPage>
  );
}
