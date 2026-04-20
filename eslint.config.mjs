// eslint.config.mjs — ESLint flat config (ESLint 9+)
// Inclui plugin inline que reflete as mesmas regras do tools/lint-ds.mjs.
//
// Para instalar o ESLint:
//   npm install -D eslint
//
// Para rodar:
//   npx eslint .                     ← toda a base
//   npx eslint src/features/menu     ← pasta específica
//   npm run lint                     ← via script

import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";

// ─── Paleta bruta Tailwind ────────────────────────────────────────────────────
const RAW_PALETTE = [
  "red","orange","amber","yellow","lime","green","emerald","teal",
  "cyan","sky","blue","indigo","violet","purple","fuchsia","pink","rose",
  "slate","gray","zinc","neutral","stone","white","black",
];
const TAILWIND_SCALES = ["50","100","150","200","300","400","500","600","700","800","900","950"];
const scalePattern  = TAILWIND_SCALES.join("|");
const colorPattern  = RAW_PALETTE.join("|");
const PROPERTIES    = "text|bg|border|fill|stroke|ring|shadow|from|via|to|placeholder|accent|caret|decoration";

// ─── Plugin inline ─────────────────────────────────────────────────────────────
// Este plugin é puro JavaScript sem dependências extras.
const dsPlugin = {
  meta: { name: "design-system", version: "1.0.0" },
  rules: {

    // ── no-hardcoded-hex-class ────────────────────────────────────────────────
    "no-hardcoded-hex-class": {
      meta: {
        type: "problem",
        docs: {
          description: "Proíbe cores hex hardcoded em classes Tailwind (ex: text-[#fff])",
          recommended: true,
        },
        messages: {
          found: "Cor hardcoded '{{val}}' — use um token semântico (ex: text-admin-fg, bg-status-danger-bg)",
        },
        schema: [],
      },
      create(context) {
        const hexInClassRe = /\b(?:text|bg|border|fill|stroke|ring|shadow|outline|decoration|caret|accent|from|via|to|placeholder)-\[#[0-9a-fA-F]{3,8}\]/g;

        function checkStringValue(node, value) {
          hexInClassRe.lastIndex = 0;
          let m;
          while ((m = hexInClassRe.exec(value)) !== null) {
            context.report({
              node,
              messageId: "found",
              data: { val: m[0] },
            });
          }
        }

        return {
          Literal(node) {
            if (typeof node.value === "string") checkStringValue(node, node.value);
          },
          TemplateLiteral(node) {
            for (const q of node.quasis) {
              checkStringValue(node, q.value.raw);
            }
          },
        };
      },
    },

    // ── no-raw-palette-color ─────────────────────────────────────────────────
    "no-raw-palette-color": {
      meta: {
        type: "problem",
        docs: {
          description: "Proíbe cores da paleta Tailwind bruta (ex: text-green-500)",
          recommended: true,
        },
        messages: {
          found: "Cor bruta '{{val}}' — use tokens semânticos (ex: text-status-success-fg, text-brand-gold)",
        },
        schema: [],
      },
      create(context) {
        const re = new RegExp(
          `\\b(?:${PROPERTIES})-(?:${colorPattern})-(?:${scalePattern})\\b`,
          "g"
        );

        function checkStringValue(node, value) {
          re.lastIndex = 0;
          let m;
          while ((m = re.exec(value)) !== null) {
            context.report({ node, messageId: "found", data: { val: m[0] } });
          }
        }

        return {
          Literal(node) {
            if (typeof node.value === "string") checkStringValue(node, node.value);
          },
          TemplateLiteral(node) {
            for (const q of node.quasis) checkStringValue(node, q.value.raw);
          },
        };
      },
    },

    // ── no-arbitrary-radius ──────────────────────────────────────────────────
    "no-arbitrary-radius": {
      meta: {
        type: "suggestion",
        docs: {
          description: "Proíbe border-radius arbitrário (ex: rounded-[24px])",
          recommended: true,
        },
        messages: {
          found: "Radius arbitrário '{{val}}' — use rounded-ds-xs/sm/md/lg/xl/2xl",
        },
        schema: [],
      },
      create(context) {
        const re = /\brounded(?:-[tblrse]{1,2})?-\[\d+(?:\.\d+)?(?:px|rem|em)\]/g;

        function check(node, value) {
          re.lastIndex = 0;
          let m;
          while ((m = re.exec(value)) !== null) {
            context.report({ node, messageId: "found", data: { val: m[0] } });
          }
        }

        return {
          Literal(node) { if (typeof node.value === "string") check(node, node.value); },
          TemplateLiteral(node) { for (const q of node.quasis) check(node, q.value.raw); },
        };
      },
    },

    // ── no-arbitrary-shadow ──────────────────────────────────────────────────
    "no-arbitrary-shadow": {
      meta: {
        type: "suggestion",
        docs: {
          description: "Proíbe shadows arbitrárias (ex: shadow-[0_4px_...])",
          recommended: true,
        },
        messages: {
          found: "Shadow arbitrária '{{val}}' — use shadow-soft, shadow-card ou shadow-panel",
        },
        schema: [],
      },
      create(context) {
        const re = /\b(?:shadow|drop-shadow)-\[[^\]]+\]/g;

        function check(node, value) {
          re.lastIndex = 0;
          let m;
          while ((m = re.exec(value)) !== null) {
            context.report({ node, messageId: "found", data: { val: m[0] } });
          }
        }

        return {
          Literal(node) { if (typeof node.value === "string") check(node, node.value); },
          TemplateLiteral(node) { for (const q of node.quasis) check(node, q.value.raw); },
        };
      },
    },

    // ── no-inline-color-style ────────────────────────────────────────────────
    "no-inline-color-style": {
      meta: {
        type: "problem",
        docs: {
          description: "Proíbe cor hardcoded em style={{ color: '#...' }}",
          recommended: true,
        },
        messages: {
          found: "Propriedade de cor inline com valor literal — use var(--token) ou classe Tailwind semântica",
        },
        schema: [],
      },
      create(context) {
        const COLOR_PROPS = new Set([
          "color", "backgroundColor", "borderColor",
          "fill", "stroke", "outlineColor", "caretColor",
          "textDecorationColor",
        ]);
        const LITERAL_COLOR_RE = /^(?:#[0-9a-fA-F]{3,8}|rgb|rgba|hsl|hsla)/;

        return {
          JSXAttribute(node) {
            // style={{ ... }}
            if (node.name.name !== "style") return;
            const expr = node.value?.expression;
            if (!expr || expr.type !== "ObjectExpression") return;

            for (const prop of expr.properties) {
              if (prop.type !== "Property") continue;
              const key = prop.key.name || prop.key.value;
              if (!COLOR_PROPS.has(key)) continue;

              const val = prop.value;
              if (
                val.type === "Literal" &&
                typeof val.value === "string" &&
                LITERAL_COLOR_RE.test(val.value)
              ) {
                context.report({ node: prop, messageId: "found" });
              }
            }
          },
        };
      },
    },
  },
};

// ─── Configuração base ─────────────────────────────────────────────────────────
/** @type {import("eslint").Linter.Config[]} */
export default [
  // Ignora completamente estes caminhos
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "dist/**",
      "build/**",
      "out/**",
      "tools/**",
      "Sistema-Restaurante-2/**",
      "tailwind.config.*",
      "postcss.config.*",
      "next.config.*",
      "app/globals.css",
      "*.min.js",
      "public/**",
    ],
  },

  // Recomendações JS base
  js.configs.recommended,

  // ── Regras do Design System ──────────────────────────────────────────────────
  {
    plugins: { ds: dsPlugin },
    files: ["**/*.tsx", "**/*.ts", "**/*.jsx", "**/*.js"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },

    // Arquivos de config que podem ter hex
    ignores: [
      "lib/design-tokens.json",
      "eslint.config.mjs",
    ],

    rules: {
      // Design System — erros que bloqueiam CI
      "ds/no-hardcoded-hex-class": "error",
      "ds/no-raw-palette-color":   "error",
      "ds/no-inline-color-style":  "error",

      // Design System — avisos (não bloqueiam CI, mas aparecem no IDE)
      "ds/no-arbitrary-radius":    "warn",
      "ds/no-arbitrary-shadow":    "warn",

      // Desliga regras JS base ruidosas que não se aplicam a TypeScript
      "no-undef": "off",     // TypeScript cuida disso
      "no-unused-vars": "off", // TypeScript cuida disso
    },
  },
];
