const ESC = "\x1b";
const GS = "\x1d";

const INIT = `${ESC}@`;
const ALIGN_LEFT = `${ESC}a\x00`;
const ALIGN_CENTER = `${ESC}a\x01`;
const BOLD_ON = `${ESC}E\x01`;
const BOLD_OFF = `${ESC}E\x00`;
const CUT = `${GS}V\x00`;

export const THERMAL_TEXT_WIDTH = 32;

// Normaliza o texto para algo previsivel em impressoras termicas simples,
// preservando acentos comuns e removendo caracteres que costumam corromper.
export function sanitizeThermalText(value: string) {
  return value
    .normalize("NFC")
    .replace(/[‐‑–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/•/g, "-")
    .replace(/\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function thermalSeparator(char = "-") {
  return char.repeat(THERMAL_TEXT_WIDTH);
}

export function centerText(text: string, width = THERMAL_TEXT_WIDTH) {
  const normalized = sanitizeThermalText(text);
  if (normalized.length >= width) return normalized.slice(0, width);

  const totalPadding = width - normalized.length;
  const leftPadding = Math.floor(totalPadding / 2);
  const rightPadding = totalPadding - leftPadding;
  return `${" ".repeat(leftPadding)}${normalized}${" ".repeat(rightPadding)}`;
}

export function pairLine(left: string, right: string, width = THERMAL_TEXT_WIDTH) {
  const leftText = sanitizeThermalText(left);
  const rightText = sanitizeThermalText(right);
  const maxLeftWidth = Math.max(1, width - rightText.length - 1);
  const leftSafe = leftText.length > maxLeftWidth ? `${leftText.slice(0, maxLeftWidth - 1)}…` : leftText;
  const spaces = Math.max(1, width - leftSafe.length - rightText.length);
  return `${leftSafe}${" ".repeat(spaces)}${rightText}`;
}

export function wrapText(text: string, width = THERMAL_TEXT_WIDTH, indent = "") {
  const normalized = sanitizeThermalText(text);
  if (!normalized) return [];

  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const limit = lines.length > 0 ? width - indent.length : width;

    if (candidate.length <= limit) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(lines.length > 0 ? `${indent}${current}` : current);
      current = word;
      continue;
    }

    lines.push(lines.length > 0 ? `${indent}${word.slice(0, limit)}` : word.slice(0, limit));
    current = word.slice(limit);
  }

  if (current) {
    lines.push(lines.length > 0 ? `${indent}${current}` : current);
  }

  return lines;
}

export function boldLine(text: string) {
  return `${BOLD_ON}${sanitizeThermalText(text)}${BOLD_OFF}`;
}

export function centeredBoldLine(text: string) {
  return `${ALIGN_CENTER}${BOLD_ON}${centerText(text)}${BOLD_OFF}${ALIGN_LEFT}`;
}

export function centeredLine(text: string) {
  return `${ALIGN_CENTER}${centerText(text)}${ALIGN_LEFT}`;
}

export function linesToEscPos(lines: string[]) {
  const content = lines.map((line) => line || "").join("\n");
  return `${INIT}${ALIGN_LEFT}${content}\n\n${CUT}`;
}
