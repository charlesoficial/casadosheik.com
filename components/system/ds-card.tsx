import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// ─── DSCard ────────────────────────────────────────────────────────────────────
// Componente base de card do Design System.
// Todos os estilos vêm de tokens — nunca use hex hardcoded ao usar este componente.
//
// Variantes:
//   admin-panel  → card elevado no admin (bg-admin-elevated + border-admin-border)
//   admin-deep   → bloco profundo dentro de um painel (bg-admin-surface)
//   admin-hero   → card com gradiente azul de destaque
//   admin-success → card de ação de sucesso (verde)
//   admin-warning → card de ação de aviso (dourado)
//   admin-info   → card informativo (azul claro)
//   public       → card claro para área pública do cardápio
//
// Motion:
//   interactive  → ativa .motion-lift (hover lift + shadow)
//   entering     → ativa animate-motion-slide-up (entrance animation)
// ──────────────────────────────────────────────────────────────────────────────

const dsCardVariants = cva(
  // Base — transição de cores pelo motion system (200ms inOut)
  "transition-[background-color,border-color,color] duration-motion-default ease-motion-in-out",
  {
    variants: {
      variant: {
        // Admin — painel principal elevado
        "admin-panel": [
          "rounded-ds-xl border",
          "bg-admin-elevated border-admin-border",
        ],
        // Admin — bloco interno profundo (dentro de admin-panel)
        "admin-deep": [
          "rounded-ds-xl border",
          "bg-admin-surface border-admin-border",
        ],
        // Admin — hero card com gradiente azul
        "admin-hero": [
          "rounded-ds-2xl",
          "bg-[var(--admin-hero-bg)]",
          "text-admin-fg",
        ],
        // Admin — bloco de ação de sucesso (ir para caixa, etc.)
        "admin-success": [
          "rounded-ds-lg border",
          "bg-status-success-bg border-status-success-border text-status-success-text",
          "hover:bg-status-success-bg hover:border-status-success-border",
        ],
        // Admin — bloco de ação de aviso (operação, pedidos)
        "admin-warning": [
          "rounded-ds-lg border",
          "bg-status-warning-bg border-status-warning-border text-status-warning-text",
          "hover:bg-status-warning-bg hover:border-status-warning-border",
        ],
        // Admin — bloco informativo
        "admin-info": [
          "rounded-ds-lg border",
          "bg-status-info-bg border-status-info-border text-status-info-text",
        ],
        // Admin — bloco de erro/perigo
        "admin-danger": [
          "rounded-ds-lg border",
          "bg-status-danger-bg border-status-danger-border text-status-danger-text",
        ],
        // Área pública — card claro
        public: [
          "rounded-ds-xl border shadow-soft",
          "bg-card text-card-foreground border-border",
        ],
      },

      padding: {
        none: "",
        sm:   "p-4",
        md:   "p-5",
        lg:   "p-6",
      },
    },
    defaultVariants: {
      variant: "admin-panel",
      padding: "none",
    },
  }
);

export interface DSCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof dsCardVariants> {
  /**
   * Ativa o hover lift do motion system (.motion-lift).
   * Use em cards que são clicáveis ou interativos.
   */
  interactive?: boolean;
  /**
   * Ativa animação de entrada (animate-motion-slide-up).
   * Use ao montar cards numa lista ou grid.
   */
  entering?: boolean;
}

const DSCard = React.forwardRef<HTMLDivElement, DSCardProps>(
  ({ className, variant, padding, interactive, entering, ...props }, ref) => (
    <div
      ref={ref}
      data-ds-card={variant ?? "admin-panel"}
      className={cn(
        dsCardVariants({ variant, padding }),
        interactive && "motion-lift cursor-pointer",
        entering    && "animate-motion-slide-up",
        className
      )}
      {...props}
    />
  )
);
DSCard.displayName = "DSCard";

// ── Sub-componentes ────────────────────────────────────────────────────────────

const DSCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
DSCardHeader.displayName = "DSCardHeader";

const DSCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-xl font-semibold tracking-tight text-admin-fg", className)}
    {...props}
  />
));
DSCardTitle.displayName = "DSCardTitle";

const DSCardSubtitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-admin-fg-muted", className)}
    {...props}
  />
));
DSCardSubtitle.displayName = "DSCardSubtitle";

const DSCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
DSCardContent.displayName = "DSCardContent";

export {
  DSCard,
  DSCardContent,
  DSCardHeader,
  DSCardTitle,
  DSCardSubtitle,
  dsCardVariants,
};
