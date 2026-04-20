#!/usr/bin/env node
/**
 * lint-ds.mjs — Design System Linter
 *
 * Detecta violações de consistência visual no projeto:
 *   1. Cores hex hardcoded em classes Tailwind:  text-[#fff], bg-[#1a1a1a]
 *   2. Cores da paleta Tailwind bruta:           text-green-500, bg-emerald-700
 *   3. border-radius arbitrário:                 rounded-[24px]  → use rounded-ds-*
 *   4. shadow arbitrária:                        shadow-[0_4px_...] → use shadow-soft/card/panel
 *   5. style={{ color: '#...' }} inline          → use var() CSS token
 *
 * Uso:
 *   node tools/lint-ds.mjs            — escaneia todo o projeto
 *   node tools/lint-ds.mjs --fix      — lista violações com sugestões
 *   node tools/lint-ds.mjs src/foo    — escaneia pasta específica
 *
 * Saída:
 *   Violations com arquivo:linha e a string que violou.
 *   Exit code 1 se houver qualquer violação.
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname, relative } from "path";
import { fileURLToPath } from "url";

// ─── Config ───────────────────────────────────────────────────────────────────

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** Extensões de arquivo analisadas */
const SCAN_EXTS = new Set([".tsx", ".ts", ".jsx", ".js", ".css"]);

/** Diretórios completamente ignorados */
const IGNORE_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "out",
  "tools",          // este próprio script
  "Sistema-Restaurante-2", // backup antigo
]);

/** Arquivos de configuração ignorados (podem ter hex por necessidade) */
const IGNORE_FILES = new Set([
  "tailwind.config.ts",
  "tailwind.config.js",
  "postcss.config.js",
  "next.config.js",
  "next.config.ts",
  "next.config.mjs",
  "eslint.config.mjs",
  "globals.css",    // tokens CSS — pode ter hex em custom properties
]);

// ─── Paleta bruta Tailwind — proibida em componentes ─────────────────────────
// Exceções: 'slate', 'gray', 'zinc', 'neutral', 'stone' (tons neutros usados
// em alguns sistemas) — mas aqui são TODOS proibidos para forçar uso de tokens.
const RAW_PALETTE_COLORS = [
  "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal",
  "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose",
  "slate", "gray", "zinc", "neutral", "stone",
  "white", "black",
];

// Escala Tailwind completa
const TAILWIND_SCALES = [
  "50", "100", "150", "200", "300", "400", "500", "600", "700", "800", "900", "950",
];

// ─── Regras ───────────────────────────────────────────────────────────────────

/**
 * @typedef {{ id: string, description: string, fix: string }} RuleMeta
 * @typedef {{ rule: string, match: string, line: number, col: number }} Violation
 */

const rules = [
  // ── 1. Hex arbitrário em classe Tailwind ────────────────────────────────────
  {
    id: "no-hardcoded-hex-class",
    description: "Cor hex hardcoded em classe Tailwind",
    fix: "Use tokens de design: text-admin-fg, bg-admin-surface, border-admin-border, etc.",
    // Captura: text-[#abc], bg-[#abc123], border-[#ABC123FF], etc.
    pattern: /\b(?:text|bg|border|fill|stroke|ring|shadow|outline|decoration|caret|accent|from|via|to|placeholder)-\[#[0-9a-fA-F]{3,8}\]/g,
  },

  // ── 2. Paleta bruta Tailwind ────────────────────────────────────────────────
  {
    id: "no-raw-palette-color",
    description: "Cor da paleta Tailwind bruta (sem token semântico)",
    fix: "Use tokens semânticos: status-success-fg, brand-gold, admin-fg-muted, etc.",
    // Gerado dinamicamente abaixo
    pattern: null,
  },

  // ── 3. Border-radius arbitrário ─────────────────────────────────────────────
  {
    id: "no-arbitrary-radius",
    description: "Border-radius arbitrário (valor px fora dos tokens)",
    fix: "Use tokens: rounded-ds-xs, rounded-ds-sm, rounded-ds-md, rounded-ds-lg, rounded-ds-xl, rounded-ds-2xl",
    // Captura: rounded-[12px], rounded-[24px], rounded-t-[16px], etc.
    pattern: /\brounded(?:-[tblrse]{1,2})?-\[\d+(?:\.\d+)?(?:px|rem|em)\]/g,
  },

  // ── 4. Shadow arbitrária ─────────────────────────────────────────────────────
  {
    id: "no-arbitrary-shadow",
    description: "Box-shadow arbitrária (valor fora dos tokens)",
    fix: "Use tokens: shadow-soft, shadow-card, shadow-panel",
    // Captura: shadow-[0_4px_...], drop-shadow-[...]
    pattern: /\b(?:shadow|drop-shadow)-\[[^\]]+\]/g,
  },

  // ── 5. Inline style com cor ──────────────────────────────────────────────────
  {
    id: "no-inline-color-style",
    description: "Propriedade de cor em style={{ }} inline",
    fix: "Use var(--token) no style ou uma classe Tailwind com token semântico",
    // Captura: style={{ color: '#...', backgroundColor: 'rgb(...)', etc. }}
    pattern: /style=\{[^}]*(?:color|background(?:Color)?|borderColor|fill|stroke)\s*:\s*['"`](?:#|rgb|rgba|hsl|hsla)/g,
  },

  // ── 6. Padding/margin arbitrário ────────────────────────────────────────────
  // (apenas valores px que sugerem escala fora do sistema — não bloqueia p-4 etc.)
  {
    id: "no-arbitrary-spacing",
    description: "Espaçamento arbitrário em px (fora da escala Tailwind padrão)",
    fix: "Use escala Tailwind (p-4, m-6, gap-3) ou tokens de layout do AdminSection/AdminStack",
    // Captura: p-[13px], mt-[7px], gap-[23px] — valores que sugerem one-off
    pattern: /\b(?:p|m|px|py|pl|pr|pt|pb|mx|my|ml|mr|mt|mb|gap|space-x|space-y)-\[\d+px\]/g,
  },
];

// Gera o pattern da regra de paleta bruta dinamicamente
{
  const colorAlts = RAW_PALETTE_COLORS.join("|");
  const scaleAlts = TAILWIND_SCALES.join("|");
  // Captura: text-green-500, bg-emerald-700, border-red-100, etc.
  // Não captura: text-green (sem escala) para evitar false-positives com nomes custom
  rules[1].pattern = new RegExp(
    `\\b(?:text|bg|border|fill|stroke|ring|shadow|from|via|to|placeholder|accent|caret|decoration)-(?:${colorAlts})-(?:${scaleAlts})\\b`,
    "g"
  );
}

// ─── Scanner ──────────────────────────────────────────────────────────────────

function collectFiles(dir, files = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry)) continue;
    const fullPath = join(dir, entry);
    let stat;
    try { stat = statSync(fullPath); } catch { continue; }

    if (stat.isDirectory()) {
      collectFiles(fullPath, files);
    } else if (
      SCAN_EXTS.has(extname(entry)) &&
      !IGNORE_FILES.has(entry)
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

function scanFile(filePath) {
  const content = readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const violations = [];

  for (const rule of rules) {
    if (!rule.pattern) continue;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Ignora comentários de linha
      const trimmed = line.trimStart();
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
        continue;
      }

      // Ignora anotações de lint-disable
      if (line.includes("lint-ds-disable") || line.includes("eslint-disable")) {
        continue;
      }

      // Reset lastIndex para global regex
      rule.pattern.lastIndex = 0;
      let match;
      while ((match = rule.pattern.exec(line)) !== null) {
        violations.push({
          rule: rule.id,
          description: rule.description,
          fix: rule.fix,
          match: match[0],
          line: i + 1,
          col: match.index + 1,
        });
      }
    }
  }

  return violations;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function formatViolation(v, filePath, relPath) {
  return `  ${relPath}:${v.line}:${v.col}  [${v.rule}]  ${v.match}`;
}

function main() {
  const args = process.argv.slice(2);
  const showFix = args.includes("--fix") || args.includes("--verbose");
  const targetArg = args.find((a) => !a.startsWith("--"));
  const targetDir = targetArg ? join(ROOT, targetArg) : ROOT;

  console.log(`\n🔍 Design System Linter\n`);
  console.log(`   Raiz:    ${ROOT}`);
  console.log(`   Escopo:  ${relative(ROOT, targetDir) || "."}\n`);

  const files = collectFiles(targetDir);
  console.log(`   Arquivos: ${files.length}\n`);

  const byRule = {};
  for (const rule of rules) {
    byRule[rule.id] = { meta: rule, violations: [] };
  }

  let totalViolations = 0;
  let filesWithViolations = 0;

  for (const filePath of files) {
    const violations = scanFile(filePath);
    if (violations.length === 0) continue;

    filesWithViolations++;
    totalViolations += violations.length;

    const relPath = relative(ROOT, filePath).replace(/\\/g, "/");

    for (const v of violations) {
      byRule[v.rule].violations.push({ ...v, filePath, relPath });
    }
  }

  // ── Relatório por regra ──────────────────────────────────────────────────────
  let hasViolations = false;
  for (const { meta, violations } of Object.values(byRule)) {
    if (violations.length === 0) continue;
    hasViolations = true;

    const icon = "✗";
    console.log(`${icon}  ${meta.description}  (${violations.length} ocorrências)`);
    if (showFix) {
      console.log(`   💡 ${meta.fix}`);
    }

    // Agrupa por arquivo
    const byFile = {};
    for (const v of violations) {
      if (!byFile[v.relPath]) byFile[v.relPath] = [];
      byFile[v.relPath].push(v);
    }

    for (const [relPath, fileViolations] of Object.entries(byFile)) {
      for (const v of fileViolations) {
        console.log(formatViolation(v, v.filePath, relPath));
      }
    }
    console.log();
  }

  // ── Resumo ────────────────────────────────────────────────────────────────────
  if (!hasViolations) {
    console.log(`✅  Nenhuma violação encontrada. Design system consistente!\n`);
    process.exit(0);
  }

  console.log(`─────────────────────────────────────────────────────────────────`);
  console.log(`  ${totalViolations} violações em ${filesWithViolations} arquivo(s)`);
  if (!showFix) {
    console.log(`  Rode com --fix para ver sugestões de correção\n`);
  } else {
    console.log();
  }

  process.exit(1);
}

main();
