import type { ReceiptData } from "@/lib/receipt/types";

export function ReceiptFooter({ receipt }: { receipt: ReceiptData }) {
  return <footer className="receipt-footer">{receipt.footer}</footer>;
}
