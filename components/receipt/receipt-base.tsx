import { DEFAULT_RECEIPT_PAPER_WIDTH } from "@/lib/receipt/constants";
import type { ReceiptData } from "@/lib/receipt/types";
import { ReceiptFooter } from "@/components/receipt/receipt-footer";
import { ReceiptHeader } from "@/components/receipt/receipt-header";
import { ReceiptItems } from "@/components/receipt/receipt-items";
import { ReceiptTotals } from "@/components/receipt/receipt-totals";

function ReceiptSeparator() {
  return <div className="receipt-separator" />;
}

export function ReceiptTemplateBase({ receipt }: { receipt: ReceiptData }) {
  const paperWidth = receipt.paperWidth ?? DEFAULT_RECEIPT_PAPER_WIDTH;

  return (
    <section
      className={`receipt-print-root receipt--${paperWidth.replace("mm", "mm")}`}
      data-receipt-width={paperWidth}
      aria-label="Cupom termico"
    >
      <article className="receipt-paper">
        <ReceiptHeader receipt={receipt} />
        <ReceiptSeparator />
        <section className="receipt-section">
          {receipt.meta.map((row) => (
            <div key={`${row.label}-${row.value}`} className="receipt-row">
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
          ))}
        </section>
        <ReceiptSeparator />
        <ReceiptItems receipt={receipt} />
        <ReceiptTotals receipt={receipt} />
        {receipt.notes?.length ? (
          <>
            <ReceiptSeparator />
            <section className="receipt-section receipt-notes">
              {receipt.notes.map((note) => (
                <div key={`${note.title}-${note.body}`} className="receipt-note">
                  <strong>{note.title}</strong>
                  <p>{note.body}</p>
                </div>
              ))}
            </section>
          </>
        ) : null}
        <ReceiptSeparator />
        <ReceiptFooter receipt={receipt} />
      </article>
    </section>
  );
}

export function ReceiptOrder({ receipt }: { receipt: ReceiptData }) {
  return <ReceiptTemplateBase receipt={{ ...receipt, kind: "order" }} />;
}

export function ReceiptKitchen({ receipt }: { receipt: ReceiptData }) {
  return <ReceiptTemplateBase receipt={{ ...receipt, kind: "kitchen", showPrices: false }} />;
}

export function ReceiptBar({ receipt }: { receipt: ReceiptData }) {
  return <ReceiptTemplateBase receipt={{ ...receipt, kind: "bar", showPrices: false }} />;
}

export function ReceiptCashier({ receipt }: { receipt: ReceiptData }) {
  return <ReceiptTemplateBase receipt={{ ...receipt, kind: "cashier" }} />;
}

export function ReceiptPayment({ receipt }: { receipt: ReceiptData }) {
  return <ReceiptTemplateBase receipt={{ ...receipt, kind: "payment" }} />;
}

export function ReceiptTest({ receipt }: { receipt: ReceiptData }) {
  return <ReceiptTemplateBase receipt={{ ...receipt, kind: "test" }} />;
}
