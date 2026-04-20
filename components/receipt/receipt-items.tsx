import { formatReceiptCurrency } from "@/lib/receipt/formatters";
import type { ReceiptData } from "@/lib/receipt/types";

export function ReceiptItems({ receipt }: { receipt: ReceiptData }) {
  if (!receipt.items.length) return null;

  return (
    <section className="receipt-section">
      <p className="receipt-section-title">Itens</p>
      <div className="receipt-items">
        {receipt.items.map((item) => (
          <div key={item.id} className="receipt-item">
            <div className="receipt-item-main">
              <strong>
                {item.quantity ? `${item.quantity}x ` : ""}
                {item.name}
              </strong>
              {typeof item.total === "number" && receipt.showPrices ? (
                <span>{formatReceiptCurrency(item.total)}</span>
              ) : null}
            </div>
            {typeof item.unitPrice === "number" && receipt.showPrices ? (
              <p className="receipt-item-muted">Unitario: {formatReceiptCurrency(item.unitPrice)}</p>
            ) : null}
            {item.note ? <p className="receipt-item-note">Obs: {item.note}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
