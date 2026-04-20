import type { ReceiptData } from "@/lib/receipt/types";

export function ReceiptHeader({ receipt }: { receipt: ReceiptData }) {
  return (
    <header className="receipt-header">
      <p className="receipt-store-name">{receipt.storeName}</p>
      <h1>{receipt.title}</h1>
      {receipt.subtitle ? <p className="receipt-subtitle">{receipt.subtitle}</p> : null}
    </header>
  );
}
