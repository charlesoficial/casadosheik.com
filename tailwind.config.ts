import type { Config } from "tailwindcss";

// ─── Design Token Map ──────────────────────────────────────────────────────────
// Fonte da verdade: lib/design-tokens.json
// Regra: use sempre as classes semânticas abaixo. Nunca use cores hex hardcoded
// nos componentes. Ex: bg-admin-surface, text-brand-gold, border-admin-border.
// ──────────────────────────────────────────────────────────────────────────────

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      // ── Public theme (CSS variables do shadcn/ui) ──────────────────────────
      colors: {
        border:     "hsl(var(--border))",
        input:      "hsl(var(--input))",
        ring:       "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },

        // Menu publico / fluxo do cliente
        // Uso: bg-menu-surface-raised, text-menu-accent-strong, border-menu-border
        menu: {
          bg:                "hsl(var(--menu-bg) / <alpha-value>)",
          surface:           "hsl(var(--menu-surface) / <alpha-value>)",
          "surface-raised":  "hsl(var(--menu-surface-raised) / <alpha-value>)",
          "surface-soft":    "hsl(var(--menu-surface-soft) / <alpha-value>)",
          input:             "hsl(var(--menu-input) / <alpha-value>)",
          text:              "hsl(var(--menu-text) / <alpha-value>)",
          "text-muted":      "hsl(var(--menu-text-muted) / <alpha-value>)",
          "text-subtle":     "hsl(var(--menu-text-subtle) / <alpha-value>)",
          border:            "hsl(var(--menu-border) / <alpha-value>)",
          "border-strong":   "hsl(var(--menu-border-strong) / <alpha-value>)",
          accent:            "hsl(var(--menu-accent) / <alpha-value>)",
          "accent-strong":   "hsl(var(--menu-accent-strong) / <alpha-value>)",
          "accent-bg":       "hsl(var(--menu-accent-bg) / <alpha-value>)",
          "accent-border":   "hsl(var(--menu-accent-border) / <alpha-value>)",
          cta:               "hsl(var(--menu-cta-bg) / <alpha-value>)",
          "cta-hover":       "hsl(var(--menu-cta-hover) / <alpha-value>)",
          "cta-fg":          "hsl(var(--menu-cta-fg) / <alpha-value>)",
          "cta-soft":        "hsl(var(--menu-cta-soft) / <alpha-value>)",
          "cta-muted":       "hsl(var(--menu-cta-muted) / <alpha-value>)",
          success:           "hsl(var(--menu-success) / <alpha-value>)",
          "success-bg":      "hsl(var(--menu-success-bg) / <alpha-value>)",
          danger:            "hsl(var(--menu-danger) / <alpha-value>)",
          "danger-bg":       "hsl(var(--menu-danger-bg) / <alpha-value>)",
          overlay:           "hsl(var(--menu-overlay) / <alpha-value>)",
          "overlay-fg":      "hsl(var(--menu-overlay-fg) / <alpha-value>)",
          "overlay-border":  "hsl(var(--menu-overlay-border) / <alpha-value>)"
        },

        // ── Brand tokens ────────────────────────────────────────────────────
        // Uso: text-brand-gold, bg-brand-gold-bg, text-brand-purple-fg
        brand: {
          gold:       "#f4c35a",
          "gold-dim": "#d4a017",
          "gold-bg":  "#2a1d08",
          purple:        "#5b34ff",
          "purple-bg":   "#231534",
          "purple-fg":   "#d8c8ff"
        },

        // ── Admin tokens — dynamic via CSS variables (theme-aware) ────────────
        // Uso: bg-admin-surface, border-admin-border, text-admin-fg-muted
        // Os valores reais são definidos em globals.css por tema (black / light).
        admin: {
          base:               "var(--admin-bg)",
          shell:              "var(--admin-bg)",
          surface:            "var(--admin-surface)",
          "surface-deep":     "var(--admin-surface-deep)",
          elevated:           "var(--admin-elevated)",
          overlay:            "var(--admin-overlay)",
          "border-faint":     "var(--admin-border-faint)",
          border:             "var(--admin-border)",
          "border-strong":    "var(--admin-border-strong)",
          fg:                 "var(--admin-fg)",
          "fg-secondary":     "var(--admin-fg-secondary)",
          "fg-muted":         "var(--admin-fg-muted)",
          "fg-faint":         "var(--admin-fg-faint)",
          "primary-bg":       "var(--admin-primary-bg)",
          "primary-fg":       "var(--admin-primary-fg)",
          "secondary-bg":     "var(--admin-secondary-bg)",
          "secondary-fg":     "var(--admin-secondary-fg)",
          "secondary-border": "var(--admin-secondary-border)",
          "accent-bg":        "var(--admin-accent-bg)",
          "accent-fg":        "var(--admin-accent-fg)",
          "accent-strong":    "var(--admin-accent-strong)"
        },

        // ── Status tokens — dynamic via CSS variables (theme-aware) ────────
        // Uso: bg-status-success-bg, text-status-danger-fg, border-status-info-border
        status: {
          "success-bg":     "var(--status-success-bg)",
          "success-border": "var(--status-success-border)",
          "success-fg":     "var(--status-success-fg)",
          "success-text":   "var(--status-success-text)",

          "warning-bg":     "var(--status-warning-bg)",
          "warning-border": "var(--status-warning-border)",
          "warning-fg":     "var(--status-warning-fg)",
          "warning-text":   "var(--status-warning-text)",

          "info-bg":        "var(--status-info-bg)",
          "info-border":    "var(--status-info-border)",
          "info-fg":        "var(--status-info-fg)",
          "info-text":      "var(--status-info-text)",

          "danger-bg":      "var(--status-danger-bg)",
          "danger-border":  "var(--status-danger-border)",
          "danger-fg":      "var(--status-danger-fg)",
          "danger-text":    "var(--status-danger-text)",

          "new-bg":         "var(--status-new-bg)",
          "new-border":     "var(--status-new-border)",
          "new-fg":         "var(--status-new-fg)"
        }
      },

      // ── Border radius tokens ───────────────────────────────────────────────
      // Uso: rounded-ds-sm, rounded-ds-lg, rounded-ds-2xl
      borderRadius: {
        // Legacy shadcn/ui (mantidos para compatibilidade)
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // Design System
        "ds-xs":  "0.5rem",
        "ds-sm":  "0.75rem",
        "ds-md":  "1rem",
        "ds-lg":  "1.25rem",
        "ds-xl":  "1.5rem",
        "ds-2xl": "1.75rem"
      },

      // ── Shadow tokens ──────────────────────────────────────────────────────
      // Uso: shadow-soft, shadow-panel, shadow-card
      boxShadow: {
        soft:  "0 14px 40px -18px rgba(15, 15, 15, 0.18)",
        card:  "0 20px 60px -30px rgba(0, 0, 0, 0.55)",
        panel: "0 22px 54px rgba(0, 0, 0, 0.46)"
      },

      backgroundImage: {
        arabesque:
          "radial-gradient(circle at 15% 15%, rgba(212,160,23,0.18), transparent 24%), radial-gradient(circle at 80% 20%, rgba(212,160,23,0.14), transparent 20%), radial-gradient(circle at 50% 100%, rgba(184,134,11,0.12), transparent 32%)"
      },

      // ── Motion tokens ──────────────────────────────────────────────────────
      // Fonte da verdade: lib/motion.ts
      // Três tiers de duração: micro (100/150ms) | padrão (200ms) | ênfase (300ms)
      // Nunca use duration-[Xms] hardcoded — use as classes abaixo.

      transitionDuration: {
        // Micro-interações (press, snap, cor)
        "motion-micro":    "100ms",
        "motion-fast":     "150ms",
        // Transições padrão (hover, focus, entrada)
        "motion-default":  "200ms",
        "motion-moderate": "250ms",
        // Animações enfatizadas (modal, page entrance)
        "motion-slow":     "300ms",
        // Loops decorativos (spinner, skeleton)
        "motion-loop":     "700ms",
      },

      transitionTimingFunction: {
        // Para saídas (fade-out, close)
        "motion-in":         "cubic-bezier(0.4, 0, 1, 1)",
        // Para entradas (fade-in, open) — suave no final
        "motion-out":        "cubic-bezier(0.0, 0.0, 0.2, 1)",
        // Padrão geral
        "motion-in-out":     "cubic-bezier(0.4, 0, 0.2, 1)",
        // Ligeiro bounce para confirmações positivas
        "motion-spring":     "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },

      // ── Keyframes ─────────────────────────────────────────────────────────
      keyframes: {
        // Entrada por fade
        "motion-fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        // Saída por fade
        "motion-fade-out": {
          from: { opacity: "1" },
          to:   { opacity: "0" },
        },
        // Entrada por slide + fade (cards, seções)
        "motion-slide-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        // Entrada por zoom + fade (modais, popovers)
        "motion-zoom-in": {
          from: { opacity: "0", transform: "scale(0.97) translateY(4px)" },
          to:   { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        // Saída por zoom (modais fechando)
        "motion-zoom-out": {
          from: { opacity: "1", transform: "scale(1)" },
          to:   { opacity: "0", transform: "scale(0.97)" },
        },
        // Skeleton loading — pulso de opacidade
        "motion-skeleton": {
          "0%, 100%": { opacity: "0.35" },
          "50%":      { opacity: "0.65" },
        },
        // Shimmer de skeleton — varredura horizontal
        "motion-shimmer": {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition:  "200% 0" },
        },
        // Bounce positivo — confirmação de ação
        "motion-pop": {
          "0%":   { transform: "scale(1)" },
          "40%":  { transform: "scale(1.06)" },
          "70%":  { transform: "scale(0.97)" },
          "100%": { transform: "scale(1)" },
        },
        // Barra de progresso de toast — encolhe da direita para esquerda
        "motion-shrink-x": {
          from: { transform: "scaleX(1)" },
          to:   { transform: "scaleX(0)" },
        },
      },

      // ── Animation shorthands ───────────────────────────────────────────────
      // Uso: className="animate-motion-slide-up"
      animation: {
        "motion-fade-in":  "motion-fade-in  200ms cubic-bezier(0.0,0.0,0.2,1) both",
        "motion-fade-out": "motion-fade-out 150ms cubic-bezier(0.4,0,1,1)     both",
        "motion-slide-up": "motion-slide-up 250ms cubic-bezier(0.0,0.0,0.2,1) both",
        "motion-zoom-in":  "motion-zoom-in  300ms cubic-bezier(0.0,0.0,0.2,1) both",
        "motion-zoom-out": "motion-zoom-out 150ms cubic-bezier(0.4,0,1,1)     both",
        "motion-skeleton": "motion-skeleton 1.5s  ease-in-out                  infinite",
        "motion-shimmer":  "motion-shimmer  2s    linear                       infinite",
        "motion-pop":      "motion-pop      350ms cubic-bezier(0.34,1.56,0.64,1) both",
        // Spinner — sobrescreve o padrão do Tailwind (750ms → 700ms, mais suave)
        "motion-spin":     "spin 700ms linear infinite",
      },
    }
  },
  plugins: []
};

export default config;
