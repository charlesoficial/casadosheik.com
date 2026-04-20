import { ReceiptPrintHost } from "@/components/receipt/receipt-print-host";
import { mapOrderToReceipt } from "@/lib/receipt/layout";
import type { OrderDetail } from "@/lib/types";

export function OrderPrintSheet({ order }: { order: OrderDetail | null }) {
  return <ReceiptPrintHost receipt={order ? mapOrderToReceipt(order) : null} />;
}
