export type ReceiptPaperWidth = "58mm" | "80mm";

export const DEFAULT_RECEIPT_PAPER_WIDTH: ReceiptPaperWidth = "80mm";

export const RECEIPT_PAPER = {
  "58mm": {
    paperWidthMm: 58,
    contentWidthMm: 50,
    escPosColumns: 32,
    paddingXmm: 3,
    paddingTopMm: 3,
    paddingBottomMm: 2
  },
  "80mm": {
    paperWidthMm: 80,
    contentWidthMm: 72,
    escPosColumns: 42,
    paddingXmm: 4,
    paddingTopMm: 3,
    paddingBottomMm: 2
  }
} as const;

export const RECEIPT_STORE_NAME = "Casa do Sheik";
export const RECEIPT_FOOTER_TEXT = "Obrigado pela preferencia!";
