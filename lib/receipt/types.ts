import type { PrinterDestination } from "@/lib/types";
import type { ReceiptPaperWidth } from "@/lib/receipt/constants";

export type ReceiptKind = "order" | "kitchen" | "bar" | "cashier" | "payment" | "test";

export type ReceiptMetaRow = {
  label: string;
  value: string;
  strong?: boolean;
};

export type ReceiptItem = {
  id: string;
  quantity?: number | null;
  name: string;
  note?: string | null;
  unitPrice?: number | null;
  total?: number | null;
};

export type ReceiptTotalRow = {
  label: string;
  value: string;
  strong?: boolean;
};

export type ReceiptNote = {
  title: string;
  body: string;
};

export type ReceiptData = {
  kind: ReceiptKind;
  paperWidth?: ReceiptPaperWidth;
  storeName: string;
  title: string;
  subtitle?: string | null;
  destination?: PrinterDestination | "pagamento" | "teste" | "caixa";
  createdAt?: string | null;
  meta: ReceiptMetaRow[];
  items: ReceiptItem[];
  totals: ReceiptTotalRow[];
  payment?: ReceiptMetaRow[];
  notes?: ReceiptNote[];
  footer?: string;
  showPrices?: boolean;
};

export type ReceiptBuildOptions = {
  paperWidth?: ReceiptPaperWidth;
  destination?: PrinterDestination;
};
