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
            </div>
            {typeof item.unitPrice === "number" && typeof item.total === "number" && receipt.showPrices ? (
              <div className="receipt-item-price-row">
                <span>Unit. {formatReceiptCurrency(item.unitPrice)}</span>
                <span>Subt. {formatReceiptCurrency(item.total)}</span>
              </div>
            ) : null}
            {item.note ? <p className="receipt-item-note">Obs: {item.note}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
