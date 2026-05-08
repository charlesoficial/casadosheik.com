import {
  DEFAULT_BROWSER_RECEIPT_PAPER_WIDTH,
  RECEIPT_PAPER,
  type ReceiptPaperWidth
} from "@/lib/receipt/constants";

const PAPER_WIDTH_STORAGE_KEY = "receipt_paper_width";
const DYNAMIC_PAGE_STYLE_ID = "receipt-dynamic-page-size";
const PRINT_PREVIEW_SCALE = 1.58;
const PRINT_PREVIEW_TOP_MM = 76;

function pixelsToMm(pixels: number) {
  return (pixels * 25.4) / 96;
}

function readPaperWidth(root: Element | null): ReceiptPaperWidth {
  const value = root?.getAttribute("data-receipt-width");
  return value === "58mm" ? "58mm" : DEFAULT_BROWSER_RECEIPT_PAPER_WIDTH;
}

function findReceiptRoot() {
  if (typeof document === "undefined") return { root: null, paper: null };
  const roots = Array.from(document.querySelectorAll(".receipt-print-root"));

  for (let index = roots.length - 1; index >= 0; index -= 1) {
    const root = roots[index];
    const paper = root.querySelector(".receipt-paper") as HTMLElement | null;
    if (paper) return { root, paper };
  }

  return { root: null, paper: null };
}

function measureReceiptHeightMm(paper: HTMLElement) {
  const rectHeight = paper.getBoundingClientRect().height;
  const pixelHeight = Math.max(paper.scrollHeight, paper.offsetHeight, rectHeight);
  return Math.max(35, Math.ceil(pixelsToMm(pixelHeight) + 1));
}

function buildDynamicPageCss(paperWidth: ReceiptPaperWidth, pageHeightMm: number) {
  const effectivePaperWidth: ReceiptPaperWidth = paperWidth === "58mm" ? "58mm" : "80mm";
  const paper = RECEIPT_PAPER[effectivePaperWidth];
  const rootWidth = `${paper.paperWidthMm}mm`;
  const scaledHeightMm = Math.ceil(pageHeightMm * PRINT_PREVIEW_SCALE);
  const pageHeight = Math.max(297, scaledHeightMm + PRINT_PREVIEW_TOP_MM + 18);

  return `
@media print {
  @page {
    size: 210mm ${pageHeight}mm;
    margin: 0;
  }

  html,
  body {
    position: relative !important;
    display: block !important;
    width: 210mm !important;
    min-width: 210mm !important;
    max-width: 210mm !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
    background: #fff !important;
  }

  .receipt-print-root {
    position: absolute !important;
    top: ${PRINT_PREVIEW_TOP_MM}mm !important;
    left: 50% !important;
    width: ${rootWidth} !important;
    min-width: ${rootWidth} !important;
    max-width: ${rootWidth} !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    margin: 0 !important;
    padding: 0 !important;
    transform: translateX(-50%) scale(${PRINT_PREVIEW_SCALE}) !important;
    transform-origin: top center !important;
  }

  .receipt-paper {
    width: ${rootWidth} !important;
    min-width: ${rootWidth} !important;
    max-width: ${rootWidth} !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    overflow: hidden !important;
  }
}`;
}

export function prepareReceiptPrintPage() {
  if (typeof document === "undefined") return null;

  const { root, paper } = findReceiptRoot();
  if (!root || !paper) return null;

  const paperWidth = readPaperWidth(root);
  const pageHeightMm = measureReceiptHeightMm(paper);
  let style = document.getElementById(DYNAMIC_PAGE_STYLE_ID) as HTMLStyleElement | null;

  if (!style) {
    style = document.createElement("style");
    style.id = DYNAMIC_PAGE_STYLE_ID;
    document.head.appendChild(style);
  }

  style.textContent = buildDynamicPageCss(paperWidth, pageHeightMm);
  return { root, paper, paperWidth, pageHeightMm };
}

export function installReceiptPrintPageSizing() {
  if (typeof window === "undefined") return () => {};

  const handleBeforePrint = () => {
    prepareReceiptPrintPage();
  };

  window.addEventListener("beforeprint", handleBeforePrint);

  return () => {
    window.removeEventListener("beforeprint", handleBeforePrint);
  };
}

export function getSavedReceiptPaperWidth(): ReceiptPaperWidth {
  if (typeof window === "undefined") return DEFAULT_BROWSER_RECEIPT_PAPER_WIDTH;
  const value = window.localStorage.getItem(PAPER_WIDTH_STORAGE_KEY);
  return value === "58mm" ? "58mm" : DEFAULT_BROWSER_RECEIPT_PAPER_WIDTH;
}

export function saveReceiptPaperWidth(value: ReceiptPaperWidth) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PAPER_WIDTH_STORAGE_KEY, value);
}

async function waitForReceiptRoot(timeoutMs = 700) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const { root, paper } = findReceiptRoot();
    if (root && paper && paper.scrollHeight > 0) {
      return { root, paper };
    }
    await new Promise((resolve) => window.setTimeout(resolve, 25));
  }

  return { root: null, paper: null };
}

export function printReceiptFromDomNow() {
  const { root, paper } = prepareReceiptPrintPage() ?? { root: null, paper: null };

  if (!root || !paper) {
    console.error("[print] Cupom nao ficou pronto para impressao.");
    throw new Error("Cupom ainda nao ficou pronto para impressao. Tente imprimir novamente.");
  }

  prepareReceiptPrintPage();

  const previousTitle = document.title;
  document.title = "";
  window.focus();
  window.print();

  window.setTimeout(() => {
    document.title = previousTitle;
  }, 1000);
}

// Uses the current browser window so Chrome/Windows opens the normal print dialog.
export async function printReceiptFromDom() {
  const { root, paper } = prepareReceiptPrintPage() ?? (await waitForReceiptRoot());

  if (!root || !paper) {
    console.error("[print] Cupom nao ficou pronto para impressao.");
    throw new Error("Cupom ainda nao ficou pronto para impressao. Tente imprimir novamente.");
  }

  await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));
  printReceiptFromDomNow();
}
