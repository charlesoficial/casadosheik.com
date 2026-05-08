const ESC = "\x1b";
const GS = "\x1d";

const INIT = `${ESC}@`;
const ALIGN_LEFT = `${ESC}a\x00`;
const ALIGN_CENTER = `${ESC}a\x01`;
const BOLD_ON = `${ESC}E\x01`;
const BOLD_OFF = `${ESC}E\x00`;
const CUT = `${GS}V\x00`;

export const THERMAL_TEXT_WIDTH = 32;

function truncateWithSuffix(value: string, width: number, suffix = "...") {
  if (value.length <= width) return value;
  if (width <= suffix.length) return value.slice(0, width);
  return `${value.slice(0, width - suffix.length)}${suffix}`;
}

// Keep thermal-printer text predictable and avoid unsupported punctuation bytes.
export function sanitizeThermalText(value: string) {
  return value
    .normalize("NFC")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u2022/g, "-")
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
  const rightSafe = truncateWithSuffix(rightText, Math.max(1, width - 2));
  const maxLeftWidth = Math.max(1, width - rightSafe.length - 1);
  const leftSafe = truncateWithSuffix(leftText, maxLeftWidth);
  const spaces = Math.max(1, width - leftSafe.length - rightSafe.length);
  return `${leftSafe}${" ".repeat(spaces)}${rightSafe}`;
}

export function wrapText(text: string, width = THERMAL_TEXT_WIDTH, indent = "") {
  const normalized = sanitizeThermalText(text);
  if (!normalized) return [];

  const safeWidth = Math.max(1, width);
  const safeIndent = indent.slice(0, Math.max(0, safeWidth - 1));
  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (!current) return;
    lines.push(lines.length > 0 ? `${safeIndent}${current}` : current);
    current = "";
  };

  for (const word of words) {
    const limit = Math.max(1, lines.length > 0 ? safeWidth - safeIndent.length : safeWidth);

    if (word.length > limit) {
      pushCurrent();
      let remaining = word;

      while (remaining) {
        const chunkLimit = Math.max(1, lines.length > 0 ? safeWidth - safeIndent.length : safeWidth);
        const chunk = remaining.slice(0, chunkLimit);
        remaining = remaining.slice(chunkLimit);

        if (remaining) {
          lines.push(lines.length > 0 ? `${safeIndent}${chunk}` : chunk);
          continue;
        }

        current = chunk;
      }
      continue;
    }

    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length <= limit) {
      current = candidate;
      continue;
    }

    pushCurrent();
    current = word;
  }

  pushCurrent();

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
