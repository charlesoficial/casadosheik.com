export function formatReceiptCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

export function formatReceiptDateTime(value?: string | null) {
  return new Date(value ?? new Date().toISOString()).toLocaleString("pt-BR");
}

export function formatReceiptOrderNumber(value: number, width = 4) {
  return `#${String(value).padStart(width, "0")}`;
}

export function normalizeReceiptText(value?: string | null) {
  return (value ?? "")
    .normalize("NFC")
    .replace(/[‐‑–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/•/g, "-")
    .replace(/\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
