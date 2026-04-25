import {
  DEFAULT_BROWSER_RECEIPT_PAPER_WIDTH,
  RECEIPT_PAPER,
  type ReceiptPaperWidth
} from "@/lib/receipt/constants";

const PAPER_WIDTH_STORAGE_KEY = "receipt_paper_width";
const DYNAMIC_PAGE_STYLE_ID = "receipt-dynamic-page-size";

function pixelsToMm(pixels: number) {
  return (pixels * 25.4) / 96;
}

function readPaperWidth(root: Element | null): ReceiptPaperWidth {
  const value = root?.getAttribute("data-receipt-width");
  return value === "58mm" || value === "80mm" || value === "a4" ? value : DEFAULT_BROWSER_RECEIPT_PAPER_WIDTH;
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
  const paper = RECEIPT_PAPER[paperWidth];
  const isFullPage = paperWidth === "a4";
  const pageSize = isFullPage ? "A4 portrait" : `${paper.paperWidthMm}mm ${pageHeightMm}mm`;
  const rootWidth = isFullPage ? "210mm" : `${paper.paperWidthMm}mm`;

  return `
@media print {
  @page {
    size: ${pageSize};
    margin: 0;
  }

  html,
  body {
    position: relative !important;
    display: block !important;
    width: auto !important;
    min-width: 0 !important;
    max-width: none !important;
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
    top: 0 !important;
    left: 0 !important;
    width: ${rootWidth} !important;
    min-width: ${rootWidth} !important;
    max-width: ${rootWidth} !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
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
  return value === "58mm" || value === "80mm" || value === "a4" ? value : DEFAULT_BROWSER_RECEIPT_PAPER_WIDTH;
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

function getReceiptDocumentCss(paperWidth: ReceiptPaperWidth, contentHeightMm?: number) {
  const paper = RECEIPT_PAPER[paperWidth];
  const isFullPage = paperWidth === "a4";
  const pageHeightMm = contentHeightMm ? Math.max(35, Math.ceil(contentHeightMm)) : undefined;
  const pageSize = isFullPage ? "A4 portrait" : pageHeightMm ? `${paper.paperWidthMm}mm ${pageHeightMm}mm` : `${paper.paperWidthMm}mm auto`;
  const rootWidth = isFullPage ? "210mm" : `${paper.paperWidthMm}mm`;
  const baseFontSize = paperWidth === "58mm" ? 10.5 : paperWidth === "80mm" ? 11 : 16;
  const mutedFontSize = paperWidth === "58mm" ? 9.5 : paperWidth === "80mm" ? 10 : 14;

  return `
@page {
  size: ${pageSize};
  margin: 0;
}

html,
body {
  position: relative !important;
  display: block !important;
  width: auto !important;
  min-width: 0 !important;
  max-width: none !important;
  height: auto !important;
  min-height: 0 !important;
  max-height: none !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: visible !important;
  background: #fff !important;
}

body {
  font-family: "Courier New", Consolas, monospace;
  font-size: ${baseFontSize}px;
  line-height: 1.25;
}

.receipt-print-root {
  display: block !important;
  position: static !important;
  left: 0 !important;
  top: 0 !important;
  z-index: auto !important;
  width: ${rootWidth} !important;
  min-width: ${rootWidth} !important;
  max-width: ${rootWidth} !important;
  height: auto !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  color: #000 !important;
  background: #fff !important;
  visibility: visible !important;
  pointer-events: auto !important;
  overflow: hidden !important;
  page-break-before: avoid !important;
  page-break-after: avoid !important;
  break-before: avoid !important;
  break-after: avoid !important;
}

.receipt-print-root * {
  visibility: visible !important;
}

.receipt-paper {
  box-sizing: border-box !important;
  display: block !important;
  width: ${rootWidth} !important;
  min-width: ${rootWidth} !important;
  max-width: ${rootWidth} !important;
  height: auto !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: ${paper.paddingTopMm}mm ${paper.paddingXmm}mm ${paper.paddingBottomMm}mm !important;
  border: 0 !important;
  box-shadow: none !important;
  color: #000 !important;
  background: #fff !important;
  overflow: hidden !important;
  page-break-before: avoid !important;
  page-break-after: avoid !important;
  break-before: avoid !important;
  break-after: avoid !important;
}

.receipt-paper,
.receipt-paper * {
  box-sizing: border-box !important;
  color: #000 !important;
  background: transparent !important;
  page-break-inside: avoid !important;
  break-inside: avoid !important;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

.receipt-header { text-align: center; }
.receipt-store-name { margin: 0; font-size: ${isFullPage ? 20 : 14}px; font-weight: 800; line-height: 1.1; }
.receipt-header h1 { margin: 0.5mm 0 0; font-size: ${paperWidth === "58mm" ? 13 : paperWidth === "80mm" ? 15 : 26}px; font-weight: 700; line-height: 1.15; }
.receipt-subtitle, .receipt-date, .receipt-section-title, .receipt-item-muted, .receipt-item-note, .receipt-note p, .receipt-footer { margin: 0; }
.receipt-subtitle, .receipt-date { font-size: ${isFullPage ? 14 : paperWidth === "58mm" ? 10 : 11}px; font-weight: 400; }
.receipt-separator { height: 0; margin: ${isFullPage ? 4 : 1.5}mm 0; border-top: 1px dashed #000; }
.receipt-section { display: grid; gap: ${isFullPage ? 2.5 : 1}mm; }
.receipt-row, .receipt-total, .receipt-item-main { display: flex; align-items: baseline; justify-content: space-between; gap: 2mm; width: 100%; }
.receipt-row span, .receipt-row strong, .receipt-total span, .receipt-total strong { font-size: ${baseFontSize}px; line-height: 1.25; }
.receipt-row strong, .receipt-total strong { text-align: right; font-weight: 700; overflow-wrap: anywhere; }
.receipt-date { padding-top: 0.5mm; text-align: center; }
.receipt-section-title { font-size: ${baseFontSize}px; font-weight: 700; text-transform: uppercase; }
.receipt-items { display: grid; gap: ${isFullPage ? 3 : 1.2}mm; }
.receipt-item { display: grid; gap: 0.5mm; }
.receipt-item-main strong { min-width: 0; font-size: ${paperWidth === "58mm" ? 11 : paperWidth === "80mm" ? 12 : 18}px; font-weight: 700; line-height: 1.2; overflow-wrap: anywhere; }
.receipt-item-main span { flex: 0 0 auto; font-size: ${baseFontSize}px; font-weight: 700; }
.receipt-item-muted, .receipt-item-note, .receipt-note p { font-size: ${mutedFontSize}px; font-weight: 400; line-height: 1.25; overflow-wrap: anywhere; }
.receipt-total-strong span, .receipt-total-strong strong { font-size: ${paperWidth === "58mm" ? 12 : paperWidth === "80mm" ? 13 : 22}px; font-weight: 700; text-transform: uppercase; }
.receipt-notes { gap: ${isFullPage ? 3 : 1.2}mm; }
.receipt-note { display: grid; gap: 0.5mm; }
.receipt-note strong { font-size: ${baseFontSize}px; font-weight: 700; text-transform: uppercase; }
.receipt-footer { text-align: center; font-size: ${baseFontSize}px; font-weight: 700; }

@media print {
  body > *:not(.receipt-print-root), .no-print {
    display: none !important;
    visibility: hidden !important;
  }
}`;
}

// Imprime o cupom via iframe oculto — sem abrir popup ou janela extra.
// O diálogo de impressão nativo do navegador abre normalmente sobre a página atual.
export async function printReceiptFromDom() {
  const readyReceipt = prepareReceiptPrintPage();
  const { root, paper } = readyReceipt ?? (await waitForReceiptRoot());

  if (!root || !paper) {
    console.error("[print] Cupom nao ficou pronto para impressao.");
    throw new Error("Cupom ainda nao ficou pronto para impressao. Tente imprimir novamente.");
  }

  const paperWidth = readPaperWidth(root);
  const paperConfig = RECEIPT_PAPER[paperWidth];
  const firstMeasuredHeightMm = readyReceipt?.pageHeightMm ?? measureReceiptHeightMm(paper);

  // Cria iframe fora da tela para isolar o documento de impressão
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;left:-10000px;top:0;border:0;opacity:0;pointer-events:none;" +
    `width:${paperConfig.paperWidthMm}mm;height:${firstMeasuredHeightMm}mm;`;
  document.body.appendChild(iframe);

  const frameDocument = iframe.contentDocument;
  const frameWindow = iframe.contentWindow;

  if (!frameDocument || !frameWindow) {
    iframe.remove();
    console.error("[print] Nao foi possivel preparar iframe para impressao.");
    throw new Error("Nao foi possivel preparar o cupom para impressao. Tente novamente.");
  }

  // Escreve documento térmico isolado no iframe
  frameDocument.open();
  frameDocument.write(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><title></title>` +
    `<style id="receipt-page-style">${getReceiptDocumentCss(paperWidth, firstMeasuredHeightMm)}</style>` +
    `</head><body>${root.outerHTML}</body></html>`
  );
  frameDocument.close();

  // Aguarda render para medir altura real do conteúdo
  await new Promise((resolve) => frameWindow.requestAnimationFrame(() => resolve(null)));
  const framePaper = frameDocument.querySelector(".receipt-paper") as HTMLElement | null;
  const measuredHeightMm = framePaper ? measureReceiptHeightMm(framePaper) : firstMeasuredHeightMm;

  const style = frameDocument.getElementById("receipt-page-style");
  if (style) {
    style.textContent = getReceiptDocumentCss(paperWidth, measuredHeightMm);
  }
  iframe.style.height = paperWidth === "a4" ? "297mm" : `${measuredHeightMm}mm`;

  await new Promise((resolve) => frameWindow.requestAnimationFrame(() => resolve(null)));
  const previousTitle = document.title;
  document.title = "";
  frameWindow.print();
  window.setTimeout(() => {
    document.title = previousTitle;
  }, 1000);

  // Remove iframe após a impressão ser despachada
  window.setTimeout(() => iframe.remove(), 2000);
}
