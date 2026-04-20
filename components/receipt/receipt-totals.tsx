import type { ReceiptData } from "@/lib/receipt/types";

export function ReceiptTotals({ receipt }: { receipt: ReceiptData }) {
  if (!receipt.totals.length && !receipt.payment?.length) return null;

  return (
    <section className="receipt-section">
      {receipt.totals.map((row) => (
        <div key={`${row.label}-${row.value}`} className={row.strong ? "receipt-total receipt-total-strong" : "receipt-row"}>
          <span>{row.label}</span>
          <strong>{row.value}</strong>
        </div>
      ))}
      {receipt.payment?.map((row) => (
        <div key={`${row.label}-${row.value}`} className="receipt-row">
          <span>{row.label}</span>
          <strong>{row.value}</strong>
        </div>
      ))}
    </section>
  );
}
