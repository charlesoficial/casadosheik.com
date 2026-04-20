import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// ─── DSBadge ───────────────────────────────────────────────────────────────────
// Badge do Design System. Todos os estilos vêm de tokens.
//
// Variantes de status:
//   new      → Pedido recém chegado (roxo/purple)
//   success  → Concluído, pago, aprovado (verde)
//   warning  → Aguardando, em preparo (dourado)
//   info     → Informativo, aceito (azul)
//   danger   → Erro, cancelado (vermelho)
//
// Variantes de UI:
//   default    → Brand primary (dourado sutil)
//   secondary  → Neutro, metadata
//   admin      → Dark chip no admin
//   overlay    → Sobre fundos escuros/gradient (bg translúcido branco)
// ──────────────────────────────────────────────────────────────────────────────

const dsBadgeVariants = cva(
  [
    "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
    "transition-colors duration-[180ms] ease-[ease]",
  ],
  {
    variants: {
      variant: {
        // ── Status ─────────────────────────────────────────────────────────
        new: [
          "border-status-new-border bg-status-new-bg text-status-new-fg",
        ],
        success: [
          "border-status-success-border bg-status-success-bg text-status-success-fg",
        ],
        warning: [
          "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
        ],
        info: [
          "border-status-info-border bg-status-info-bg text-status-info-fg",
        ],
        danger: [
          "border-status-danger-border bg-status-danger-bg text-status-danger-fg",
        ],

        // ── UI ─────────────────────────────────────────────────────────────
        default: [
          "border-transparent",
          "bg-brand-gold/10 text-brand-gold",
        ],
        secondary: [
          "border-admin-border bg-admin-surface text-admin-fg-muted",
        ],
        admin: [
          "border-admin-border bg-admin-elevated text-admin-fg",
        ],
        // Para uso sobre fundos escuros/gradient (ex: hero card, sidebar ativa)
        overlay: [
          "border-white/10 bg-white/10 text-white",
        ],
        // Área pública (tema claro)
        "public-default": [
          "border-transparent bg-primary/10 text-primary",
        ],
        "public-success": [
          "border-transparent bg-status-success-text/20 text-status-success-border",
        ],
        "public-info": [
          "border-transparent bg-status-info-text/20 text-status-info-border",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface DSBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof dsBadgeVariants> {}

export function DSBadge({ className, variant, ...props }: DSBadgeProps) {
  return (
    <div
      data-ds-badge={variant ?? "default"}
      className={cn(dsBadgeVariants({ variant }), className)}
      {...props}
    />
  );
}

// ── Mapa de status de pedido → variante ────────────────────────────────────────
// Uso: <DSBadge variant={orderStatusVariant["novo"]} />

export const orderStatusVariant = {
  novo:      "new",
  aceito:    "info",
  preparo:   "warning",
  pronto:    "warning",
  concluido: "success",
  cancelado: "danger",
} as const satisfies Record<string, VariantProps<typeof dsBadgeVariants>["variant"]>;

export { dsBadgeVariants };
